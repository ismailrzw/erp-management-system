# backend/app/models/group.py
COLLECTION = "groups"

class Status:
    PENDING  = "pending"
    APPROVED = "approved"
    DELETED  = "deleted"

class Field:
    ID           = "_id"
    NAME         = "name"
    PROJECT_TITLE = "project_title"
    COURSE       = "course"
    DEPT         = "dept"
    SECTION      = "section"
    LEADER_ID    = "leader_id"
    MEMBER_IDS   = "member_ids"
    STATUS       = "status"
    EVALUATED    = "evaluated"
    VERSION      = "version"
    CREATED_AT   = "created_at"
    UPDATED_AT   = "updated_at"