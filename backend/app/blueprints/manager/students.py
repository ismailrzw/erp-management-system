from flask import request, Blueprint
from app.utils.responses import success_response, error_response

students_bp = Blueprint('students', __name__)

@students_bp.route('/', methods=['GET'])
def get_students():
    # Placeholder - will be implemented later
    return success_response("Students endpoint working", data=[])

@students_bp.route('/', methods=['POST'])
def create_student():
    # Placeholder
    return success_response("Student created", data={"id": "temp"})