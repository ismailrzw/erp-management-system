from flask import jsonify

def success_response(message="Success", data=None, status=200):
    return jsonify({"success": True, "message": message, "data": data}), status

def error_response(message="Something went wrong", status=400, errors=None):
    return jsonify({"success": False, "message": message, "errors": errors}), status