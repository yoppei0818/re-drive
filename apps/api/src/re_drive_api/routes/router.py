import os
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from re_drive_api.clients.google_routes import (
    GoogleRoutesClient,
    GoogleRoutesResponseError,
    GoogleRoutesTimeoutError,
)
from re_drive_api.routes.maps_url import build_google_maps_directions_url
from re_drive_api.routes.preview_plan import Coordinate, create_preview_route_plan
from re_drive_api.routes.schemas import PreviewRouteRequest, PreviewRouteResponse, RouteCoordinate

router = APIRouter(prefix="/routes", tags=["routes"])


def get_google_routes_client() -> GoogleRoutesClient:
    """サーバー専用APIキーからGoogle Routes APIクライアントを生成する。"""
    api_key = os.getenv("GOOGLE_MAPS_API_KEY", "").strip()
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ルート検索を利用できません",
        )
    return GoogleRoutesClient(api_key)


@router.post("/preview", response_model=PreviewRouteResponse)
async def preview_route(
    request: PreviewRouteRequest,
    routes_client: Annotated[GoogleRoutesClient, Depends(get_google_routes_client)],
) -> PreviewRouteResponse:
    """現在地を基準に、実際の道路に沿った周回ルートを返す。"""
    origin = Coordinate(
        latitude=request.origin.latitude,
        longitude=request.origin.longitude,
    )
    plan = create_preview_route_plan(origin)

    try:
        route = await routes_client.compute_route(plan)
    except GoogleRoutesTimeoutError as error:
        # 外部サービスの詳細やAPIキーをモバイルへ露出させない。
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="ルート検索がタイムアウトしました",
        ) from error
    except GoogleRoutesResponseError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="ルートを取得できませんでした",
        ) from error

    coordinates = [
        RouteCoordinate(latitude=coordinate.latitude, longitude=coordinate.longitude)
        for coordinate in route
    ]
    return PreviewRouteResponse(
        coordinates=coordinates,
        google_maps_url=build_google_maps_directions_url(plan),
    )
