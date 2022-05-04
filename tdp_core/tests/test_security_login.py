from typing import Dict

from fastapi.testclient import TestClient

from tdp_core import manager
from tdp_core.security.model import User


def test_api_key(client: TestClient):
    assert client.get("/loggedinas", headers={"apiKey": "invalid_user:password"}).json() == '"not_yet_logged_in"'
    assert client.get("/loggedinas", headers={"apiKey": "admin:admin"}).json()["name"] == "admin"


def test_basic_authorization(client: TestClient):
    assert client.get("/loggedinas", auth=("invalid_user", "password")).json() == '"not_yet_logged_in"'
    assert client.get("/loggedinas", auth=("admin", "admin")).json()["name"] == "admin"


def test_jwt_login(client: TestClient):
    # Add additional claims loaders
    @manager.security.jwt_claims_loader
    def claims_loader_1(user: User):
        return {"hello": "world"}

    @manager.security.jwt_claims_loader
    def claims_loader_2(user: User):
        return {"username": user.name}

    # Check if we are actually not logged in
    response = client.get("/loggedinas")
    assert response.status_code == 200
    assert response.json() == '"not_yet_logged_in"'

    # Login with the dummy user
    response = client.post("/login", data={"username": "admin", "password": "admin"})
    assert response.status_code == 200
    user: Dict = response.json()
    assert user["name"] == "admin"
    assert user["roles"] == ["admin"]
    assert user["payload"]["hello"] == "world"
    assert user["payload"]["username"] == "admin"

    # Check if we are logged in and get the same response as from the login
    response = client.get("/loggedinas")
    assert response.status_code == 200
    assert user == response.json()
    assert (
        client.cookies.get(manager.settings.jwt_access_cookie_name) == user["access_token"]
    )  # Access token is equal in response and cookies

    # Now, we set the timeout to refresh artificially high to force a jwt refresh
    original_jwt_refresh_if_expiring_in_seconds = manager.settings.jwt_refresh_if_expiring_in_seconds
    manager.settings.jwt_refresh_if_expiring_in_seconds = manager.settings.jwt_expire_in_seconds + 5

    # Check if we are still logged in and get the same response as the refresh happens *after* the request
    assert user == client.get("/loggedinas").json()
    assert (
        client.cookies.get(manager.settings.jwt_access_cookie_name) != user["access_token"]
    )  # Access token is different in response and cookies

    # Restore the original jwt refresh timeout
    manager.settings.jwt_refresh_if_expiring_in_seconds = original_jwt_refresh_if_expiring_in_seconds

    # Check if we are logged in and get a different response as the cookie was auto-refreshed in the last request
    refreshed_user = client.get("/loggedinas").json()
    assert user["name"] == refreshed_user["name"]  # Same user
    assert user["access_token"] != refreshed_user["access_token"]  # But different token
    assert user["payload"]["exp"] < refreshed_user["payload"]["exp"]  # With longer expiry date
    assert (
        client.cookies.get(manager.settings.jwt_access_cookie_name) == refreshed_user["access_token"]
    )  # Access token is equal in new response and cookies

    # Logout
    response = client.post("/logout")
    assert response.status_code == 200

    # Check if we are actually not logged in anymore
    response = client.get("/loggedinas")
    assert response.status_code == 200
    assert response.json() == '"not_yet_logged_in"'
