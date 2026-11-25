from pymongo import MongoClient
from datetime import datetime, timezone, timedelta

client = MongoClient('mongodb://127.0.0.1:27017/')
db = client['news_api']
articles = db['articles']

now = datetime.now(timezone.utc)
# Current month start: November 1, 2026
current_month_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
thirty_days_ago = now - timedelta(days=30)

c_month = articles.count_documents({"published_at": {"$gte": current_month_start}})
c_30days = articles.count_documents({"published_at": {"$gte": thirty_days_ago}})
total = articles.count_documents({})
older_than_month = total - c_month

print(f"Total articles in DB: {total}")
print(f"Current Month (from {current_month_start.strftime('%Y-%m-%d')}): {c_month}")
print(f"Last 30 Days: {c_30days}")
print(f"Older than current month (Archived in DB): {older_than_month}")
