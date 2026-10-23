from pydantic import BaseModel, EmailStr
from typing import Optional

class OTPRequest(BaseModel):
    phone: str
    name: str
    email: Optional[EmailStr] = None

class OTPVerify(BaseModel):
    phone: str
    code: str
    name: str
    email: Optional[EmailStr] = None
    preferred_language: Optional[str] = "ar"
    role: Optional[str] = "client"

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class RequestIn(BaseModel):
    text: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    address_text: Optional[str] = None

class RequestOut(BaseModel):
    id: int
    category: Optional[str]
    confidence: Optional[float]
    language: str
    is_emergency: bool
    status: str

    class Config:
        from_attributes = True
class OfferIn(BaseModel):
    request_id: int
    price: float = 0
    message: Optional[str] = None
    is_question: bool = False

class OfferOut(BaseModel):
    id: int
    request_id: int
    worker_name: str
    price: float
    message: Optional[str]
    status: str
    
    class Config:
        from_attributes = True

class OpenRequestOut(BaseModel):
    id: int
    text: str
    category: str
    address: Optional[str]
    
    class Config:
        from_attributes = True
class MessageIn(BaseModel):
    request_id: int
    message_type: str = "text"
    content: Optional[str] = None
    media_url: Optional[str] = None

class MessageOut(BaseModel):
    id: int
    sender_name: str
    role: str
    message_type: str
    content: Optional[str]
    media_url: Optional[str]