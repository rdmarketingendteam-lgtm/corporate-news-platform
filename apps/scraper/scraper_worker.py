# GitHub Actions entrypoint: one scrape execution, then exit.
from app.database import initialize_database
from app.services.collector import collect_news, cleanup_temp_files

if __name__ == "__main__":
    initialize_database()
    print({"scrape": collect_news(), "removed_temp_files": cleanup_temp_files()})
