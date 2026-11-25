import os
from datetime import datetime, timezone, timedelta
import random
from pymongo import MongoClient

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://127.0.0.1:27017")
MONGODB_DATABASE = os.getenv("MONGODB_DATABASE", "news_api")

client = MongoClient(MONGODB_URI)
db = client[MONGODB_DATABASE]
analytics_visits = db["analytics_visits"]

now = datetime.now(timezone.utc)

devices = ["Mobile", "Mobile", "Mobile", "Desktop", "Desktop", "Tablet"]
referrers = [
    "Google Organic Search",
    "https://t.co/news-update",
    "https://m.facebook.com",
    "Direct / Bookmark",
    "Daily Morning Newsletter",
    "https://web.whatsapp.com"
]
cities = [
    ("Mumbai", "India"),
    ("New Delhi", "India"),
    ("Bengaluru", "India"),
    ("Hyderabad", "India"),
    ("Pune", "India"),
    ("Kolkata", "India"),
    ("Ahmedabad", "India"),
    ("Chennai", "India")
]
paths = [
    "/",
    "/news/viral-sheshnag-lake-digging-clip-sparks-row",
    "/news/jackie-shroff-remembers-dharmendra",
    "/news/zero-plus-zero-equals-zero",
    "/news/the-future-of-enterprise-5g-networks-in-india",
    "/news/ludhiana-bungalow-to-mumbai-apartment",
    "/category/entertainment",
    "/category/technology",
    "/category/sports",
    "/category/business",
    "/aspiri-luxury"
]

docs = []
for i in range(120):
    mins_ago = random.randint(1, 1440)
    ts = now - timedelta(minutes=mins_ago)
    city, country = random.choice(cities)
    docs.append({
        "path": random.choice(paths),
        "visitor_id": f"visitor_{random.randint(100, 999)}",
        "referrer": random.choice(referrers),
        "screen": "375x812" if random.choice(devices) == "Mobile" else "1920x1080",
        "device": random.choice(devices),
        "ip": f"192.168.107.{random.randint(10, 90)}",
        "city": city,
        "country": country,
        "created_at": ts
    })

if analytics_visits.count_documents({}) < 50:
    analytics_visits.insert_many(docs)
    print(f"Successfully seeded {len(docs)} analytics visits!")
else:
    print(f"Collection already has {analytics_visits.count_documents({})} visits. Added 20 fresh real-time visits.")
    analytics_visits.insert_many(docs[:20])
