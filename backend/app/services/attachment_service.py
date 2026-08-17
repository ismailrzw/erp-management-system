"""File-system and MongoDB operations for manager attachments."""

from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from bson import ObjectId
from werkzeug.datastructures import FileStorage
from werkzeug.utils import secure_filename

from app.extensions import mongo
from app.models.attachment import COLLECTION, AttachmentFields

MAX_FILE_SIZE = 10 * 1024 * 1024
ALLOWED_EXTENSIONS = {"pdf", "docx", "xlsx", "zip"}
UPLOAD_DIRECTORY = Path(__file__).resolve().parents[2] / "uploads"


def _serialize(document: dict | None) -> dict | None:
    if document is None:
        return None
    result = dict(document)
    result["id"] = str(result.pop(AttachmentFields.ID))
    result.pop(AttachmentFields.FILE_PATH, None)
    for key, value in result.items():
        if isinstance(value, datetime):
            result[key] = value.isoformat()
    return result


def _object_id(attachment_id: str) -> ObjectId:
    if not ObjectId.is_valid(attachment_id):
        raise ValueError("Invalid attachment ID.")
    return ObjectId(attachment_id)


def _validate_file(file: FileStorage) -> tuple[str, int]:
    if not file or not file.filename:
        raise ValueError("A file is required.")
    filename = secure_filename(file.filename)
    if not filename or "." not in filename:
        raise ValueError("File must have an allowed extension.")
    extension = filename.rsplit(".", 1)[1].lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise ValueError("Allowed file types are: PDF, DOCX, XLSX, and ZIP.")

    stream = file.stream
    stream.seek(0, 2)
    size = stream.tell()
    stream.seek(0)
    if size == 0:
        raise ValueError("The uploaded file is empty.")
    if size > MAX_FILE_SIZE:
        raise ValueError("File size must not exceed 10 MB.")
    return filename, size


def upload_attachment(file: FileStorage, title: str, uploaded_by: str) -> dict:
    """Persist an allowed upload and create its metadata document."""
    filename, size = _validate_file(file)
    title = title.strip()
    if not title:
        raise ValueError("Title is required.")

    UPLOAD_DIRECTORY.mkdir(parents=True, exist_ok=True)
    stored_filename = f"{uuid4().hex}_{filename}"
    path = UPLOAD_DIRECTORY / stored_filename
    now = datetime.now(timezone.utc)
    document = {
        AttachmentFields.TITLE: title,
        AttachmentFields.ORIGINAL_FILENAME: filename,
        AttachmentFields.STORED_FILENAME: stored_filename,
        AttachmentFields.FILE_PATH: str(path),
        AttachmentFields.MIME_TYPE: file.mimetype or "application/octet-stream",
        AttachmentFields.SIZE: size,
        AttachmentFields.UPLOADED_BY: uploaded_by,
        AttachmentFields.UPLOADED_AT: now,
        AttachmentFields.UPDATED_AT: now,
    }

    try:
        file.save(path)
        result = mongo.db[COLLECTION].insert_one(document)
    except Exception:
        path.unlink(missing_ok=True)
        raise

    document[AttachmentFields.ID] = result.inserted_id
    document[AttachmentFields.FILE_URL] = f"/api/manager/attachments/{result.inserted_id}/download"
    mongo.db[COLLECTION].update_one(
        {AttachmentFields.ID: result.inserted_id},
        {"$set": {AttachmentFields.FILE_URL: document[AttachmentFields.FILE_URL]}},
    )
    return _serialize(document)


def list_attachments() -> list[dict]:
    documents = mongo.db[COLLECTION].find().sort(AttachmentFields.UPLOADED_AT, -1)
    return [_serialize(document) for document in documents]


def get_attachment_by_id(attachment_id: str) -> dict | None:
    return _serialize(mongo.db[COLLECTION].find_one({AttachmentFields.ID: _object_id(attachment_id)}))


def update_attachment(attachment_id: str, title: str) -> dict | None:
    result = mongo.db[COLLECTION].find_one_and_update(
        {AttachmentFields.ID: _object_id(attachment_id)},
        {"$set": {AttachmentFields.TITLE: title.strip(), AttachmentFields.UPDATED_AT: datetime.now(timezone.utc)}},
        return_document=True,
    )
    return _serialize(result)


def delete_attachment(attachment_id: str) -> dict | None:
    """Remove the metadata document, then its managed file if present."""
    document = mongo.db[COLLECTION].find_one_and_delete({AttachmentFields.ID: _object_id(attachment_id)})
    if document is None:
        return None
    path = Path(document[AttachmentFields.FILE_PATH]).resolve()
    uploads_root = UPLOAD_DIRECTORY.resolve()
    if uploads_root in path.parents:
        path.unlink(missing_ok=True)
    return _serialize(document)


def download_attachment(attachment_id: str) -> tuple[Path, str] | None:
    document = mongo.db[COLLECTION].find_one({AttachmentFields.ID: _object_id(attachment_id)})
    if document is None:
        return None
    path = Path(document[AttachmentFields.FILE_PATH]).resolve()
    if UPLOAD_DIRECTORY.resolve() not in path.parents or not path.is_file():
        raise FileNotFoundError("Attachment file is unavailable.")
    return path, document[AttachmentFields.ORIGINAL_FILENAME]
