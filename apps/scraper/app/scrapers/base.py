from abc import ABC, abstractmethod
from datetime import datetime, timedelta, timezone
import feedparser
import requests
import logging
from app.config import USER_AGENT, MAX_ITEMS_PER_SOURCE
from app.services.normalize import clean_url, parse_date, short_summary
from app.services.article_extractor import batch_populate_inner_data

log = logging.getLogger(__name__)

def extract_feed_image(entry):
    if "media_content" in entry and entry["media_content"]:
        for media in entry["media_content"]:
            if isinstance(media, dict) and media.get("url"):
                return media["url"]
    if "media_thumbnail" in entry and entry["media_thumbnail"]:
        for media in entry["media_thumbnail"]:
            if isinstance(media, dict) and media.get("url"):
                return media["url"]
    if "enclosures" in entry and entry["enclosures"]:
        for enc in entry["enclosures"]:
            if isinstance(enc, dict) and enc.get("href"):
                return enc["href"]
    return None

def extract_feed_content(entry):
    if entry.get("content"):
        for c in entry.get("content"):
            if isinstance(c, dict) and c.get("value"):
                return c["value"]
            elif isinstance(c, str):
                return c
    return entry.get("summary") or entry.get("description") or ""

class FeedSource(ABC):
    name: str
    feed_url: str = ""
    feeds: list = []

    def get_feeds(self):
        feed_list = []
        if hasattr(self, "feeds") and self.feeds:
            feed_list.extend(self.feeds)
        if hasattr(self, "feed_url") and self.feed_url:
            if not any(f.get("url") == self.feed_url for f in feed_list):
                feed_list.insert(0, {"url": self.feed_url, "category": "top"})
        return [f for f in feed_list if f.get("url")]

    def fetch(self, lookback_hours=None):
        headers = {
            "User-Agent": USER_AGENT,
            "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml"
        }

        cutoff = None
        if lookback_hours and lookback_hours > 0:
            cutoff = datetime.now(timezone.utc) - timedelta(hours=lookback_hours)

        results = []
        seen_links = set()

        for feed_info in self.get_feeds():
            url = feed_info.get("url")
            category = feed_info.get("category", "general")
            if not url:
                continue

            try:
                response = requests.get(url, headers=headers, timeout=20)
                if response.status_code != 200:
                    continue
                feed = feedparser.parse(response.content)
            except Exception as exc:
                log.warning("Could not fetch feed %s: %s", url, exc)
                continue

            entries = feed.entries
            if MAX_ITEMS_PER_SOURCE and MAX_ITEMS_PER_SOURCE > 0:
                entries = entries[:MAX_ITEMS_PER_SOURCE]

            for entry in entries:
                link = entry.get("link")
                title = (entry.get("title") or "").strip()
                if not link or not title:
                    continue

                cleaned_link = clean_url(link)
                if cleaned_link in seen_links:
                    continue
                seen_links.add(cleaned_link)

                published = parse_date(entry.get("published") or entry.get("updated"))
                if cutoff and published and published < cutoff:
                    continue

                description = entry.get("summary") or entry.get("description") or ""
                initial_content = extract_feed_content(entry)
                author = entry.get("author") or None
                top_image = extract_feed_image(entry)

                results.append({
                    "title": title,
                    "summary": short_summary(description),
                    "content": initial_content or short_summary(description) or "",
                    "author": author,
                    "top_image": top_image,
                    "source": self.name,
                    "source_url": cleaned_link,
                    "published_at": published,
                    "category": category
                })

                if MAX_ITEMS_PER_SOURCE and MAX_ITEMS_PER_SOURCE > 0 and len(results) >= MAX_ITEMS_PER_SOURCE:
                    break

            if MAX_ITEMS_PER_SOURCE and MAX_ITEMS_PER_SOURCE > 0 and len(results) >= MAX_ITEMS_PER_SOURCE:
                break

        # Concurrently scrape the actual article webpage to get the full article text and rich metadata
        batch_populate_inner_data(results, max_workers=10)

        return results
