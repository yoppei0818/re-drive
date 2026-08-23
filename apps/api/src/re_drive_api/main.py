import os
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, FastAPI, HTTPException, status
from pydantic import BaseModel, Field

from re_drive_api.google_routes import (
    Coordinate,
    GoogleRoutesClient,
    GoogleRoutesResponseError,
    GoogleRoutesTimeoutError,
)


class RouteCoordinate(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)


class PreviewRouteRequest(BaseModel):
    origin: RouteCoordinate


class PreviewRouteResponse(BaseModel):
    coordinates: list[RouteCoordinate]


class HealthResponse(BaseModel):
    status: Literal["ok"]
    service: str


api_router = APIRouter(prefix="/api/v1")


def get_google_routes_client() -> GoogleRoutesClient:
    api_key = os.getenv("GOOGLE_MAPS_API_KEY", "").strip()
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ルート検索を利用できません",
        )
    return GoogleRoutesClient(api_key)


@api_router.get("/health", response_model=HealthResponse, tags=["system"])
async def health() -> HealthResponse:
    return HealthResponse(status="ok", service="re-drive-api")


@api_router.post("/routes/preview", response_model=PreviewRouteResponse, tags=["routes"])
async def preview_route(
    request: PreviewRouteRequest,
    routes_client: Annotated[GoogleRoutesClient, Depends(get_google_routes_client)],
) -> PreviewRouteResponse:
    """Return a road-following loop around the supplied origin."""
    try:
        route = await routes_client.compute_preview_route(
            Coordinate(
                latitude=request.origin.latitude,
                longitude=request.origin.longitude,
            )
        )
    except GoogleRoutesTimeoutError as error:
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
    return PreviewRouteResponse(coordinates=coordinates)


app = FastAPI(
    title="Re:Drive API",
    version="0.1.0",
    description="Backend API for the Re:Drive driving-practice route app.",
)
app.include_router(api_router)


@app.get("/", include_in_schema=False)
async def root() -> dict[str, str]:
    return {"docs": "/docs", "health": "/api/v1/health"}
