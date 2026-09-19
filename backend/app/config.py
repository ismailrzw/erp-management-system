import os

from dotenv import load_dotenv

load_dotenv()


class Config:
    MONGO_URI = os.getenv("MONGO_URI")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
    JWT_ACCESS_TOKEN_EXPIRES = 60 * 60 * 8   # 8 hours
    MAX_CONTENT_LENGTH = int(os.getenv("MAX_CONTENT_LENGTH", str(10 * 1024 * 1024)))

    # ── Email Infrastructure ─────────────────────────────
    MAIL_PROVIDER = os.getenv("MAIL_PROVIDER", "smtp").lower()
    SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY", "")
    SMTP_HOST = os.getenv("SMTP_HOST", "smtp.example.com")
    SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER = os.getenv("SMTP_USER", "noreply@bnu.edu.pk")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
    MAIL_FROM_NAME = os.getenv("MAIL_FROM_NAME", "PBL Portal - BNU")
    MAIL_FROM_ADDRESS = os.getenv("MAIL_FROM_ADDRESS", "noreply@bnu.edu.pk")
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")

    # ── Group Naming ─────────────────────────────────────
    GROUP_NAME_FORMAT = os.getenv("GROUP_NAME_FORMAT", "GRP-{YEAR}-{SEQ:03d}")
