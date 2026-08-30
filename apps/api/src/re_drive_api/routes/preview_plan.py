import math
from dataclasses import dataclass, field
from typing import Literal

EARTH_RADIUS_METERS = 6_371_000


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
    """現在地を基準に、再現可能な三角形状の周回経路計画を作る。"""
    # Step 1では条件を計画へ受け渡すが、固定経由地の形状にはまだ反映しない。
    conditions = conditions or RouteConditions(
        target_duration_minutes=30,
        difficulty="standard",
        avoid_tolls=True,
        avoid_highways=True,
    )
    intermediates = tuple(
        _destination_point(origin, distance_meters=1_500, bearing_degrees=bearing)
        for bearing in (45, 165, 285)
    )
    return PreviewRoutePlan(
        origin=origin,
        intermediates=intermediates,
        destination=origin,
        conditions=conditions,
    )


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
