import re
import html
import logging
from pymongo import MongoClient

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("cleaner")

IMG_SRC_RE = re.compile(r'<img[^>]+src=["\']([^"\']+)["\'][^>]*>', re.IGNORECASE)
TAG_RE = re.compile(r'<[^>]+>')
WHITESPACE_RE = re.compile(r'[ \t]+')

MOJIBAKE_REPLACEMENTS = [
    # Multi-byte UTF-8 misinterpretations
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
    for bad, good in MOJIBAKE_REPLACEMENTS:
        res = res.replace(bad, good)
    
    # Common contractions corrupted with â
    res = re.sub(r"(\w)âs\b", r"\1's", res, flags=re.IGNORECASE)
    res = re.sub(r"(\w)ât\b", r"\1't", res, flags=re.IGNORECASE)
    res = re.sub(r"(\w)âd\b", r"\1'd", res, flags=re.IGNORECASE)
    res = re.sub(r"(\w)âll\b", r"\1'll", res, flags=re.IGNORECASE)
    res = re.sub(r"(\w)âve\b", r"\1've", res, flags=re.IGNORECASE)
    res = re.sub(r"(\w)âre\b", r"\1're", res, flags=re.IGNORECASE)
    res = re.sub(r"(\w)âm\b", r"\1'm", res, flags=re.IGNORECASE)
    
    # Quoted terms: âTermâ -> "Term"
    res = re.sub(r"â([^â\n]+)â", r"'\1'", res)
    
    # Any residual standalone â
    res = res.replace('â', "'")
    return res

def clean_html_string(raw: str) -> str:
    if not raw:
        return ""
    # 1. Unescape HTML entities first (e.g. &lt;img ...&gt;)
    t = html.unescape(raw)
    # 2. In case entity unescaping revealed more tags, strip all HTML tags
    t = TAG_RE.sub(" ", t)
    # 3. Fix mojibake
    t = clean_mojibake(t)
    # 4. Collapse inline whitespace
    t = WHITESPACE_RE.sub(" ", t).strip()
    return t

def clean_content_body(raw: str) -> str:
    if not raw:
        return ""
    # Content preserves paragraph line breaks
    t = html.unescape(raw)
    # Convert <br>, <p>, </div> to newlines before stripping
    t = re.sub(r'(?i)<br\s*/?>', '\n', t)
    t = re.sub(r'(?i)</p>', '\n\n', t)
    t = re.sub(r'(?i)</div>', '\n', t)
    # Strip remaining tags
    t = TAG_RE.sub(' ', t)
    # Fix mojibake
    t = clean_mojibake(t)
    # Clean weird newline + punctuation artifacts like "\n," or "\n."
    t = re.sub(r'\n\s*([,\.\?!;:])', r'\1 ', t)
    # Normalize consecutive newlines
    lines = [WHITESPACE_RE.sub(' ', line).strip() for line in t.split('\n')]
    # Reassemble paragraphs
    cleaned_paras = []
    for line in lines:
        if line:
            cleaned_paras.append(line)
    return "\n\n".join(cleaned_paras)

def run():
    client = MongoClient("mongodb://localhost:27017")
    db = client["news_api"]
    col = db["articles"]
    
    cursor = col.find({}, {
        "_id": 1,
        "title": 1,
        "description": 1,
        "content": 1,
        "summary": 1,
        "image_url": 1,
        "top_image": 1,
    })
    
    total = col.count_documents({})
    log.info(f"Scanning and cleaning {total} articles in news_api...")
    
    updated_count = 0
    img_extracted_count = 0
    
    for doc in cursor:
        doc_id = doc["_id"]
        raw_desc = doc.get("description") or ""
        raw_cont = doc.get("content") or ""
        raw_title = doc.get("title") or ""
        raw_summary = doc.get("summary") or ""
        img_url = doc.get("image_url")
        top_img = doc.get("top_image")
        
        updates = {}
        
        # Check if an image tag exists in description or content to save as image_url
        if not img_url or not top_img:
            match = IMG_SRC_RE.search(raw_desc) or IMG_SRC_RE.search(raw_cont)
            if match:
                extracted_img = match.group(1).strip()
                if extracted_img.startswith("http"):
                    if not img_url:
                        updates["image_url"] = extracted_img
                    if not top_img:
                        updates["top_image"] = extracted_img
                    img_extracted_count += 1
        
        clean_desc = clean_html_string(raw_desc)
        if clean_desc != raw_desc:
            updates["description"] = clean_desc
            
        clean_cont = clean_content_body(raw_cont)
        if clean_cont != raw_cont:
            updates["content"] = clean_cont
            
        clean_title = clean_html_string(raw_title)
        if clean_title != raw_title:
            updates["title"] = clean_title
            
        if raw_summary:
            clean_summ = clean_html_string(raw_summary)
            if clean_summ != raw_summary:
                updates["summary"] = clean_summ
                
        if updates:
            col.update_one({"_id": doc_id}, {"$set": updates})
            updated_count += 1
            if updated_count % 500 == 0:
                log.info(f"Progress: {updated_count} articles updated...")
                
    log.info(f"Done! Updated {updated_count} / {total} articles.")
    log.info(f"Extracted {img_extracted_count} images from embedded HTML tags.")

if __name__ == "__main__":
    run()
