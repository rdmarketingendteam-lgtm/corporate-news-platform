from pymongo import MongoClient
import re

client = MongoClient('mongodb://localhost:27017')
db = client['news_api']
articles = db['articles']

patterns = [
    r'Stay updated with the latest sports news across Cricket, Football, Chess, and more\.\s*Catch all the action with real-time live cricket score updates and in-depth coverage of ongoing matches\.\s*',
    r'Stay updated with the latest sports news across Cricket, Football, Chess, and more\.\s*',
    r'Catch all the action with real-time live cricket score updates and in-depth coverage of ongoing matches\.\s*',
    r'For the latest news, download The Indian Express App\.\s*',
    r'Download the Indian Express app.*?\.\s*',
    r'Click here to join the Express.*?\.\s*',
    r'Follow our WhatsApp channel.*?\.\s*',
    r'Also Read\s*\|\s*.*?\n',
    r'Also read\s*\|\s*.*?\n'
]

total_cleaned = 0
for pat in patterns:
    regex = re.compile(pat, re.IGNORECASE)
    cursor = articles.find({'$or': [
        {'content': {'$regex': pat, '$options': 'i'}},
        {'summary': {'$regex': pat, '$options': 'i'}}
    ]})
    found = list(cursor)
    print(f"Pattern '{pat[:50]}...': found {len(found)} articles")
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
            total_cleaned += 1

print(f"Total articles cleaned of promotional boilerplate: {total_cleaned}")
