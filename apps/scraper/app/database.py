from datetime import datetime, timezone
from pymongo import MongoClient, ASCENDING, DESCENDING, TEXT
from pymongo.errors import PyMongoError
from app.config import MONGODB_URI, MONGODB_DATABASE

client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
db = client[MONGODB_DATABASE]

articles = db["articles"]
scrape_runs = db["scrape_runs"]
sources = db["sources"]
audit_logs = db["audit_logs"]
scraper_errors = db["scraper_errors"]
subscribers = db["subscribers"]
users = db["users"]
auth_otps = db["auth_otps"]
backlinks = db["backlinks"]
forum_posts = db["forum_posts"]
categories = db["categories"]
analytics_visits = db["analytics_visits"]

DEFAULT_SOURCES = [
    {
        "source_id": "toi",
        "display_name": "Times of India",
        "enabled": True,
        "polling_interval_minutes": 60,
        "page_limit": 0,
        "request_timeout_seconds": 20,
        "extraction_mode": "rss_metadata_web",
        "feeds": [
            {"url": "https://timesofindia.indiatimes.com/rssfeedstopstories.cms", "category": "top"},
            {"url": "https://timesofindia.indiatimes.com/rssfeeds/-2128936835.cms", "category": "india"},
            {"url": "https://timesofindia.indiatimes.com/rssfeeds/296589292.cms", "category": "world"},
            {"url": "https://timesofindia.indiatimes.com/rssfeeds/1898055.cms", "category": "business"},
            {"url": "https://timesofindia.indiatimes.com/rssfeeds/66949542.cms", "category": "technology"},
            {"url": "https://timesofindia.indiatimes.com/rssfeeds/4719148.cms", "category": "sports"},
            {"url": "https://timesofindia.indiatimes.com/rssfeeds/1081479906.cms", "category": "entertainment"},
            {"url": "https://timesofindia.indiatimes.com/rssfeeds/2886704.cms", "category": "lifestyle"}
        ],
        "last_run_at": None,
        "next_run_at": None
    },
    {
        "source_id": "indian_express",
        "display_name": "The Indian Express",
        "enabled": True,
        "polling_interval_minutes": 60,
        "page_limit": 0,
        "request_timeout_seconds": 20,
        "extraction_mode": "rss_metadata_web",
        "feeds": [
            {"url": "https://indianexpress.com/feed/", "category": "top"},
            {"url": "https://indianexpress.com/section/india/feed/", "category": "india"},
            {"url": "https://indianexpress.com/section/world/feed/", "category": "world"},
            {"url": "https://indianexpress.com/section/business/feed/", "category": "business"},
            {"url": "https://indianexpress.com/section/technology/feed/", "category": "technology"},
            {"url": "https://indianexpress.com/section/sports/feed/", "category": "sports"},
            {"url": "https://indianexpress.com/section/entertainment/feed/", "category": "entertainment"},
            {"url": "https://indianexpress.com/section/cities/feed/", "category": "cities"}
        ],
        "last_run_at": None,
        "next_run_at": None
    },
    {
        "source_id": "ndtv",
        "display_name": "NDTV",
        "enabled": True,
        "polling_interval_minutes": 60,
        "page_limit": 0,
        "request_timeout_seconds": 20,
        "extraction_mode": "rss_metadata_web",
        "feeds": [
            {"url": "https://feeds.feedburner.com/ndtvnews-top-stories", "category": "top"},
            {"url": "https://feeds.feedburner.com/ndtvnews-latest", "category": "latest"},
            {"url": "https://feeds.feedburner.com/ndtvnews-india-news", "category": "india"},
            {"url": "https://feeds.feedburner.com/ndtvnews-world-news", "category": "world"},
            {"url": "https://feeds.feedburner.com/ndtvsports-latest", "category": "sports"},
            {"url": "https://feeds.feedburner.com/ndtvmovies-latest", "category": "entertainment"},
            {"url": "https://feeds.feedburner.com/gadgets360-latest", "category": "technology"}
        ],
        "last_run_at": None,
        "next_run_at": None
    },
    {
        "source_id": "news18",
        "display_name": "News18",
        "enabled": True,
        "polling_interval_minutes": 60,
        "page_limit": 0,
        "request_timeout_seconds": 20,
        "extraction_mode": "rss_metadata_web",
        "feeds": [
            {"url": "https://www.news18.com/rss/india.xml", "category": "india"},
            {"url": "https://www.news18.com/rss/world.xml", "category": "world"},
            {"url": "https://www.news18.com/rss/business.xml", "category": "business"},
            {"url": "https://www.news18.com/rss/tech.xml", "category": "technology"},
            {"url": "https://www.news18.com/rss/sports.xml", "category": "sports"},
            {"url": "https://www.news18.com/rss/movies.xml", "category": "entertainment"},
            {"url": "https://www.news18.com/rss/lifestyle.xml", "category": "lifestyle"}
        ],
        "last_run_at": None,
        "next_run_at": None
    }
]

def initialize_database():
    # Articles indexes
    articles.create_index([("source_url", ASCENDING)], unique=True)
    articles.create_index([("slug", ASCENDING)])
    articles.create_index([("published_at", DESCENDING)])
    articles.create_index([("collected_at", DESCENDING)])
    articles.create_index([("source_id", ASCENDING), ("published_at", DESCENDING)])
    articles.create_index([("category", ASCENDING), ("published_at", DESCENDING)])
    articles.create_index([("status", ASCENDING)])
    
    # Scrape runs indexes
    scrape_runs.create_index([("started_at", DESCENDING)])
    scrape_runs.create_index([("source_id", ASCENDING)])
    scrape_runs.create_index([("status", ASCENDING)])

    # Sources indexes
    sources.create_index([("source_id", ASCENDING)], unique=True)

    # Audit logs indexes
    audit_logs.create_index([("timestamp", DESCENDING)])
    audit_logs.create_index([("entity_id", ASCENDING)])

    # Scraper errors indexes
    scraper_errors.create_index([("timestamp", DESCENDING)])
    scraper_errors.create_index([("source_id", ASCENDING)])

    # Seed sources if collection is empty
    if sources.count_documents({}) == 0:
        for s in DEFAULT_SOURCES:
            sources.update_one({"source_id": s["source_id"]}, {"$setOnInsert": s}, upsert=True)

    # Ensure existing articles have default status and source_id
    articles.update_many({"status": {"$exists": False}}, {"$set": {"status": "needs_review"}})

    # Seed default admin users
    try:
        from app.services.auth import seed_default_admin_users
        seed_default_admin_users()
    except Exception:
        pass

def ping_database():
    client.admin.command("ping")
    return True
