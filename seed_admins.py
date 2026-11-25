import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "apps", "scraper"))
from datetime import datetime, timezone

from app.database import db
from app.services.auth import admin_users, hash_password

accounts = [
    {
        "username": "superadmin",
        "email": "superadmin@newspaper.com",
        "password": "superadmin123",
        "role": "superadmin",
        "display_name": "Chief Executive (Super Admin)"
    },
    {
        "username": "admin",
        "email": "admin@newspaper.com",
        "password": "admin123",
        "role": "admin",
        "display_name": "Operations Admin"
    }
]

for acc in accounts:
    pwd_hash, salt_hex = hash_password(acc["password"])
    admin_users.update_one(
        {"username": acc["username"]},
        {"$set": {
            "username": acc["username"],
            "email": acc["email"],
            "password_hash": pwd_hash,
            "salt": salt_hex,
            "role": acc["role"],
            "display_name": acc["display_name"],
            "updated_at": datetime.now(timezone.utc)
        }},
        upsert=True
    )

print("Admins successfully seeded into MongoDB 'admin_users' collection:")
for u in admin_users.find({}, {"username": 1, "email": 1, "role": 1, "display_name": 1}):
    print(u)
