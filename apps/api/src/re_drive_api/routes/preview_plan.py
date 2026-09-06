import math
from dataclasses import dataclass, field
from typing import Literal

EARTH_RADIUS_METERS = 6_371_000
BASE_RADIUS_METERS = 1_500
BASE_DURATION_MINUTES = 30
CANDIDATE_BEARING_OFFSETS = (0, 40, 80)
INTERMEDIATE_BEARINGS = (45, 165, 285)


@dataclass(frozen=True)
class Coordinate:
    """アプリ内部で扱う緯度経度。"""

    latitude: float
    longitude: float


@dataclass(frozen=True)
class RouteConditions:
    """モバイルから受け取り、後続の候補生成で利用するルート条件。"""

    target_duration_minutes: Literal[30, 45, 60]
    difficulty: Literal["easy", "standard", "challenge"]
    avoid_tolls: bool
    avoid_highways: bool


@dataclass(frozen=True)
class PreviewRoutePlan:
    """Routes APIとMaps URLの両方で再利用する周回経路の地点計画。"""

    origin: Coordinate
    intermediates: tuple[Coordinate, ...]
    destination: Coordinate
    conditions: RouteConditions = field(
        default_factory=lambda: RouteConditions(
            target_duration_minutes=30,
            difficulty="standard",
            avoid_tolls=True,
            avoid_highways=True,
        )
    )


def create_preview_route_plan(
    origin: Coordinate,
    conditions: RouteConditions | None = None,
) -> PreviewRoutePlan:
    """互換性のため、候補群の先頭にあたる周回経路計画を作る。"""
    conditions = conditions or RouteConditions(
        target_duration_minutes=30,
        difficulty="standard",
        avoid_tolls=True,
        avoid_highways=True,
    )
    return create_preview_route_candidates(origin, conditions, candidate_count=1)[0]


def create_preview_route_candidates(
    origin: Coordinate,
    conditions: RouteConditions,
    *,
    candidate_count: int = 3,
) -> tuple[PreviewRoutePlan, ...]:
    """希望時間に応じた半径と分散した方角から、再現可能な候補群を作る。"""
    if not 1 <= candidate_count <= len(CANDIDATE_BEARING_OFFSETS):
        raise ValueError(
            f"candidate_count must be between 1 and {len(CANDIDATE_BEARING_OFFSETS)}"
        )

    radius_meters = BASE_RADIUS_METERS * (
        conditions.target_duration_minutes / BASE_DURATION_MINUTES
    )
    return tuple(
        _create_route_plan(
            origin,
            conditions,
            radius_meters=radius_meters,
            bearing_offset=bearing_offset,
        )
        for bearing_offset in CANDIDATE_BEARING_OFFSETS[:candidate_count]
    )


def _create_route_plan(
    origin: Coordinate,
    conditions: RouteConditions,
    *,
    radius_meters: float,
    bearing_offset: float,
) -> PreviewRoutePlan:
    intermediates = tuple(
        _destination_point(
            origin,
            distance_meters=radius_meters,
            bearing_degrees=bearing + bearing_offset,
        )
        for bearing in INTERMEDIATE_BEARINGS
    )
    return PreviewRoutePlan(origin, intermediates, origin, conditions)


def _destination_point(
    origin: Coordinate,
    *,
    distance_meters: float,
    bearing_degrees: float,
) -> Coordinate:
    """始点から距離と方位角を指定し、球面上の到達点を求める。"""
    latitude = math.radians(origin.latitude)
    longitude = math.radians(origin.longitude)
    bearing = math.radians(bearing_degrees)
    angular_distance = distance_meters / EARTH_RADIUS_METERS

    destination_latitude = math.asin(
        math.sin(latitude) * math.cos(angular_distance)
        + math.cos(latitude) * math.sin(angular_distance) * math.cos(bearing)
    )
    destination_longitude = longitude + math.atan2(
        math.sin(bearing) * math.sin(angular_distance) * math.cos(latitude),
        math.cos(angular_distance) - math.sin(latitude) * math.sin(destination_latitude),
    )

    # 日付変更線をまたいでも経度が-180度から180度に収まるよう正規化する。
    normalized_longitude = (math.degrees(destination_longitude) + 540) % 360 - 180
    return Coordinate(
        latitude=math.degrees(destination_latitude),
        longitude=normalized_longitude,
    )
