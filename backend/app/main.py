import os
import shutil
from fastapi import FastAPI, Depends, HTTPException, File, UploadFile
from fastapi.staticfiles import StaticFiles
import json
from datetime import datetime
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .config import DEV_MODE
from .db import Base, engine, get_db
from .models import User, ServiceRequest, AuditLog, OTP, Offer
from .schemas import (
    OTPRequest, OTPVerify, TokenResponse, 
    RequestIn, RequestOut, 
    OfferIn, OfferOut, OpenRequestOut
)
from .models import User, ServiceRequest, AuditLog, OTP, Offer, Message
from .schemas import (
    OTPRequest, OTPVerify, TokenResponse, 
    RequestIn, RequestOut, 
    OfferIn, OfferOut, OpenRequestOut,
    MessageIn, MessageOut
)
from .auth import issue_otp, create_access_token, current_user
from .lang import detect_language, is_emergency
from .classifier import classify

# 1. Create database tables
Base.metadata.create_all(bind=engine)

# 2. Initialize the app
app = FastAPI(title="Maintenance Agent API", version="1.0")
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# 3. Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- AUTHENTICATION ROUTES ---

@app.post("/api/v1/auth/request-otp")
def request_otp(body: OTPRequest, db: Session = Depends(get_db)):
    code = issue_otp(db, body.phone)
    
    # Terminal print (simulating SMS)
    print(f"\n--- 📱 SMS to {body.phone} ---")
    print(f"Your verification code is: {code}")
    print("---------------------------\n")

    response = {"status": "sent"}
    if DEV_MODE:
        response["dev_code"] = code
    return response

@app.post("/api/v1/auth/verify-otp", response_model=TokenResponse)
def verify_otp(body: OTPVerify, db: Session = Depends(get_db)):
    otp = (
        db.query(OTP)
        .filter(OTP.phone == body.phone, OTP.code == body.code, OTP.used == False)
        .order_by(OTP.id.desc())
        .first()
    )
    if not otp:
        raise HTTPException(400, "invalid code")
    if otp.expires_at < datetime.utcnow():
        raise HTTPException(400, "code expired")
        
    otp.used = True
    db.commit()

    user = db.query(User).filter(User.phone == body.phone).first()
    if not user:
        user = User(
            phone=body.phone,
            name=body.name,
            email=body.email,
            role=body.role or "client",
            preferred_language=body.preferred_language or "ar",
        )
        db.add(user)
    else:
        # If user already exists, update their role/name to match what they selected on login
        user.role = body.role or user.role
        user.name = body.name
        if body.email:
            user.email = body.email
        
    db.commit()

    return TokenResponse(access_token=create_access_token(user.id))

# --- REQUEST ROUTES ---

