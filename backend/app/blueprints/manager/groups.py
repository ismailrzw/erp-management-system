from flask import Blueprint

from app.utils.responses import success_response

manager_groups_bp = Blueprint('manager_groups', __name__)

@manager_groups_bp.route('/', methods=['GET'])
def get_all_groups():
    return success_response("All groups", data=[])

@manager_groups_bp.route('/<group_id>/approve', methods=['POST'])
def approve_group(group_id):
    return success_response("Group approved", data={"id": group_id})