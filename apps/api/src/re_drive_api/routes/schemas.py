from typing import Literal

from pydantic import BaseModel, Field, StrictBool


class RouteCoordinate(BaseModel):
    """モバイルとのAPI境界で検証する緯度経度。"""

    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)


class RouteAvoidance(BaseModel):
    """ルート検索時に避けたい道路条件。"""

    tolls: StrictBool
    highways: StrictBool


class PreviewRouteRequest(BaseModel):
    """プレビュー周回ルートの生成リクエスト。"""

    origin: RouteCoordinate
    target_duration_minutes: Literal[30, 45, 60]
    difficulty: Literal["easy", "standard", "challenge"]
    avoid: RouteAvoidance


class PreviewRouteResponse(BaseModel):
    """モバイルのPolylineへそのまま渡せる座標列。"""

    coordinates: list[RouteCoordinate]
    google_maps_url: str
