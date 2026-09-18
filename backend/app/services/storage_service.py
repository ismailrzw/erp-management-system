import os
from datetime import datetime, timezone

from werkzeug.utils import secure_filename

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "uploads")
ALLOWED_EXTENSIONS = {"pdf", "docx", "xlsx", "zip"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


def upload_file(file, subfolder: str = "submissions") -> str:
    """
    Saves file to uploads/<subfolder>/. Returns the relative URL path.
    Raises ValueError for invalid file type or size.
    """
    if not file or not file.filename:
        raise ValueError("No file provided.")

    extension = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if extension not in ALLOWED_EXTENSIONS:
        raise ValueError(
            f"File type '.{extension}' is not allowed. Accepted: {', '.join(ALLOWED_EXTENSIONS)}."
        )

    file_bytes = file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise ValueError(f"File size exceeds 10 MB limit ({len(file_bytes) / 1024 / 1024:.1f} MB).")
    file.stream.seek(0)  # Reset stream so we can save it

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    safe_name = secure_filename(file.filename)
    filename = f"{timestamp}_{safe_name}"

    save_dir = os.path.join(UPLOAD_DIR, subfolder)
    os.makedirs(save_dir, exist_ok=True)
    file.save(os.path.join(save_dir, filename))

    return f"/uploads/{subfolder}/{filename}"
