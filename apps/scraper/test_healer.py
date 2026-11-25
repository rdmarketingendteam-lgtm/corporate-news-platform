import re
from bson.objectid import ObjectId
from pymongo import MongoClient

db = MongoClient("mongodb://localhost:27017")["news_api"]
doc = db.articles.find_one({"_id": ObjectId("6b053a7b0520d5cb8b6d1173")})
text = doc.get("content") or ""

def fix_broken_paragraphs(t: str) -> str:
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

fixed = fix_broken_paragraphs(text)
print("--- ORIGINAL CONTENT (FIRST 350) ---")
print(repr(text[:350]))
print("--- FIXED CONTENT (FIRST 350) ---")
print(fixed[:350])
