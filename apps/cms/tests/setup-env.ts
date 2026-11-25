// Integration tests run against a dedicated database that is wiped on every run.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://news:news@localhost:5432/news_test'
process.env.PAYLOAD_SECRET ||= 'test-secret-test-secret-test-secret-0000'
process.env.PAYLOAD_DB_PUSH = 'false' // exercise the real migrations
process.env.WEB_URL = 'http://web.test'
process.env.CMS_URL = 'http://cms.test'
delete process.env.REVALIDATE_SECRET // don't call the website from tests
process.env.CRON_SECRET = 'test-cron-secret'
