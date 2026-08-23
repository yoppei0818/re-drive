import json

import httpx
import pytest

from re_drive_api.google_routes import (
    COMPUTE_ROUTES_URL,
    Coordinate,
    GoogleRoutesClient,
    GoogleRoutesResponseError,
    GoogleRoutesTimeoutError,
    decode_polyline,
)


def test_decode_polyline_decodes_google_reference_example() -> None:
    assert decode_polyline("_p~iF~ps|U_ulLnnqC_mqNvxq`@") == [
        Coordinate(latitude=38.5, longitude=-120.2),
        Coordinate(latitude=40.7, longitude=-120.95),
        Coordinate(latitude=43.252, longitude=-126.453),
    ]


@pytest.mark.parametrize("encoded_polyline", ["_", "!", "~~~~~~~"])
def test_decode_polyline_rejects_invalid_input(encoded_polyline: str) -> None:
    with pytest.raises(ValueError):
        decode_polyline(encoded_polyline)


@pytest.mark.anyio
async def test_compute_preview_route_sends_loop_request_and_decodes_response() -> None:
    async def handler(request: httpx.Request) -> httpx.Response:
        assert str(request.url) == COMPUTE_ROUTES_URL
        assert request.headers["X-Goog-Api-Key"] == "test-api-key"
        assert request.headers["X-Goog-FieldMask"] == "routes.polyline.encodedPolyline"

        body = json.loads(request.content)
        assert body["origin"] == body["destination"]
        assert len(body["intermediates"]) == 3
        assert body["travelMode"] == "DRIVE"
        assert body["routingPreference"] == "TRAFFIC_UNAWARE"
        assert body["routeModifiers"] == {
            "avoidTolls": True,
            "avoidHighways": True,
            "avoidFerries": True,
        }
        return httpx.Response(
            200,
            json={"routes": [{"polyline": {"encodedPolyline": "_p~iF~ps|U"}}]},
        )

    client = GoogleRoutesClient("test-api-key", transport=httpx.MockTransport(handler))

    result = await client.compute_preview_route(Coordinate(35.6812, 139.7671))

    assert result == [Coordinate(latitude=38.5, longitude=-120.2)]


@pytest.mark.anyio
@pytest.mark.parametrize(
    "response",
    [
        httpx.Response(400, json={"error": {"message": "API key is invalid"}}),
        httpx.Response(500),
        httpx.Response(200, json={"routes": []}),
        httpx.Response(200, json={"routes": [{"polyline": {"encodedPolyline": "_"}}]}),
    ],
)
async def test_compute_preview_route_rejects_error_or_invalid_response(
    response: httpx.Response,
) -> None:
    client = GoogleRoutesClient(
        "test-api-key",
        transport=httpx.MockTransport(lambda _: response),
    )

    with pytest.raises(GoogleRoutesResponseError):
        await client.compute_preview_route(Coordinate(35.6812, 139.7671))


@pytest.mark.anyio
async def test_compute_preview_route_converts_timeout() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ReadTimeout("timed out", request=request)

    client = GoogleRoutesClient("test-api-key", transport=httpx.MockTransport(handler))

    with pytest.raises(GoogleRoutesTimeoutError):
        await client.compute_preview_route(Coordinate(35.6812, 139.7671))
