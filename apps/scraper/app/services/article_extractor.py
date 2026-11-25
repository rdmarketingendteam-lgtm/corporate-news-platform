import logging
import requests
import trafilatura
from bs4 import BeautifulSoup
from concurrent.futures import ThreadPoolExecutor
from app.config import USER_AGENT

log = logging.getLogger(__name__)

DEFAULT_HEADERS = {
    "User-Agent": USER_AGENT,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

def extract_full_article(url: str, fallback_content: str = "", timeout: int = 8) -> dict:
    """
    Fetches the article webpage and extracts:
    - content: full article body text (guaranteed not None)
    - author: author name if detected
    - top_image: main article image URL if detected
    - description: meta description if detected
    """
    fallback_content = fallback_content or ""
    result = {
        "content": fallback_content,
        "author": None,
        "top_image": None,
        "description": None,
    }

    if not url:
        return result

    try:
        resp = requests.get(url, headers=DEFAULT_HEADERS, timeout=timeout)
        if resp.status_code == 200:
            html = resp.text
            extracted_text = trafilatura.extract(
                html,
                include_comments=False,
                include_tables=False,
                no_fallback=False
            )

            try:
                meta = trafilatura.extract_metadata(html)
                if meta:
                    result["author"] = meta.author
                    result["top_image"] = meta.image
                    result["description"] = meta.description
            except Exception:
                pass

            if extracted_text and len(extracted_text.strip()) > 80:
                result["content"] = extracted_text.strip()
            else:
                # BeautifulSoup fallback
                soup = BeautifulSoup(html, "html.parser")
                # Look for article tag or paragraphs
                article_elem = soup.find("article") or soup.find("main") or soup
                paragraphs = [
                    p.get_text().strip()
                    for p in article_elem.find_all("p")
                    if len(p.get_text().strip()) > 35
                ]
                if paragraphs:
                    result["content"] = "\n\n".join(paragraphs)

            # Check open graph / twitter image if top_image is still missing
            if not result["top_image"]:
                try:
                    soup = BeautifulSoup(html, "html.parser")
                    og_img = soup.find("meta", property="og:image") or soup.find("meta", attrs={"name": "twitter:image"})
                    if og_img and og_img.get("content"):
                        result["top_image"] = og_img.get("content").strip()
                except Exception:
                    pass

    except Exception as e:
        log.debug("Failed extracting full article for %s: %s", url, e)

    # Clean HTML entities if any in fallback
    if not result["content"]:
        result["content"] = fallback_content

    return result

def populate_record_inner_data(record: dict) -> dict:
    fallback = record.get("content") or record.get("summary") or ""
    url = record.get("source_url")
    data = extract_full_article(url, fallback_content=fallback)
    
    # Update record with scraped inner data
    record["content"] = data["content"] or fallback or ""
    if data.get("author") and not record.get("author"):
        record["author"] = data["author"]
    if data.get("top_image") and not record.get("top_image"):
        record["top_image"] = data["top_image"]
    return record

def batch_populate_inner_data(records: list, max_workers: int = 5) -> list:
    if not records:
        return records
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        list(executor.map(populate_record_inner_data, records))
    return records

