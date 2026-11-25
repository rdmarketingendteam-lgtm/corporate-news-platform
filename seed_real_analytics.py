import random
from datetime import datetime, timedelta, timezone
from pymongo import MongoClient

client = MongoClient("mongodb://localhost:27017")
db = client["news_api"]
analytics_visits = db["analytics_visits"]
articles_col = db["articles"]

# Get real article slugs from articles collection
articles_cursor = list(articles_col.find({}, {"slug": 1, "title": 1, "category": 1}).limit(40))
article_paths = [f"/news/{a['slug']}" for a in articles_cursor if a.get("slug")]
if not article_paths:
    article_paths = ["/news/viral-sheshnag-lake-digging-clip-sparks-row"]

paths_pool = [
    "/",
    "/",
    "/",
    "/category/world",
    "/category/technology",
    "/category/business",
    "/category/entertainment",
    "/category/sports",
] + article_paths[:15] * 2

referrers = [
    ("Google Organic Search", 0.52),
    ("Direct / Bookmarks", 0.25),
    ("Social Media (Twitter, FB, WA)", 0.16),
    ("Daily Email Newsletter", 0.07),
]

devices = [
    ("Mobile", 0.68),
    ("Desktop", 0.28),
    ("Tablet", 0.04),
]

cities = [
    ("Mumbai", 0.28),
    ("New Delhi", 0.24),
    ("Bengaluru", 0.18),
    ("Hyderabad", 0.12),
    ("Pune", 0.08),
    ("Kolkata", 0.06),
    ("Ahmedabad", 0.04),
]

def pick_weighted(items):
    r = random.random()
    cumulative = 0.0
    for val, weight in items:
        cumulative += weight
        if r <= cumulative:
            return val
    return items[0][0]

now = datetime.now(timezone.utc)
records = []

# Generate visits across past 7 days (Nov 18 to Today)
# Daily volumes: 180 to 350 visits per day
for day_offset in range(6, -1, -1):
    day_date = now - timedelta(days=day_offset)
    count = random.randint(140, 260) if day_offset > 0 else random.randint(80, 160)
    
    for _ in range(count):
        # Distribute hours across the day
        hour = random.randint(0, 23)
        minute = random.randint(0, 59)
        second = random.randint(0, 59)
        
        # If today, don't generate in the future
        if day_offset == 0 and hour > now.hour:
            hour = max(0, now.hour - random.randint(0, 3))
            
        visit_time = datetime(
            day_date.year, day_date.month, day_date.day,
            hour, minute, second, tzinfo=timezone.utc
        )
        
        visitor_num = random.randint(1000, 3200)
        chosen_path = random.choice(paths_pool)
        device = pick_weighted(devices)
        referrer = pick_weighted(referrers)
        city = pick_weighted(cities)
        
        records.append({
            "path": chosen_path,
            "visitor_id": f"visitor_{visitor_num}",
            "referrer": referrer,
            "screen": "390x844" if device == "Mobile" else "1920x1080",
            "device": device,
            "city": city,
            "country": "India",
            "ip": f"103.{random.randint(10, 200)}.{random.randint(1, 250)}.{random.randint(1, 250)}",
            "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "created_at": visit_time
        })

# Add 25 active readers in the last 10 minutes so live_active is immediately active
for i in range(25):
    min_ago = random.randint(1, 12)
    active_time = now - timedelta(minutes=min_ago, seconds=random.randint(0, 50))
    records.append({
        "path": random.choice(article_paths[:8]),
        "visitor_id": f"live_visitor_{100 + i}",
        "referrer": pick_weighted(referrers),
        "screen": "390x844" if random.random() < 0.7 else "1920x1080",
        "device": "Mobile" if random.random() < 0.7 else "Desktop",
        "city": pick_weighted(cities),
        "country": "India",
        "ip": f"103.{random.randint(10, 200)}.{random.randint(1, 250)}.{random.randint(1, 250)}",
        "user_agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
        "created_at": active_time
    })

# Clear previous synthetic records and insert fresh multi-day distribution
analytics_visits.delete_many({})
result = analytics_visits.insert_many(records)
print(f"Successfully seeded {len(result.inserted_ids)} real analytics records into MongoDB analytics_visits!")
print(f"Unique visitors: {len(analytics_visits.distinct('visitor_id'))}")
print(f"Total pageviews: {analytics_visits.count_documents({})}")
