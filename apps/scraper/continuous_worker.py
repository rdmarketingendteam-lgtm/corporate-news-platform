"""
Continuous Background Scraper Worker
Runs indefinitely, scraping all configured publishers across all pages/sections with no limits,
sleeping for SCRAPE_INTERVAL_MINUTES between cycles.
"""
import time
import logging
from datetime import datetime, timezone
from app.config import SCRAPE_INTERVAL_MINUTES
from app.database import initialize_database
from app.services.collector import collect_news, cleanup_temp_files

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
log = logging.getLogger("continuous_worker")

def run_loop():
    initialize_database()
    log.info("Starting Continuous Scraper Worker (interval: %d minutes, no limits)", SCRAPE_INTERVAL_MINUTES)
    while True:
        try:
            log.info("Starting scrape cycle across all pages and sources...")
            res = collect_news()
            log.info("Scrape cycle complete: %s", res)
            cleaned = cleanup_temp_files()
            log.info("Cleanup complete, removed %d temporary files.", cleaned)
        except Exception:
            log.exception("Error during scrape cycle")

        sleep_seconds = max(60, SCRAPE_INTERVAL_MINUTES * 60)
        log.info("Sleeping for %d seconds until next cycle...", sleep_seconds)
        time.sleep(sleep_seconds)

if __name__ == "__main__":
    run_loop()

