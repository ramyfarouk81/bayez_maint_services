import secrets
from datetime import datetime, timedelta
from jose import jwt, JWTError
from fastapi import Depends, HTTPException, Header
from sqlalchemy.orm import Session
from .config import SECRET_KEY, ACCESS_TOKEN_TTL_MIN
from .db import get_db
from .models import User, OTP

ALGO = "HS256"

def create_access_token(user_id: int) -> str:
    payload = {
        "sub": str(user_id),
        "exp": datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_TTL_MIN),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGO)

def decode_token(token: str) -> int:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGO])
        return int(payload["sub"])
    except (JWTError, KeyError, ValueError):
        raise HTTPException(401, "invalid token")

def current_user(
    authorization: str = Header(...),
    db: Session = Depends(get_db),
) -> User:
    if not authorization.startswith("Bearer "):
        raise HTTPException(401, "expected bearer token")
    user_id = decode_token(authorization.removeprefix("Bearer ").strip())
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(401, "user not found")
    return user

def issue_otp(db: Session, phone: str) -> str:
    code = f"{secrets.randbelow(1_000_000):06d}"
    db.add(OTP(
        phone=phone,
        code=code,
        expires_at=datetime.utcnow() + timedelta(minutes=10),
    ))
    db.commit()
    return code