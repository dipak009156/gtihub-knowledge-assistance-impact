from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_github_auth_url():
    response = client.get("/api/auth/github/url")
    assert response.status_code == 200
    data = response.json()
    assert "configured" in data


def test_register_and_login_flow():
    reg_payload = {
        "name": "Grace Hopper",
        "email": "grace@navy.mil",
        "password": "supersecretpassword",
    }
    reg_resp = client.post("/api/auth/register", json=reg_payload)
    assert reg_resp.status_code == 200
    reg_data = reg_resp.json()
    assert reg_data["user"]["email"] == "grace@navy.mil"
    assert "token" in reg_data

    login_payload = {
        "email": "grace@navy.mil",
        "password": "supersecretpassword",
    }
    login_resp = client.post("/api/auth/login", json=login_payload)
    assert login_resp.status_code == 200
    login_data = login_resp.json()
    assert login_data["user"]["name"] == "Grace Hopper"

    # Verify /me endpoint with bearer token
    token = login_data["token"]
    me_resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == "grace@navy.mil"


def test_github_user_login():
    mock_gh_profile = {
        "login": "octocat",
        "id": 583231,
        "name": "The Octocat",
        "email": "octocat@github.com",
        "avatar_url": "https://avatars.githubusercontent.com/u/583231?v=4",
    }
    with patch("app.auth.router._call_github_api", return_value=mock_gh_profile):
        resp = client.post("/api/auth/github/user", json={"username": "octocat"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["user"]["username"] == "octocat"
        assert data["user"]["name"] == "The Octocat"
        assert "token" in data
