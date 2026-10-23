from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey, Text, Boolean
from .db import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    phone = Column(String, unique=True, nullable=False, index=True)  # Primary identifier
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=True)               # Optional
    role = Column(String, nullable=False, default="client")          # client | worker | admin
    preferred_language = Column(String, nullable=False, default="ar")
    created_at = Column(DateTime, default=datetime.utcnow)

class OTP(Base):
    __tablename__ = "otps"
    id = Column(Integer, primary_key=True)
    phone = Column(String, nullable=False, index=True)
    code = Column(String, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False)

class ServiceRequest(Base):
    __tablename__ = "service_requests"
    id = Column(Integer, primary_key=True)
    client_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    original_text = Column(Text, nullable=False)
    original_language = Column(String, nullable=False)
    normalized_text = Column(Text, nullable=True)
    category = Column(String, nullable=True)
    confidence = Column(Float, nullable=True)
    status = Column(String, nullable=False, default="submitted")
    is_emergency = Column(Boolean, default=False)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    address_text = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class AuditLog(Base):
    __tablename__ = "audit_log"
    id = Column(Integer, primary_key=True)
    request_id = Column(Integer, ForeignKey("service_requests.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    event_type = Column(String, nullable=False)
    payload = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
class Offer(Base):
    __tablename__ = "offers"
    id = Column(Integer, primary_key=True)
    request_id = Column(Integer, ForeignKey("service_requests.id"), nullable=False)
    worker_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    price = Column(Float, nullable=False)
    message = Column(Text, nullable=True)
    status = Column(String, default="pending") # pending | accepted | rejected
    created_at = Column(DateTime, default=datetime.utcnow)
class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True)
    request_id = Column(Integer, ForeignKey("service_requests.id"), nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    sender_name = Column(String)
    role = Column(String) # client | worker
    message_type = Column(String, default="text") # text | image | video | location
    content = Column(Text, nullable=True) # Text OR Google Maps URL
    media_url = Column(String, nullable=True) # URL for image/video
    created_at = Column(DateTime, default=datetime.utcnow)