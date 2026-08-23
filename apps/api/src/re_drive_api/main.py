from typing import Literal

from fastapi import APIRouter, FastAPI
from pydantic import BaseModel, Field


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


@api_router.get("/health", response_model=HealthResponse, tags=["system"])
async def health() -> HealthResponse:
    return HealthResponse(status="ok", service="re-drive-api")


@api_router.post("/routes/preview", response_model=PreviewRouteResponse, tags=["routes"])
async def preview_route(request: PreviewRouteRequest) -> PreviewRouteResponse:
    """Return a temporary loop around the supplied origin for Phase 0 integration testing."""
    origin = request.origin
    offsets = [
        (0.0, 0.0),
        (0.0025, 0.001),
        (0.003, 0.004),
        (0.0005, 0.005),
        (-0.002, 0.0025),
        (0.0, 0.0),
    ]
    coordinates = [
        RouteCoordinate(
            latitude=_clamp(origin.latitude + latitude_offset, -90, 90),
            longitude=_clamp(origin.longitude + longitude_offset, -180, 180),
        )
        for latitude_offset, longitude_offset in offsets
    ]
    return PreviewRouteResponse(coordinates=coordinates)


def _clamp(value: float, minimum: float, maximum: float) -> float:
    return min(max(value, minimum), maximum)


app = FastAPI(
    title="Re:Drive API",
    version="0.1.0",
    description="Backend API for the Re:Drive driving-practice route app.",
)
app.include_router(api_router)


@app.get("/", include_in_schema=False)
async def root() -> dict[str, str]:
    return {"docs": "/docs", "health": "/api/v1/health"}
