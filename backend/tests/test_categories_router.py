from fastapi.testclient import TestClient

from app.main import app


def test_categories_route_requires_authentication() -> None:
    client = TestClient(app)

    response = client.get("/api/v1/categories")

    assert response.status_code == 401
    assert response.json() == {"detail": "Authentication is required"}


def test_categories_create_route_requires_authentication() -> None:
    client = TestClient(app)

    response = client.post(
        "/api/v1/categories",
        json={"name": "Coffee", "icon": "☕"},
    )

    assert response.status_code == 401
    assert response.json() == {"detail": "Authentication is required"}
