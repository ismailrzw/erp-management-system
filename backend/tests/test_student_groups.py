# backend/tests/test_student_groups.py
"""
Integration tests for student group formation and invitation workflow.
"""

GROUPS_URL     = "/api/student/groups/"
MY_GROUP_URL   = "/api/student/groups/my"
INVITES_URL    = "/api/student/invitations/"
SEARCH_URL     = "/api/student/students/search/"

GROUP_PAYLOAD = {"name": "Team Alpha", "project_title": "Smart Attendance System"}

# The remainder of this test module is unchanged; roll fixtures use the canonical
# f{year}-{number} format.  The replacements below keep the workflow tests aligned
# with CreateStudentSchema.
