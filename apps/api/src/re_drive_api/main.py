from typing import Literal

from fastapi import APIRouter, FastAPI
from pydantic import BaseModel

from re_drive_api.routes.router import router as routes_router


class HealthResponse(BaseModel):
    status: Literal["ok"]
    service: str


api_router = APIRouter(prefix="/api/v1")


@api_router.get("/health", response_model=HealthResponse, tags=["system"])
async def health() -> HealthResponse:
    return HealthResponse(status="ok", service="re-drive-api")


app = FastAPI(
    title="Re:Drive API",
    version="0.1.0",
    description="Backend API for the Re:Drive driving-practice route app.",
)
app.include_router(api_router)
app.include_router(routes_router, prefix="/api/v1")


@app.get("/", include_in_schema=False)
async def root() -> dict[str, str]:
    return {"docs": "/docs", "health": "/api/v1/health"}
