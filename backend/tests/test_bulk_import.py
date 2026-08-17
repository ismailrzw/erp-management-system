from io import BytesIO

from test_students import STUDENTS_URL, create_student

CSV_HEADERS = "Name,Roll,Department,Section,Session,Course,Teacher,Recovery Email\n"


def upload_csv(client, manager_headers, contents):
    return client.post(f"{STUDENTS_URL}bulk", data={"file": (BytesIO(contents.encode()), "students.csv")}, headers=manager_headers, content_type="multipart/form-data")


def test_bulk_import_valid_csv(client, manager_headers):
    csv = CSV_HEADERS + "Ada Lovelace,2024-CS-101,CS,A,2024,PBL,Dr Turing,ada@example.com\nGrace Hopper,2024-CS-102,CS,B,2024,PBL,Dr Turing,grace@example.com\n"
    response = upload_csv(client, manager_headers, csv)
    assert response.status_code == 200, response.get_json()
    data = response.get_json()["data"]
    assert data["imported"] == 2
    assert data["skipped"] == 0
    assert data["errors"] == []


def test_bulk_import_requires_all_columns(client, manager_headers):
    csv = "Name,Roll,Department,Section,Session,Course,Teacher\nAda Lovelace,2024-CS-101,CS,A,2024,PBL,Dr Turing\n"
    response = upload_csv(client, manager_headers, csv)
    assert response.status_code == 400, response.get_json()
    assert "Missing required columns" in response.get_json()["message"]
    assert "Recovery Email" in response.get_json()["message"]


def test_bulk_import_reports_existing_roll_and_imports_other_rows(client, manager_headers):
    create_student(client, manager_headers, "2024-CS-201")
    csv = CSV_HEADERS + "Existing Student,2024-CS-201,CS,A,2024,PBL,Dr Turing,existing@example.com\nNew Student,2024-CS-202,CS,A,2024,PBL,Dr Turing,new@example.com\n"
    response = upload_csv(client, manager_headers, csv)
    assert response.status_code == 200, response.get_json()
    data = response.get_json()["data"]
    assert data["imported"] == 1
    assert data["skipped"] == 1
    assert data["errors"] == [{"row": 2, "roll": "2024-CS-201", "error": "Roll already exists."}]