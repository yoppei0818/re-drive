from urllib.parse import parse_qs, urlparse

from re_drive_api.routes.maps_url import (
    GOOGLE_MAPS_DIRECTIONS_URL,
    build_google_maps_directions_url,
)
from re_drive_api.routes.preview_plan import Coordinate, PreviewRoutePlan


def test_build_google_maps_directions_url_preserves_route_plan_and_options() -> None:
    origin = Coordinate(latitude=35.6812, longitude=139.7671)
    intermediates = (
        Coordinate(latitude=35.6912, longitude=139.7771),
        Coordinate(latitude=35.6712, longitude=139.7871),
        Coordinate(latitude=35.6612, longitude=139.7571),
    )
    plan = PreviewRoutePlan(
        origin=origin,
        intermediates=intermediates,
        destination=origin,
    )

    url = build_google_maps_directions_url(plan)
    parsed = urlparse(url)
    parameters = parse_qs(parsed.query)

    assert f"{parsed.scheme}://{parsed.netloc}{parsed.path}" == GOOGLE_MAPS_DIRECTIONS_URL
    assert parameters == {
        "api": ["1"],
        "origin": ["35.6812000,139.7671000"],
        "destination": ["35.6812000,139.7671000"],
        "waypoints": [
            "35.6912000,139.7771000|35.6712000,139.7871000|35.6612000,139.7571000"
        ],
        "travelmode": ["driving"],
        "avoid": ["tolls,highways,ferries"],
        "dir_action": ["navigate"],
    }


def test_build_google_maps_directions_url_encodes_separators() -> None:
    origin = Coordinate(latitude=35.6812, longitude=139.7671)
    plan = PreviewRoutePlan(origin=origin, intermediates=(origin,), destination=origin)

    url = build_google_maps_directions_url(plan)

    assert "%2C" in url
    assert "waypoints=35.6812000%2C139.7671000" in url
