# backend/app/blueprints/manager/evaluators.py
"""
Manager Evaluators Management Blueprint & RESTX Namespace.
Project evaluators (Internal / External).
"""

from flask import request
from flask_jwt_extended import get_jwt_identity
from flask_restx import Namespace, Resource, fields, inputs
from marshmallow import ValidationError

from app.extensions import mongo
from app.models.teacher import EvaluatorType
from app.models.user import Role
from app.schemas.teacher_schema import CreateEvaluatorSchema, UpdateEvaluatorSchema
from app.services.evaluator_service import (
    create_evaluator,
    get_evaluator_by_id,
    list_evaluators,
    permanent_delete_evaluator,
    restore_evaluator,
    soft_delete_evaluator,
    update_evaluator,
    update_evaluator_domains,
)
from app.utils.audit import log_audit
from app.utils.decorators import role_required

evaluators_ns = Namespace("manager_evaluators", description="Manager Project Evaluator operations")

# ── Swagger models ──────────────────────────────────────────
evaluator_model = evaluators_ns.model("Evaluator", {
    "id":             fields.String(readonly=True),
    "name":           fields.String(required=True),
    "email":          fields.String(required=True),
    "dept":           fields.String(required=True),
    "evaluator_type": fields.String(required=True, enum=EvaluatorType.ALL),
    "domains":        fields.List(fields.String(), description="Expertise domains"),
    "assigned_groups_count": fields.Integer(readonly=True),
    "deleted":        fields.Boolean(readonly=True),
    "created_at":     fields.String(readonly=True),
})
create_evaluator_model = evaluators_ns.model("EvaluatorCreate", {
    "name":           fields.String(required=True),
    "email":          fields.String(required=True),
    "dept":           fields.String(required=True),
    "evaluator_type": fields.String(required=True, enum=EvaluatorType.ALL),
    "domains":        fields.List(fields.String(), required=False),
})
update_evaluator_model = evaluators_ns.model("EvaluatorUpdate", {
    "name":           fields.String(required=False),
    "dept":           fields.String(required=False),
    "evaluator_type": fields.String(required=False, enum=EvaluatorType.ALL),
    "domains":        fields.List(fields.String(), required=False),
})

list_parser = evaluators_ns.parser()
list_parser.add_argument("deleted",        type=inputs.boolean, default=False, location="args")
list_parser.add_argument("dept",           type=str, required=False, location="args")
list_parser.add_argument("evaluator_type", type=str, required=False, location="args")


@evaluators_ns.route("/")
class EvaluatorList(Resource):
    @evaluators_ns.doc(security="Bearer Auth")
    @evaluators_ns.expect(list_parser)
    @role_required(Role.MANAGER)
    def get(self):
        """List all project evaluators. Use ?deleted=true for recycle bin."""
        args = list_parser.parse_args()
        items = list_evaluators(
            deleted=args["deleted"],
            dept=args.get("dept"),
            evaluator_type=args.get("evaluator_type"),
        )
        return {
            "success": True,
            "message": "Evaluators retrieved.",
            "data": {"items": items, "total": len(items)},
        }, 200

    @evaluators_ns.doc(security="Bearer Auth")
    @evaluators_ns.expect(create_evaluator_model)
    @role_required(Role.MANAGER)
    def post(self):
        """Add a new project evaluator. Password is auto-generated."""
        try:
            payload = CreateEvaluatorSchema().load(request.get_json() or {})
        except ValidationError as exc:
            return {"success": False, "message": "Validation failed.", "errors": exc.messages}, 422

        try:
            evaluator = create_evaluator(
                name=payload["name"],
                email=payload["email"],
                dept=payload["dept"],
                evaluator_type=payload["evaluator_type"],
                domains=payload.get("domains"),
                company_name=payload.get("company_name", ""), post=payload.get("post", ""),
            )
        except ValueError as exc:
            return {"success": False, "message": str(exc)}, 409

        log_audit(
            mongo.db, get_jwt_identity(), Role.MANAGER, "evaluators", "create",
            target_id=evaluator["id"], new_value=evaluator,
        )
        return {"success": True, "message": "Evaluator added successfully.", "data": evaluator}, 201