@app.post("/api/v1/requests", response_model=RequestOut)
def create_request(
    body: RequestIn,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    if user.role != "client":
        raise HTTPException(403, "only clients can submit requests")

    text = body.text.strip()
    if not text:
        raise HTTPException(400, "empty request")

    lang = detect_language(text)
    emergency = is_emergency(text)
    category, confidence = classify(text) if not emergency else ("emergency", 1.0)

    req = ServiceRequest(
        client_id=user.id,
        original_text=text,
        original_language=lang,
        normalized_text=text, 
        category=category,
        confidence=confidence,
        is_emergency=emergency,
        lat=body.lat,
        lng=body.lng,
        address_text=body.address_text,
        status="emergency" if emergency else "submitted",
    )
    db.add(req)
    db.flush()

    db.add(AuditLog(
        request_id=req.id,
        user_id=user.id,
        event_type="request_received",
        payload=json.dumps({
            "language": lang,
            "is_emergency": emergency,
            "category": category,
            "confidence": confidence,
        }, ensure_ascii=False),
    ))
    db.commit()
    db.refresh(req)

    return RequestOut(
        id=req.id,
        category=req.category,
        confidence=req.confidence,
        language=req.original_language,
        is_emergency=req.is_emergency,
        status=req.status,
    )

@app.get("/api/v1/requests/me", response_model=list[RequestOut])
def list_my_requests(
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(ServiceRequest)
        .filter(ServiceRequest.client_id == user.id)
        .order_by(ServiceRequest.id.desc())
        .limit(50)
        .all()
    )
    return [
        RequestOut(
            id=r.id,
            category=r.category,
            confidence=r.confidence,
            language=r.original_language,
            is_emergency=r.is_emergency,
            status=r.status,
        )
        for r in rows
    ]
# --- MARKETPLACE ROUTES ---

@app.get("/api/v1/requests/open", response_model=list[OpenRequestOut])
def get_open_requests(user: User = Depends(current_user), db: Session = Depends(get_db)):
    if user.role != "worker":
        raise HTTPException(403, "Only workers can see open requests")
    
    # Get requests that are submitted and don't have an accepted offer yet
    rows = db.query(ServiceRequest).filter(
        ServiceRequest.status == "submitted"
    ).order_by(ServiceRequest.id.desc()).limit(20).all()
    
    return [
        OpenRequestOut(
            id=r.id, 
            text=r.original_text, 
            category=r.category, 
            address=r.address_text or "القاهرة"
        ) for r in rows
    ]

@app.post("/api/v1/offers", response_model=OfferOut)
def create_offer(body: OfferIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if user.role != "worker":
        raise HTTPException(403, "Only workers can submit offers")
        
    req = db.query(ServiceRequest).filter(ServiceRequest.id == body.request_id).first()
    if not req:
        raise HTTPException(404, "Request not found")

    offer = Offer(
        request_id=body.request_id,
        worker_id=user.id,
        price=body.price,
        message=body.message,
        status="question" if body.is_question else "pending" # New status!
    )
    db.add(offer)
    db.commit()
    db.refresh(offer)

    return OfferOut(
        id=offer.id, request_id=offer.request_id, worker_name=user.name,
        price=offer.price, message=offer.message, status=offer.status
    )

@app.put("/api/v1/offers/{offer_id}/accept")
def accept_offer(offer_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if user.role != "client":
        raise HTTPException(403, "Only clients can accept offers")

    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(404, "Offer not found")

    req = db.query(ServiceRequest).filter(ServiceRequest.id == offer.request_id).first()
    if req.client_id != user.id:
        raise HTTPException(403, "Not your request")

    # Accept this offer, reject all others for this request
    offer.status = "accepted"
    req.status = "accepted"
    db.query(Offer).filter(Offer.request_id == req.id, Offer.id != offer.id).update({"status": "rejected"})
    
    db.commit()
    return {"status": "success"}


@app.get("/api/v1/offers/{request_id}", response_model=list[OfferOut])
def get_offers_for_request(request_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if user.role != "client":
        raise HTTPException(403, "Only clients can view offers for their requests")
        
    # Join Offer and User to get the worker's name
    results = db.query(Offer, User).join(User, Offer.worker_id == User.id).filter(
        Offer.request_id == request_id
    ).all()

    return [
        OfferOut(
            id=offer.id,
            request_id=offer.request_id,
            worker_name=worker.name,
            price=offer.price,
            message=offer.message,
            status=offer.status
        ) for offer, worker in results
    ]
@app.post("/api/v1/messages", response_model=MessageOut)
def send_message(body: MessageIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    msg = Message(
        request_id=body.request_id,
        sender_id=user.id,
        sender_name=user.name,
        role=user.role,
        message_type=body.message_type,
        content=body.content,
        media_url=body.media_url
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg
@app.post("/api/v1/upload")
def upload_file(file: UploadFile = File(...)):
    file_path = f"uploads/{file.filename}"
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return {"url": f"http://localhost:8000/uploads/{file.filename}"}

@app.get("/api/v1/messages/{request_id}", response_model=list[MessageOut])
def get_messages(request_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    return db.query(Message).filter(Message.request_id == request_id).order_by(Message.id.asc()).all()

@app.get("/api/v1/worker/jobs")
def get_worker_jobs(user: User = Depends(current_user), db: Session = Depends(get_db)):
    if user.role != "worker":
        raise HTTPException(403, "Only workers can view jobs")
    offers = db.query(Offer).filter(Offer.worker_id == user.id).all()
    req_ids = list(set([o.request_id for o in offers]))
    jobs = db.query(ServiceRequest).filter(ServiceRequest.id.in_(req_ids)).all()
    return [{"id": j.id, "text": j.original_text, "category": j.category, "status": j.status} for j in jobs]

from pydantic import BaseModel

class CompletionPayload(BaseModel):
    evidence_url: str

@app.put("/api/v1/jobs/{request_id}/worker-complete")
def worker_complete(request_id: int, payload: CompletionPayload, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if user.role != "worker":
        raise HTTPException(403, "Only workers can complete jobs")
        
    req = db.query(ServiceRequest).filter(ServiceRequest.id == request_id).first()
    if not req or req.status != "accepted":
        raise HTTPException(400, "Job not found or not in accepted state")

    # Add evidence to chat
    msg = Message(
        request_id=request_id, sender_id=user.id, sender_name=user.name,
        role=user.role, message_type="image", content="Job Completion Evidence", 
        media_url=payload.evidence_url
    )
    db.add(msg)
    
    req.status = "worker_completed"
    db.commit()
    return {"status": "success"}

@app.put("/api/v1/jobs/{request_id}/client-complete")
def client_complete(request_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if user.role != "client":
        raise HTTPException(403, "Only clients can confirm completion")
        
    req = db.query(ServiceRequest).filter(ServiceRequest.id == request_id).first()
    if not req or req.client_id != user.id: # assuming owner_id is the client_id
        raise HTTPException(404, "Request not found")
        
    if req.status != "worker_completed":
        raise HTTPException(400, "Worker has not marked this as complete yet")

    req.status = "client_completed"
    db.commit()
    return {"status": "success"}
@app.get("/api/v1/health")
def health():
    return {"status": "ok"}