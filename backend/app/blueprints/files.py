"""Authenticated submission downloads, including compatible legacy storage paths."""

from pathlib import Path

from flask import Blueprint, send_file
from flask_jwt_extended import get_jwt_identity

from app.extensions import mongo
from app.services.attachment_service import download_attachment
from app.services.milestone_service import (
    WorkflowError,
    authorize_group,
    current_user,
    oid,
)
from app.utils.decorators import role_required
from app.utils.responses import error_response

files_bp = Blueprint("files", __name__)


@files_bp.route("/submissions/<submission_id>")
@role_required("student", "teacher", "evaluator", "pbl_manager")
def submission_download(submission_id):
    try:
        user = current_user(get_jwt_identity())
        submission = mongo.db.submissions.find_one({"_id": oid(submission_id)})
        if not submission:
            raise WorkflowError("Submission not found.", 404)
        group = mongo.db.groups.find_one({"_id": oid(submission["group_id"]), "status": {"$ne": "deleted"}})
        if not group:
            raise WorkflowError("Group not found.", 404)
        authorize_group(user, group)
        if submission.get("attachment_id"):
            result = download_attachment(str(submission["attachment_id"]))
            if not result:
                raise WorkflowError("Submission file is unavailable.", 404)
            path, name = result
        else:
            root = Path(__file__).resolve().parents[2] / "uploads"
            relative = str(submission.get("file_url", "")).removeprefix("/uploads/")
            path = (root / relative).resolve()
            if not path.is_relative_to(root.resolve()):
                raise WorkflowError("Invalid submission storage reference.", 404)
            name = submission.get("file_name", path.name)
        return send_file(path, as_attachment=True, download_name=name)
    except ValueError as exc:
        return error_response(str(exc), getattr(exc, "status_code", 400))
    except FileNotFoundError:
        return error_response("Submission file is unavailable.", 404)