@evaluators_ns.route("/<string:evaluator_id>")
@evaluators_ns.param("evaluator_id", "MongoDB evaluator ID")
class EvaluatorDetail(Resource):
    @evaluators_ns.doc(security="Bearer Auth")
    @role_required(Role.MANAGER)
    def get(self, evaluator_id):
        """Get single evaluator by ID."""
        evaluator = get_evaluator_by_id(evaluator_id)
        if evaluator is None:
            return {"success": False, "message": "Evaluator not found."}, 404
        return {"success": True, "data": evaluator}, 200

    @evaluators_ns.doc(security="Bearer Auth")
    @evaluators_ns.expect(update_evaluator_model)
    @role_required(Role.MANAGER)
    def put(self, evaluator_id):
        """Update evaluator details (name, dept, evaluator_type, domains)."""
        raw_body = request.get_json() or {}

        try:
            payload = UpdateEvaluatorSchema().load(raw_body)
        except ValidationError as exc:
            return {"success": False, "message": "Validation failed.", "errors": exc.messages}, 422

        if raw_body and not payload:
            return {
                "success": False,
                "message": "No updatable fields provided. Note: email is immutable.",
            }, 422

        try:
            evaluator = update_evaluator(
                evaluator_id,
                name=payload.get("name"),
                dept=payload.get("dept"),
                evaluator_type=payload.get("evaluator_type"),
                domains=payload.get("domains"),
            company_name=payload.get("company_name"), post=payload.get("post"),
            )
        except ValueError as exc:
            return {"success": False, "message": str(exc)}, 422
        except Exception as exc:  # noqa: BLE001
            return {"success": False, "message": str(exc)}, 500

        if evaluator is None:
            return {"success": False, "message": "Evaluator not found."}, 404

        log_audit(
            mongo.db, get_jwt_identity(), Role.MANAGER, "evaluators", "update",
            target_id=evaluator_id, new_value=evaluator,
        )
        return {"success": True, "message": "Evaluator updated.", "data": evaluator}, 200

    @evaluators_ns.doc(security="Bearer Auth")
    @role_required(Role.MANAGER)
    def delete(self, evaluator_id):
        """Soft-delete an evaluator (moves to recycle bin)."""
        try:
            evaluator = soft_delete_evaluator(evaluator_id)
        except ValueError as exc:
            return {"success": False, "message": str(exc)}, getattr(exc, "status_code", 400)
        if evaluator is None:
            return {"success": False, "message": "Evaluator not found."}, 404
        log_audit(
            mongo.db, get_jwt_identity(), Role.MANAGER, "evaluators", "delete",
            target_id=evaluator_id, old_value=evaluator,
        )
        return {"success": True, "message": "Evaluator moved to recycle bin.", "data": {"deleted": True, "evaluator_id": evaluator_id}}, 200


@evaluators_ns.route("/<string:evaluator_id>/restore")
@evaluators_ns.param("evaluator_id", "MongoDB evaluator ID")
class EvaluatorRestore(Resource):
    @evaluators_ns.doc(security="Bearer Auth")
    @role_required(Role.MANAGER)
    def post(self, evaluator_id):
        """Restore a soft-deleted evaluator."""
        try:
            evaluator = restore_evaluator(evaluator_id)
        except ValueError as exc:
            return {"success": False, "message": str(exc)}, getattr(exc, "status_code", 409)
        if evaluator is None:
            return {"success": False, "message": "Evaluator not found."}, 404
        log_audit(
            mongo.db, get_jwt_identity(), Role.MANAGER, "evaluators", "restore",
            target_id=evaluator_id, new_value=evaluator,
        )
        return {"success": True, "message": "Evaluator restored.", "data": {"restored": True, "evaluator_id": evaluator_id}}, 200


@evaluators_ns.route("/<string:evaluator_id>/permanent")
@evaluators_ns.param("evaluator_id", "MongoDB evaluator ID")
class EvaluatorPermanentDelete(Resource):
    @evaluators_ns.doc(security="Bearer Auth")
    @role_required(Role.MANAGER)
    def delete(self, evaluator_id):
        """Permanently delete an evaluator."""
        try:
            evaluator = permanent_delete_evaluator(evaluator_id)
        except ValueError as exc:
            return {"success": False, "message": str(exc)}, getattr(exc, "status_code", 400)
        if evaluator is None:
            return {"success": False, "message": "Evaluator not found."}, 404
        log_audit(
            mongo.db, get_jwt_identity(), Role.MANAGER, "evaluators", "permanent_delete",
            target_id=evaluator_id, old_value=evaluator,
        )
        return {"success": True, "message": "Evaluator permanently deleted.", "data": {"deleted": True, "evaluator_id": evaluator_id}}, 200


@evaluators_ns.route("/<string:evaluator_id>/domains")
@evaluators_ns.param("evaluator_id", "MongoDB evaluator ID")
class EvaluatorDomains(Resource):
    @evaluators_ns.doc(security="Bearer Auth")
    @role_required(Role.MANAGER)
    def put(self, evaluator_id):
        """Update evaluator domains."""
        try:
            body = request.get_json() or {}
            domains = body.get("domains", [])
            result = update_evaluator_domains(evaluator_id, domains)
            return {"success": True, "message": "Domains updated.", "data": result}, 200
        except ValueError as exc:
            return {"success": False, "message": str(exc)}, 400
        except Exception as exc:  # noqa: BLE001
            return {"success": False, "message": str(exc)}, 500


@evaluators_ns.route("/<string:evaluator_id>/resend-activation")
class EvaluatorActivation(Resource):
    @role_required(Role.MANAGER)
    def post(self, evaluator_id):
        from app.services.evaluator_service import send_activation
        try:
            sent = send_activation(evaluator_id)
            return {"success": True, "message": "Activation sent." if sent else "Delivery failed. Retry sending activation.", "data": {"email_sent": sent}}, 200
        except ValueError as exc:
            return {"success": False, "message": str(exc)}, 400
