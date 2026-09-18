# backend/app/blueprints/manager/reports.py
"""
Manager Reports Blueprint & RESTX Namespace.

Endpoints:
----------
GET /api/manager/reports/groups — Export 12-column Excel (.xlsx) report for project groups
"""

from datetime import datetime
from flask import request, send_file
from flask_restx import Namespace, Resource

from app.models.user import Role
from app.services.report_service import generate_group_report_excel
from app.utils.decorators import role_required

manager_reports_ns = Namespace(
    "manager_reports", description="Manager Report Generation and Exports"
)


@manager_reports_ns.route("/groups")
class ManagerGroupReportExport(Resource):
    @manager_reports_ns.doc(security="Bearer Auth")
    @role_required(Role.MANAGER)
    def get(self):
        """
        Download 12-column Excel (.xlsx) report of project groups.
        Supports optional filtering by department, course, and status.
        """
        dept = request.args.get("dept")
        course = request.args.get("course")
        status = request.args.get("status")

        try:
            excel_stream = generate_group_report_excel(dept=dept, course=course, status=status)
            filename = f"group_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
            return send_file(
                excel_stream,
                mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                as_attachment=True,
                download_name=filename,
            )
        except Exception as exc:  # noqa: BLE001
            return {"success": False, "message": str(exc)}, 500
