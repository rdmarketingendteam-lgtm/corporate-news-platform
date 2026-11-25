from datetime import datetime, timedelta, timezone
from pathlib import Path
import json
import logging
import feedparser
import requests

from app.config import (
    TEMP_DIR,
    TEMP_RETENTION_DAYS,
    INITIAL_LOOKBACK_HOURS,
    MAX_ITEMS_PER_SOURCE,
    USER_AGENT,
    SCRAPE_INTERVAL_MINUTES
)
from app.database import articles, scrape_runs, sources, scraper_errors
from app.services.normalize import stable_id, clean_url, parse_date, short_summary, clean_html_text, extract_embedded_image
from app.services.article_extractor import batch_populate_inner_data
from app.services.paraphraser import process_and_paraphrase_article
from app.scrapers.base import extract_feed_content, extract_feed_image

log = logging.getLogger(__name__)

def fetch_feed_articles(source_id: str, source_name: str, feed_info: dict, timeout: int = 20, lookback_hours: int = 0, page_limit: int = 0):
    url = feed_info.get("url")
    category = feed_info.get("category", "general")
    if not url:
        return [], 0, 1, f"Missing URL for feed in {source_name}"

    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml"
    }

    try:
        response = requests.get(url, headers=headers, timeout=timeout)
        if response.status_code != 200:
            err_msg = f"HTTP {response.status_code} returned for {url}"
            scraper_errors.insert_one({
                "source_id": source_id,
                "source_name": source_name,
                "url": url,
                "error_type": "http_error",
                "reason": err_msg,
                "timestamp": datetime.now(timezone.utc)
            })
            return [], 0, 1, err_msg

        feed = feedparser.parse(response.content)
    except Exception as exc:
        err_msg = f"Request failed for {url}: {exc}"
        scraper_errors.insert_one({
            "source_id": source_id,
            "source_name": source_name,
            "url": url,
            "error_type": "timeout" if "timeout" in str(exc).lower() else "parse_error",
            "reason": err_msg,
            "timestamp": datetime.now(timezone.utc)
        })
        return [], 0, 1, err_msg

    cutoff = None
    if lookback_hours and lookback_hours > 0:
        cutoff = datetime.now(timezone.utc) - timedelta(hours=lookback_hours)

    entries = feed.entries
    if page_limit and page_limit > 0:
        entries = entries[:page_limit]
    elif MAX_ITEMS_PER_SOURCE and MAX_ITEMS_PER_SOURCE > 0:
        entries = entries[:MAX_ITEMS_PER_SOURCE]

    items = []
    for entry in entries:
        link = entry.get("link")
        title = (entry.get("title") or "").strip()
        if not link or not title:
            continue

        published = parse_date(entry.get("published") or entry.get("updated"))
        if cutoff and published and published < cutoff:
            continue

        cleaned_link = clean_url(link)
        description = entry.get("summary") or entry.get("description") or ""
        initial_content = extract_feed_content(entry)
        author = entry.get("author") or None
        top_image = extract_feed_image(entry) or extract_embedded_image(description)
        clean_title = clean_html_text(title)

        items.append({
            "source_id": source_id,
            "source_name": source_name,
            "source": source_name,
            "source_url": cleaned_link,
            "canonical_url": cleaned_link,
            "title": clean_title or title,
            "description": short_summary(description),
            "summary": short_summary(description),
            "content": initial_content or short_summary(description) or "",
            "image_url": top_image,
            "top_image": top_image,
            "image_alt": title,
            "author": author,
            "category": category,
            "tags": [category] if category else [],
            "published_at": published,
            "status": "needs_review"
        })

    return items, 1, 0, None

