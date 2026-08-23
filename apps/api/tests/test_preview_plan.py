import math

from re_drive_api.routes.preview_plan import Coordinate, create_preview_route_plan


def test_create_preview_route_plan_returns_deterministic_loop() -> None:
    origin = Coordinate(latitude=35.6812, longitude=139.7671)

    first = create_preview_route_plan(origin)
    second = create_preview_route_plan(origin)

    assert first == second
    assert first.origin == origin
    assert first.destination == origin
    assert len(first.intermediates) == 3


def test_create_preview_route_plan_places_intermediates_about_1500_meters_away() -> None:
    origin = Coordinate(latitude=35.6812, longitude=139.7671)
    plan = create_preview_route_plan(origin)

    for intermediate in plan.intermediates:
        assert math.isclose(_distance_meters(origin, intermediate), 1_500, abs_tol=0.1)


def _distance_meters(start: Coordinate, end: Coordinate) -> float:
    earth_radius_meters = 6_371_000
    start_latitude = math.radians(start.latitude)
    end_latitude = math.radians(end.latitude)
    latitude_delta = end_latitude - start_latitude
    longitude_delta = math.radians(end.longitude - start.longitude)
    haversine = (
        math.sin(latitude_delta / 2) ** 2
        + math.cos(start_latitude)
        * math.cos(end_latitude)
        * math.sin(longitude_delta / 2) ** 2
    )
    return earth_radius_meters * 2 * math.asin(math.sqrt(haversine))
