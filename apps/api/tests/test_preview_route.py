import pytest
from httpx import ASGITransport, AsyncClient

from re_drive_api.clients.google_routes import (
    GoogleRoutesResponseError,
    GoogleRoutesTimeoutError,
)
from re_drive_api.main import app
from re_drive_api.routes.preview_plan import Coordinate, PreviewRoutePlan
from re_drive_api.routes.router import get_google_routes_client


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"


class StubGoogleRoutesClient:
    def __init__(
        self,
        coordinates: list[Coordinate] | None = None,
        error: Exception | None = None,
    ) -> None:
        self.coordinates = coordinates or []
        self.error = error
        self.received_plan: PreviewRoutePlan | None = None

    async def compute_route(self, plan: PreviewRoutePlan) -> list[Coordinate]:
        self.received_plan = plan
        if self.error:
            raise self.error
        return self.coordinates


@pytest.fixture(autouse=True)
def clear_dependency_overrides() -> None:
    yield
    app.dependency_overrides.clear()


@pytest.mark.anyio
async def test_preview_route_returns_google_route_in_existing_response_format() -> None:
    origin = {"latitude": 35.6812, "longitude": 139.7671}
    routes_client = StubGoogleRoutesClient(
        coordinates=[
            Coordinate(latitude=35.6812, longitude=139.7671),
            Coordinate(latitude=35.69, longitude=139.78),
            Coordinate(latitude=35.6812, longitude=139.7671),
        ]
    )
    app.dependency_overrides[get_google_routes_client] = lambda: routes_client

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/v1/routes/preview", json={"origin": origin})

    assert response.status_code == 200
    body = response.json()
    assert body["coordinates"] == [
        origin,
        {"latitude": 35.69, "longitude": 139.78},
        origin,
    ]
    assert body["google_maps_url"].startswith("https://www.google.com/maps/dir/?api=1")
    assert routes_client.received_plan is not None
    assert routes_client.received_plan.origin == Coordinate(**origin)
    assert routes_client.received_plan.destination == Coordinate(**origin)
    assert len(routes_client.received_plan.intermediates) == 3


@pytest.mark.anyio
@pytest.mark.parametrize(
    "origin",
    [
        {"latitude": 91, "longitude": 139.7671},
        {"latitude": 35.6812, "longitude": 181},
        {"latitude": "invalid", "longitude": 139.7671},
    ],
)
async def test_preview_route_rejects_invalid_origin(origin: dict[str, object]) -> None:
    app.dependency_overrides[get_google_routes_client] = lambda: StubGoogleRoutesClient()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/v1/routes/preview", json={"origin": origin})

    assert response.status_code == 422


@pytest.mark.anyio
@pytest.mark.parametrize(
    ("error", "expected_status"),
    [
        (GoogleRoutesTimeoutError(), 504),
        (GoogleRoutesResponseError(), 502),
    ],
)
async def test_preview_route_converts_google_failure_to_http_error(
    error: Exception,
    expected_status: int,
) -> None:
    app.dependency_overrides[get_google_routes_client] = lambda: StubGoogleRoutesClient(
        error=error
    )

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/api/v1/routes/preview",
            json={"origin": {"latitude": 35.6812, "longitude": 139.7671}},
        )

    assert response.status_code == expected_status
    assert "Google" not in response.text


@pytest.mark.anyio
async def test_preview_route_returns_service_unavailable_without_api_key(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("GOOGLE_MAPS_API_KEY", raising=False)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/api/v1/routes/preview",
            json={"origin": {"latitude": 35.6812, "longitude": 139.7671}},
        )

    assert response.status_code == 503
