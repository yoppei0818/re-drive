from pydantic import BaseModel, Field


class RouteCoordinate(BaseModel):
    """モバイルとのAPI境界で検証する緯度経度。"""

    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)


class PreviewRouteRequest(BaseModel):
    """プレビュー周回ルートの生成リクエスト。"""

    origin: RouteCoordinate


class PreviewRouteResponse(BaseModel):
    """モバイルのPolylineへそのまま渡せる座標列。"""

    coordinates: list[RouteCoordinate]
