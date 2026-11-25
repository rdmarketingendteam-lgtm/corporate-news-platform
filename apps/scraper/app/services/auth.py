import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict
from app.database import db

admin_users = db["admin_users"]
admin_tokens = db["admin_tokens"]

def hash_password(password: str, salt: bytes = None) -> tuple[str, str]:
    if not salt:
        salt = os.urandom(16)
    hashed = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100_000)
    return hashed.hex(), salt.hex()

def verify_password(password: str, hashed_hex: str, salt_hex: str) -> bool:
    try:
        salt = bytes.fromhex(salt_hex)
        expected = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100_000).hex()
        return secrets.compare_digest(hashed_hex, expected)
    except Exception:
        return False

def seed_default_admin_users():
    initial_pwd = os.getenv("INITIAL_ADMIN_PASSWORD")
    if not initial_pwd:
        return

    default_accounts = [
        {"username": "superadmin", "email": "superadmin@newspaper.com", "role": "superadmin", "display_name": "Chief Executive (Super Admin)"},
        {"username": "admin", "email": "admin@newspaper.com", "role": "admin", "display_name": "Operations Admin"},
        {"username": "editor", "email": "editor@newspaper.com", "role": "editor", "display_name": "News Editor"},
        {"username": "analyst", "email": "analyst@newspaper.com", "role": "analyst", "display_name": "Data Analyst"}
    ]

    for acc in default_accounts:
        existing = admin_users.find_one({"username": acc["username"]})
        if not existing:
            pwd_hash, salt_hex = hash_password(initial_pwd)
            admin_users.insert_one({
                "username": acc["username"],
                "email": acc["email"],
                "password_hash": pwd_hash,
                "salt": salt_hex,
                "role": acc["role"],
                "display_name": acc["display_name"],
                "created_at": datetime.now(timezone.utc)
            })

def authenticate_user(username_or_email: str, password: str) -> Optional[Dict]:
    ident = username_or_email.strip()
    user = admin_users.find_one({
        "$or": [
            {"username": {"$regex": f"^{ident}$", "$options": "i"}},
            {"email": {"$regex": f"^{ident}$", "$options": "i"}}
        ]
    })
    if not user:
        return None
    if verify_password(password, user["password_hash"], user["salt"]):
        return {
            "username": user["username"],
            "email": user.get("email", ""),
            "role": user["role"],
            "display_name": user.get("display_name", user["username"])
        }
    return None

def create_session_token(username: str, role: str, days: int = 7) -> str:
    token = secrets.token_hex(32)
    now = datetime.now(timezone.utc)
    expires = now + timedelta(days=days)
    admin_tokens.insert_one({
        "token": token,
        "username": username,
        "role": role,
        "created_at": now,
        "expires_at": expires
    })
    return token

def validate_session_token(token: str) -> Optional[Dict]:
    if not token:
        return None
    record = admin_tokens.find_one({"token": token})
    if not record:
        return None
    
    expires_at = record.get("expires_at")
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if expires_at and expires_at < datetime.now(timezone.utc):
        admin_tokens.delete_one({"_id": record["_id"]})
        return None

    return {
        "username": record["username"],
        "role": record.get("role", "admin")
    }

def revoke_session_token(token: str):
    if token:
        admin_tokens.delete_many({"token": token})

