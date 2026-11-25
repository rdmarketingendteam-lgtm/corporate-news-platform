from datetime import datetime, timezone
import logging
from app.database import audit_logs

log = logging.getLogger(__name__)

def log_audit(actor_id: str, action: str, entity_type: str, entity_id: str, details: dict = None):
    try:
        doc = {
            "actor_id": actor_id or "admin",
            "action": action,
            "entity_type": entity_type,
            "entity_id": str(entity_id),
            "details": details or {},
            "timestamp": datetime.now(timezone.utc)
        }
        audit_logs.insert_one(doc)
    except Exception as e:
        log.warning("Failed to record audit log: %s", e)
