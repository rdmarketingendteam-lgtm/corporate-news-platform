import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
MONGODB_DATABASE = os.getenv("MONGODB_DATABASE", "news_api")
API_KEY = os.getenv("API_KEY", "")
TEMP_DIR = Path(os.getenv("TEMP_DIR", "./temp_news"))
TEMP_RETENTION_DAYS = int(os.getenv("TEMP_RETENTION_DAYS", "3"))
SCRAPE_INTERVAL_MINUTES = int(os.getenv("SCRAPE_INTERVAL_MINUTES", "60"))
# 0 = No lookback cutoff (unlimited history)
INITIAL_LOOKBACK_HOURS = int(os.getenv("INITIAL_LOOKBACK_HOURS", "0"))
# 0 = No item limit per source (scrape every article available on every page)
MAX_ITEMS_PER_SOURCE = int(os.getenv("MAX_ITEMS_PER_SOURCE", "0"))
USER_AGENT = os.getenv("USER_AGENT", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")

# SMTP Real Email Dispatcher Configuration
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", SMTP_USER or "editorial@newspaperpro.com")
SMTP_FROM_NAME = os.getenv("SMTP_FROM_NAME", "Newspaper Pro Newsroom")
SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "true").lower() in ("true", "1", "yes")
ADMIN_NOTIFICATION_EMAIL = os.getenv("ADMIN_NOTIFICATION_EMAIL", "")
