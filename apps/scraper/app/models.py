from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

class ExtractionStatus(BaseModel):
    title: str = "success"
    description: str = "success"
    image: str = "success"
    content: str = "success"

class ArticleOut(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)
    id: str
    source_id: Optional[str] = "unknown"
    source_name: Optional[str] = "Unknown"
    source_url: str
    canonical_url: Optional[str] = None
    title: str
    description: Optional[str] = None
    summary: Optional[str] = None
    content: Optional[str] = None
    image_url: Optional[str] = None
    image_alt: Optional[str] = None
    author: Optional[str] = None
    category: str = "general"
    tags: List[str] = Field(default_factory=list)
    published_at: Optional[datetime] = None
    fetched_at: Optional[datetime] = None
    collected_at: Optional[datetime] = None
    status: str = "needs_review"
    extraction_status: Dict[str, str] = Field(default_factory=dict)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    last_edited_by: Optional[str] = None

class ArticleUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    content: Optional[str] = None
    image_url: Optional[str] = None
    image_alt: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    author: Optional[str] = None
    status: Optional[str] = None

class ArticleStatusUpdate(BaseModel):
    status: str
    notes: Optional[str] = None

class SourceFeed(BaseModel):
    url: str
    category: str = "general"

class SourceConfig(BaseModel):
    source_id: str
    display_name: str
    enabled: bool = True
    polling_interval_minutes: int = 5
    page_limit: int = 0
    request_timeout_seconds: int = 20
    extraction_mode: str = "rss_metadata_web"
    feeds: List[SourceFeed] = Field(default_factory=list)
    last_run_at: Optional[datetime] = None
    next_run_at: Optional[datetime] = None

class SourceUpdate(BaseModel):
    display_name: Optional[str] = None
    enabled: Optional[bool] = None
    polling_interval_minutes: Optional[int] = None
    page_limit: Optional[int] = None
    request_timeout_seconds: Optional[int] = None
    extraction_mode: Optional[str] = None
    feeds: Optional[List[Dict[str, str]]] = None

class AuditLogOut(BaseModel):
    id: str
    actor_id: str
    action: str
    entity_type: str
    entity_id: str
    details: Optional[Dict[str, Any]] = None
    timestamp: datetime

class LoginRequest(BaseModel):
    username: Optional[str] = None
    identifier: Optional[str] = None
    password: str

class CreateUserRequest(BaseModel):
    username: str
    password: str
    role: str = "editor"
    display_name: Optional[str] = None

class NewsletterSubscribeRequest(BaseModel):
    email: str
    source: Optional[str] = "website"

class OtpRequest(BaseModel):
    email: str

class OtpVerifyRequest(BaseModel):
    email: str
    otp: str

class BacklinkSubmission(BaseModel):
    email: str
    website_title: str
    website_url: str
    anchor_text: str
    category: str = "general"
    description: Optional[str] = None

class ForumPostSubmission(BaseModel):
    email: str
    title: str
    content: str
    target_url: str
    anchor_text: str
    category: str = "general"
    custom_category: Optional[str] = None
    image_url: Optional[str] = None

class ApprovalAction(BaseModel):
    id: str
    action: str  # "approve" or "reject"
    admin_notes: Optional[str] = None
    schedule_delay_minutes: Optional[int] = 0  # 0 for immediate, 15 for 15m delay


