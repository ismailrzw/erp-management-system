from flask import Blueprint

from app.utils.responses import success_response

student_groups_bp = Blueprint('student_groups', __name__)

@student_groups_bp.route('/', methods=['GET'])
def get_my_group():
    return success_response("Groups endpoint working", data=[])

@student_groups_bp.route('/', methods=['POST'])
def create_group():
    return success_response("Group created", data={"id": "temp"})