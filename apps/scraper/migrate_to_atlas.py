import pymongo
import sys

LOCAL_URI = "mongodb://localhost:27017/"
ATLAS_URI = "mongodb+srv://rdmarketingendteam_db_user:QZ2o6NToJm8mzBss@news-cluster.qoayxnl.mongodb.net/?retryWrites=true&w=majority"
DB_NAME = "news_api"

print("[Migration] Connecting to local MongoDB and Atlas...")
local_client = pymongo.MongoClient(LOCAL_URI, serverSelectionTimeoutMS=5000)
atlas_client = pymongo.MongoClient(ATLAS_URI, serverSelectionTimeoutMS=10000)

local_db = local_client[DB_NAME]
atlas_db = atlas_client[DB_NAME]

collections = local_db.list_collection_names()
print(f"[Migration] Found {len(collections)} collections to migrate: {collections}")

for col_name in collections:
    if col_name.startswith("system."):
        continue
    
    local_col = local_db[col_name]
    atlas_col = atlas_db[col_name]
    
    total = local_col.count_documents({})
    if total == 0:
        print(f"  - {col_name}: 0 docs (skipped)")
        continue
    
    print(f"  - Migrating {col_name} ({total} docs)...")
    
    # Process in batches of 500
    batch_size = 500
    cursor = local_col.find({})
    batch = []
    inserted = 0
    
    for doc in cursor:
        batch.append(doc)
        if len(batch) >= batch_size:
            try:
                # Use insert_many with ordered=False to skip duplicates if any
                atlas_col.insert_many(batch, ordered=False)
            except pymongo.errors.BulkWriteError as bwe:
                pass
            inserted += len(batch)
            print(f"    ... {inserted}/{total} done")
            batch = []
            
    if batch:
        try:
            atlas_col.insert_many(batch, ordered=False)
        except pymongo.errors.BulkWriteError as bwe:
            pass
        inserted += len(batch)
        print(f"    ... {inserted}/{total} done")

print("\n[Migration] Migration complete! Verifying counts on Atlas:")
for col_name in collections:
    if col_name.startswith("system."):
        continue
    count = atlas_db[col_name].count_documents({})
    print(f"  * {col_name}: {count} docs on Atlas")