def collect_news(target_source_id: str = None, trigger_type: str = "scheduled", lookback_hours: int = None):
    lookback = lookback_hours if lookback_hours is not None else INITIAL_LOOKBACK_HOURS
    started = datetime.now(timezone.utc)
    TEMP_DIR.mkdir(parents=True, exist_ok=True)

    # Fetch configured sources from MongoDB
    query = {"enabled": True}
    if target_source_id:
        query["source_id"] = target_source_id

    source_docs = list(sources.find(query))
    if not source_docs:
        log.warning("No enabled sources found for scraping.")

    overall_run_id = scrape_runs.insert_one({
        "source_id": target_source_id or "all",
        "trigger_type": trigger_type,
        "started_at": started,
        "finished_at": None,
        "status": "running",
        "pages_attempted": 0,
        "pages_succeeded": 0,
        "pages_failed": 0,
        "articles_discovered": 0,
        "new_articles": 0,
        "duplicates": 0,
        "articles_saved": 0,
        "image_count": 0,
        "description_count": 0,
        "errors": []
    }).inserted_id

    total_pages_attempted = 0
    total_pages_succeeded = 0
    total_pages_failed = 0
    total_discovered = 0
    total_new = 0
    total_duplicates = 0
    total_saved = 0
    total_with_images = 0
    total_with_desc = 0
    run_errors = []

    for src in source_docs:
        src_id = src["source_id"]
        src_name = src.get("display_name", src_id)
        feeds = src.get("feeds", [])
        timeout = src.get("request_timeout_seconds", 20)
        page_limit = src.get("page_limit", 0)

        src_articles = []
        seen_links = set()

        for feed_info in feeds:
            total_pages_attempted += 1
            items, succ, fail, err = fetch_feed_articles(
                src_id, src_name, feed_info, timeout=timeout, lookback_hours=lookback, page_limit=page_limit
            )
            total_pages_succeeded += succ
            total_pages_failed += fail
            if err:
                run_errors.append(f"[{src_name}] {err}")

            for itm in items:
                link = itm["source_url"]
                if link not in seen_links:
                    seen_links.add(link)
                    src_articles.append(itm)

        total_discovered += len(src_articles)

        # Scrape full article content and metadata concurrently
        batch_populate_inner_data(src_articles, max_workers=10)

        # Paraphrase all articles to preserve same meaning while eliminating plagiarism
        for itm in src_articles:
            try:
                process_and_paraphrase_article(itm)
            except Exception as p_err:
                log.debug("Paraphrase skipped for %s: %s", itm.get("source_url"), p_err)

        # Write temporary raw file
        try:
            tmp_path = TEMP_DIR / f"{src_id}_{started.strftime('%Y%m%dT%H%M%S')}.json"
            tmp_path.write_text(json.dumps(src_articles, default=str, ensure_ascii=False), encoding="utf-8")
        except Exception:
            pass

        # Save to database
        for itm in src_articles:
            now_utc = datetime.now(timezone.utc)
            itm["collected_at"] = now_utc
            itm["fetched_at"] = now_utc
            itm["created_at"] = now_utc
            itm["updated_at"] = now_utc
            itm["article_id"] = stable_id(itm["source_url"])

            # Sync image_url and top_image
            img = itm.get("top_image") or itm.get("image_url")
            itm["image_url"] = img
            itm["top_image"] = img

            desc = itm.get("description") or itm.get("summary") or ""
            itm["description"] = desc
            itm["summary"] = desc

            # Determine extraction status
            itm["extraction_status"] = {
                "title": "success" if itm.get("title") else "missing",
                "description": "success" if (desc and len(desc) > 15) else "missing",
                "image": "success" if img else "missing",
                "content": "success" if (itm.get("content") and len(itm.get("content")) > 50) else "missing"
            }

            has_image = bool(img)
            has_desc = bool(desc)

            try:
                articles.insert_one(itm)
                total_new += 1
                total_saved += 1
                if has_image:
                    total_with_images += 1
                if has_desc:
                    total_with_desc += 1
            except Exception as exc:
                if "duplicate key" in str(exc).lower():
                    total_duplicates += 1
                    # Update content and images if document was previously stored with missing fields
                    update_fields = {
                        "updated_at": now_utc,
                        "extraction_status": itm["extraction_status"]
                    }
                    if itm.get("content"):
                        update_fields["content"] = itm["content"]
                    if img:
                        update_fields["image_url"] = img
                        update_fields["top_image"] = img
                    if desc:
                        update_fields["description"] = desc
                        update_fields["summary"] = desc
                    if itm.get("author"):
                        update_fields["author"] = itm["author"]

                    res = articles.update_one(
                        {"source_url": itm["source_url"]},
                        {"$set": update_fields}
                    )
                    if res.modified_count > 0:
                        total_saved += 1
                        if has_image:
                            total_with_images += 1
                        if has_desc:
                            total_with_desc += 1
                else:
                    run_errors.append(f"DB Write error for {itm.get('source_url')}: {exc}")

        # Update source metadata
        next_run = datetime.now(timezone.utc) + timedelta(minutes=src.get("polling_interval_minutes", SCRAPE_INTERVAL_MINUTES))
        sources.update_one(
            {"source_id": src_id},
            {"$set": {"last_run_at": datetime.now(timezone.utc), "next_run_at": next_run}}
        )

    finished = datetime.now(timezone.utc)
    duration = round((finished - started).total_seconds(), 2)

    status = "success"
    if total_pages_failed > 0:
        status = "partial" if total_pages_succeeded > 0 else "failed"

    scrape_runs.update_one(
        {"_id": overall_run_id},
        {"$set": {
            "finished_at": finished,
            "duration_seconds": duration,
            "status": status,
            "pages_attempted": total_pages_attempted,
            "pages_succeeded": total_pages_succeeded,
            "pages_failed": total_pages_failed,
            "articles_discovered": total_discovered,
            "new_articles": total_new,
            "duplicates": total_duplicates,
            "articles_saved": total_saved,
            "image_count": total_with_images,
            "description_count": total_with_desc,
            "errors": run_errors[:20]
        }}
    )

    return {
        "run_id": str(overall_run_id),
        "status": status,
        "duration_seconds": duration,
        "pages_attempted": total_pages_attempted,
        "pages_succeeded": total_pages_succeeded,
        "pages_failed": total_pages_failed,
        "articles_discovered": total_discovered,
        "new_articles": total_new,
        "duplicates": total_duplicates,
        "articles_saved": total_saved,
        "image_count": total_with_images,
        "description_count": total_with_desc,
        "errors_count": len(run_errors)
    }

def cleanup_temp_files():
    TEMP_DIR.mkdir(parents=True, exist_ok=True)
    cutoff = datetime.now().timestamp() - TEMP_RETENTION_DAYS * 86400
    removed = 0
    for path in TEMP_DIR.iterdir():
        try:
            if path.is_file() and path.stat().st_mtime < cutoff:
                path.unlink()
                removed += 1
        except OSError:
            log.exception("Could not remove temporary file: %s", path)
    return removed
