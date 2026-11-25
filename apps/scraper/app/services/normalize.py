import hashlib
import html
import re
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode

TRACKING_KEYS = {"utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid", "gclid"}
TAG_RE = re.compile(r'<[^>]+>')
IMG_SRC_RE = re.compile(r'<img[^>]+src=["\']([^"\']+)["\'][^>]*>', re.IGNORECASE)

MOJIBAKE_MAP = [
    ('â\x80\x99', "'"),
    ('â\x80\x9c', '"'),
    ('â\x80\x9d', '"'),
    ('â\x80\x94', '—'),
    ('â\x80\x93', '–'),
    ('â\x80\xa6', '...'),
    ('â€™', "'"),
    ('â€œ', '"'),
    ('â€\x9d', '"'),
    ('â€', '"'),
    ('â€”', '—'),
    ('â€“', '–'),
    ('â€¦', '...'),
    ('\u00a0', ' '),
    ('&nbsp;', ' '),
]

def clean_mojibake(text: str) -> str:
    if not text:
        return text
    res = text
    for bad, good in MOJIBAKE_MAP:
        res = res.replace(bad, good)
    res = re.sub(r"(\w)âs\b", r"\1's", res, flags=re.IGNORECASE)
    res = re.sub(r"(\w)ât\b", r"\1't", res, flags=re.IGNORECASE)
    res = re.sub(r"(\w)âd\b", r"\1'd", res, flags=re.IGNORECASE)
    res = re.sub(r"(\w)âll\b", r"\1'll", res, flags=re.IGNORECASE)
    res = re.sub(r"(\w)âve\b", r"\1've", res, flags=re.IGNORECASE)
    res = re.sub(r"(\w)âre\b", r"\1're", res, flags=re.IGNORECASE)
    res = re.sub(r"(\w)âm\b", r"\1'm", res, flags=re.IGNORECASE)
    res = re.sub(r"â([^â\n]+)â", r"'\1'", res)
    res = res.replace('â', "'")
    return res

def clean_html_text(text: str) -> str:
    if not text:
        return ""
    t = html.unescape(text)
    t = TAG_RE.sub(" ", t)
    t = clean_mojibake(t)
    
    # Strip syndication, promotional and boilerplate disclaimers
    syndication_cleaners = [
        r'\(This story has not been edited by.*?\)',
        r'\(This story is auto-generated.*?\)',
        r'\(With inputs from.*?\)',
        r'Published by:.*?\n',
        r'Source:.*?\n',
        r'Read more at:.*?\n',
        r'Disclaimer:.*?\n',
        r'Also Read\s*\|\s*.*?\n',
        r'Stay updated with the latest sports news across Cricket, Football, Chess, and more\.\s*',
        r'Catch all the action with real-time live cricket score updates and in-depth coverage of ongoing matches\.\s*',
    ]
    for pat in syndication_cleaners:
        t = re.sub(pat, ' ', t, flags=re.IGNORECASE)

    return re.sub(r"\s+", " ", t).strip()

def extract_embedded_image(text: str):
    if not text:
        return None
    match = IMG_SRC_RE.search(text)
    if match:
        url = match.group(1).strip()
        if url.startswith("http"):
            return url
    return None

def clean_url(url: str) -> str:
    parts = urlsplit(url.strip())
    query = [(k, v) for k, v in parse_qsl(parts.query, keep_blank_values=True)
             if k.lower() not in TRACKING_KEYS]
    return urlunsplit((parts.scheme.lower(), parts.netloc.lower(), parts.path, urlencode(query), ""))

def parse_date(value):
    if not value:
        return None
    if isinstance(value, datetime):
        dt = value
    else:
        try:
            dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        except ValueError:
            try:
                dt = parsedate_to_datetime(str(value))
            except Exception:
                return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)

def short_summary(text: str, limit: int = 350) -> str:
    cleaned = clean_html_text(text)
    if len(cleaned) <= limit:
        return cleaned
    return cleaned[:limit].rsplit(" ", 1)[0] + "…"

def stable_id(url: str) -> str:
    return hashlib.sha256(clean_url(url).encode("utf-8")).hexdigest()
