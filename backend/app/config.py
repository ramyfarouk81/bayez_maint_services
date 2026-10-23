import os
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "dev-only-change-me")
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./app.db")
DEV_MODE = os.getenv("DEV_MODE", "true").lower() == "true"
CLASSIFIER_BACKEND = os.getenv("CLASSIFIER_BACKEND", "keyword")  # or "faisal"
ACCESS_TOKEN_TTL_MIN = 60 * 24          # 1 day
REFRESH_TOKEN_TTL_DAYS = 30
OTP_TTL_MIN = 10