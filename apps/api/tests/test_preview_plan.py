import math

import pytest

from re_drive_api.routes.preview_plan import (
    Coordinate,
    RouteConditions,
    create_preview_route_candidates,
    create_preview_route_plan,
)


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


def test_create_preview_route_plan_scales_waypoint_radius_for_target_duration() -> None:
    origin = Coordinate(latitude=35.6812, longitude=139.7671)
    conditions = RouteConditions(60, "challenge", avoid_tolls=False, avoid_highways=True)

    plan = create_preview_route_plan(origin, conditions)

    assert plan.conditions == conditions
    for intermediate in plan.intermediates:
        assert math.isclose(_distance_meters(origin, intermediate), 3_000, abs_tol=0.1)


def test_create_preview_route_candidates_returns_three_distinct_deterministic_plans() -> None:
    origin = Coordinate(latitude=35.6812, longitude=139.7671)
    conditions = RouteConditions(45, "standard", avoid_tolls=True, avoid_highways=True)

    first = create_preview_route_candidates(origin, conditions)
    second = create_preview_route_candidates(origin, conditions)

    assert first == second
    assert len(first) == 3
    assert len({plan.intermediates for plan in first}) == 3
    assert all(plan.origin == origin and plan.destination == origin for plan in first)
    assert all(plan.conditions == conditions for plan in first)
    for plan in first:
        for intermediate in plan.intermediates:
            assert math.isclose(_distance_meters(origin, intermediate), 2_250, abs_tol=0.1)


@pytest.mark.parametrize("candidate_count", [0, 4])
def test_create_preview_route_candidates_rejects_unsupported_count(candidate_count: int) -> None:
    origin = Coordinate(latitude=35.6812, longitude=139.7671)
    conditions = RouteConditions(30, "easy", avoid_tolls=True, avoid_highways=True)

    with pytest.raises(ValueError):
        create_preview_route_candidates(origin, conditions, candidate_count=candidate_count)


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
