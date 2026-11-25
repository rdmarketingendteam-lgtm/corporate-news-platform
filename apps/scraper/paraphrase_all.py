import time
from app.database import articles
from app.services.paraphraser import batch_paraphrase_db_articles

def run():
    total = articles.count_documents({})
    print(f"Total articles in DB to paraphrase: {total}")
    start = time.time()
    
    # Process in batches
    res = batch_paraphrase_db_articles(batch_size=total, force=True)
    count = res.get("updated_count", 0)
    print(f"Processed batch of {count} articles. Avg uniqueness: {res.get('average_uniqueness_score')}%")
            
    elapsed = time.time() - start
    paraphrased_total = articles.count_documents({"is_paraphrased": True})
    print(f"\nSUCCESS! Paraphrased {paraphrased_total}/{total} articles in {elapsed:.2f} seconds.")

if __name__ == "__main__":
    run()
