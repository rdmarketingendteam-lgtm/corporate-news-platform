from pymongo import MongoClient
import re

client = MongoClient('mongodb://localhost:27017')
db = client['news_api']
articles = db['articles']

syndication_patterns = [
    r'\(This story has not been edited by.*?\)',
    r'\(This story is auto-generated.*?\)',
    r'\(With inputs from.*?\)',
    r'Published by:.*?\n',
    r'Source:.*?\n',
    r'Read more at:.*?\n',
    r'Disclaimer:.*?\n'
]

total = 0
for pat in syndication_patterns:
    regex = re.compile(pat, re.IGNORECASE)
    cursor = articles.find({'$or': [
        {'content': {'$regex': pat, '$options': 'i'}},
        {'summary': {'$regex': pat, '$options': 'i'}}
    ]})
    found = list(cursor)
    print(f"Pattern '{pat[:40]}...': found {len(found)} articles")
    for doc in found:
        content = doc.get('content') or ''
        summary = doc.get('summary') or ''
        new_content = regex.sub('', content).strip()
        new_summary = regex.sub('', summary).strip()
        if new_content != content or new_summary != summary:
            articles.update_one(
                {'_id': doc['_id']},
                {'$set': {'content': new_content, 'summary': new_summary}}
            )
            total += 1

print(f"Total articles cleaned of syndication disclaimers: {total}")
