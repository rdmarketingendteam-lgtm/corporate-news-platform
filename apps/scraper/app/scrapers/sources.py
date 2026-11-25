import os
from app.scrapers.base import FeedSource

class TimesOfIndia(FeedSource):
    name = "Times of India"
    feed_url = os.getenv("TOI_FEED_URL", "https://timesofindia.indiatimes.com/rssfeedstopstories.cms")
    feeds = [
        {"url": os.getenv("TOI_FEED_URL", 
        "https://timesofindia.indiatimes.com/rssfeedstopstories.cms"), "category": "top"},
        {"url": "https://timesofindia.indiatimes.com/rssfeeds/-2128936835.cms", "category": "india"},
        {"url": "https://timesofindia.indiatimes.com/rssfeeds/296589292.cms", "category": "world"},
        {"url": "https://timesofindia.indiatimes.com/rssfeeds/1898055.cms", "category": "business"},
        {"url": "https://timesofindia.indiatimes.com/rssfeeds/66949542.cms", "category": "technology"},
        {"url": "https://timesofindia.indiatimes.com/rssfeeds/4719148.cms", "category": "sports"},
        {"url": "https://timesofindia.indiatimes.com/rssfeeds/1081479906.cms", "category": "entertainment"},
        {"url": "https://timesofindia.indiatimes.com/rssfeeds/2886704.cms", "category": "lifestyle"},
    ]

class IndianExpress(FeedSource):
    name = "The Indian Express"
    feed_url = os.getenv("INDIAN_EXPRESS_FEED_URL", "https://indianexpress.com/feed/")
    feeds = [
        {"url": os.getenv("INDIAN_EXPRESS_FEED_URL", "https://indianexpress.com/feed/"), "category": "top"},
        {"url": "https://indianexpress.com/section/india/feed/", "category": "india"},
        {"url": "https://indianexpress.com/section/world/feed/", "category": "world"},
        {"url": "https://indianexpress.com/section/business/feed/", "category": "business"},
        {"url": "https://indianexpress.com/section/technology/feed/", "category": "technology"},
        {"url": "https://indianexpress.com/section/sports/feed/", "category": "sports"},
        {"url": "https://indianexpress.com/section/entertainment/feed/", "category": "entertainment"},
        {"url": "https://indianexpress.com/section/cities/feed/", "category": "cities"},
    ]

class NDTV(FeedSource):
    name = "NDTV"
    feed_url = os.getenv("NDTV_FEED_URL", "https://feeds.feedburner.com/ndtvnews-top-stories")
    feeds = [
        {"url": os.getenv("NDTV_FEED_URL", "https://feeds.feedburner.com/ndtvnews-top-stories"), "category": "top"},
        {"url": "https://feeds.feedburner.com/ndtvnews-latest", "category": "latest"},
        {"url": "https://feeds.feedburner.com/ndtvnews-india-news", "category": "india"},
        {"url": "https://feeds.feedburner.com/ndtvnews-world-news", "category": "world"},
        {"url": "https://feeds.feedburner.com/ndtvsports-latest", "category": "sports"},
        {"url": "https://feeds.feedburner.com/ndtvmovies-latest", "category": "entertainment"},
        {"url": "https://feeds.feedburner.com/gadgets360-latest", "category": "technology"},
    ]

class News18(FeedSource):
    name = "News18"
    feed_url = os.getenv("NEWS18_FEED_URL", "https://www.news18.com/rss/india.xml")
    feeds = [
        {"url": os.getenv("NEWS18_FEED_URL", "https://www.news18.com/rss/india.xml"), "category": "india"},
        {"url": "https://www.news18.com/rss/world.xml", "category": "world"},
        {"url": "https://www.news18.com/rss/business.xml", "category": "business"},
        {"url": "https://www.news18.com/rss/tech.xml", "category": "technology"},
        {"url": "https://www.news18.com/rss/sports.xml", "category": "sports"},
        {"url": "https://www.news18.com/rss/movies.xml", "category": "entertainment"},
        {"url": "https://www.news18.com/rss/lifestyle.xml", "category": "lifestyle"},
    ]

def enabled_sources():
    sources = [TimesOfIndia(), IndianExpress(), NDTV(), News18()]
    return [s for s in sources if s.get_feeds()]
