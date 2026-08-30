from io import BytesIO

ATTACHMENTS_URL = "/api/manager/attachments/"


def upload(client, headers, filename="brief.pdf", content=b"%PDF-1.4 test", title="Project brief"):
    return client.post(ATTACHMENTS_URL, data={"title": title, "file": (BytesIO(content), filename)}, headers=headers, content_type="multipart/form-data")


def test_manager_can_upload_pdf(client, manager_headers):
    response = upload(client, manager_headers)
    assert response.status_code == 201, response.get_json()
    data = response.get_json()["data"]
    assert data["title"] == "Project brief"
    assert data["original_filename"] == "brief.pdf"
    assert data["size"] == len(b"%PDF-1.4 test")
    assert data["file_url"].endswith(f"/{data['id']}/download")


def test_upload_rejects_disallowed_extension(client, manager_headers):
    response = upload(client, manager_headers, filename="malware.exe", content=b"not executable")
    assert response.status_code == 400, response.get_json()
    assert "Allowed file types" in response.get_json()["message"]


def test_upload_rejects_file_larger_than_ten_mb(client, manager_headers):
    response = upload(client, manager_headers, content=b"x" * (10 * 1024 * 1024 + 1))
    assert response.status_code == 400, response.get_json()
    assert response.get_json()["message"] == "File size must not exceed 10 MB."


def test_manager_can_list_attachments(client, manager_headers):
    upload(client, manager_headers)
    response = client.get(ATTACHMENTS_URL, headers=manager_headers)
    assert response.status_code == 200, response.get_json()
    assert len(response.get_json()) == 1
    assert response.get_json()[0]["original_filename"] == "brief.pdf"


def test_student_can_list_and_download_attachments(client, manager_headers, student_headers):
    created = upload(client, manager_headers).get_json()["data"]
    listed = client.get(ATTACHMENTS_URL, headers=student_headers)
    assert listed.status_code == 200, listed.get_json()
    assert listed.get_json()[0]["id"] == created["id"]
    downloaded = client.get(f"{ATTACHMENTS_URL}{created['id']}/download", headers=student_headers)
    assert downloaded.status_code == 200
    assert downloaded.data == b"%PDF-1.4 test"
    assert "attachment" in downloaded.headers["Content-Disposition"]


def test_student_cannot_upload_or_delete_attachments(client, manager_headers, student_headers):
    created = upload(client, manager_headers).get_json()["data"]
    denied_upload = upload(client, student_headers)
    assert denied_upload.status_code == 403, denied_upload.get_json()
    denied_delete = client.delete(f"{ATTACHMENTS_URL}{created['id']}", headers=student_headers)
    assert denied_delete.status_code == 403, denied_delete.get_json()
