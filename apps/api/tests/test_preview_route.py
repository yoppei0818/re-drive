import pytest
from httpx import ASGITransport, AsyncClient

from re_drive_api.main import app


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"


@pytest.mark.anyio
async def test_preview_route_returns_loop_around_origin() -> None:
    origin = {"latitude": 35.6812, "longitude": 139.7671}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/v1/routes/preview", json={"origin": origin})

    assert response.status_code == 200
    coordinates = response.json()["coordinates"]
    assert len(coordinates) == 6
    assert coordinates[0] == origin
    assert coordinates[-1] == origin
    assert coordinates[1] == pytest.approx({"latitude": 35.6837, "longitude": 139.7681})


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
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/v1/routes/preview", json={"origin": origin})

    assert response.status_code == 422
