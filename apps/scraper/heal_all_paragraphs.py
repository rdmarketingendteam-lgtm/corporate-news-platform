import re
import logging
from pymongo import MongoClient

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("healer")

def heal_content(t: str) -> str:
    if not t:
        return ""
    # 1. Join split quotes: e.g. on '\n\nRamayana\n\n',
    t = re.sub(r"'\s*\n+\s*([^'\n]+)\s*\n+\s*'\s*,", r"'\1',", t)
    t = re.sub(r'"\s*\n+\s*([^"\n]+)\s*\n+\s*"\s*,', r'"\1",', t)
    
    # 2. Join lines where next line starts with a comma, period, or closing quote
    t = re.sub(r"\n+\s*([,\.\?!;:\'\"\)\]\}])", r"\1", t)
    
    # 3. Join lines where line ends without terminal punctuation and next line starts with lowercase
    t = re.sub(r"([^\.\!\?\:\n])\n+\s*([a-z])", r"\1 \2", t)
    
    # 4. Join line ending with common prepositions/conjunctions
    t = re.sub(r"(?i)\b(in|on|at|by|with|for|to|from|as|and|or|but|the|a|an|is|are|was|were|has|have|had)\s*\n+\s*", r"\1 ", t)
    
    # 5. Join lines ending with titles/roles before names
    t = re.sub(r"(?i)\b(directed by|produced by|written by|stars|starring|actor|actress|minister|president|prime minister|chief minister)\s*\n+\s*", r"\1 ", t)
    
    # 6. Normalize multiple newlines and spaces
    t = re.sub(r"[ \t]+", " ", t)
    t = re.sub(r"\n{3,}", "\n\n", t)
    return t.strip()

def run():
    client = MongoClient("mongodb://localhost:27017")
    db = client["news_api"]
    col = db["articles"]
    
    cursor = col.find({}, {"_id": 1, "content": 1, "description": 1})
    total = col.count_documents({})
    log.info(f"Scanning and healing broken paragraphs across {total} articles...")
    
    updated = 0
    for doc in cursor:
        doc_id = doc["_id"]
        c = doc.get("content") or ""
        d = doc.get("description") or ""
        
        healed_c = heal_content(c)
        healed_d = heal_content(d)
        
        updates = {}
        if healed_c != c:
            updates["content"] = healed_c
        if healed_d != d:
            updates["description"] = healed_d
            
        if updates:
            col.update_one({"_id": doc_id}, {"$set": updates})
            updated += 1
            if updated % 500 == 0:
                log.info(f"Progress: {updated} articles healed...")
                
    log.info(f"Complete! Healed {updated} / {total} articles.")

if __name__ == "__main__":
    run()
