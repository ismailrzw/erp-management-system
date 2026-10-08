"""Exhibition endpoints are retired; historical evaluation data must survive."""
import pytest

from app.extensions import mongo


@pytest.mark.parametrize("method", ["GET", "POST", "PUT", "DELETE"])
def test_exhibition_api_retired(client, evaluator_headers, method):
    mongo.db.exhibition_evaluations.insert_one({"legacy": True})
    response = client.open("/api/evaluator/exhibition", method=method, json={} if method != "GET" else None, headers=evaluator_headers)
    assert response.status_code == 404
    assert mongo.db.exhibition_evaluations.count_documents({"legacy": True}) == 1
