from typing import Any

import httpx

from re_drive_api.routes.preview_plan import Coordinate, PreviewRoutePlan

COMPUTE_ROUTES_URL = "https://routes.googleapis.com/directions/v2:computeRoutes"
FIELD_MASK = "routes.polyline.encodedPolyline"


class GoogleRoutesError(Exception):
    """Google Routes APIからの経路取得に失敗した場合の基底例外。"""


class GoogleRoutesTimeoutError(GoogleRoutesError):
    """Google Routes APIが期限内に応答しなかった場合の例外。"""


class GoogleRoutesResponseError(GoogleRoutesError):
    """Googleからエラーまたは利用できないレスポンスが返った場合の例外。"""


class GoogleRoutesClient:
    """PreviewRoutePlanをGoogle Routes APIへ送り、道路上の座標列を取得する。"""

    def __init__(
        self,
        api_key: str,
        *,
        timeout_seconds: float = 8.0,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self._api_key = api_key
        self._timeout = httpx.Timeout(timeout_seconds, connect=min(3.0, timeout_seconds))
        self._transport = transport

    async def compute_route(self, plan: PreviewRoutePlan) -> list[Coordinate]:
        """指定された経路計画を計算し、encoded polylineを座標列へ変換する。"""
        try:
            async with httpx.AsyncClient(
                timeout=self._timeout,
                transport=self._transport,
            ) as client:
                response = await client.post(
                    COMPUTE_ROUTES_URL,
                    headers={
                        "Content-Type": "application/json",
                        "X-Goog-Api-Key": self._api_key,
                        "X-Goog-FieldMask": FIELD_MASK,
                    },
                    json=_build_request_body(plan),
                )
        except httpx.TimeoutException as error:
            raise GoogleRoutesTimeoutError from error
        except httpx.RequestError as error:
            raise GoogleRoutesResponseError from error

        if response.is_error:
            raise GoogleRoutesResponseError(f"Google Routes API returned {response.status_code}")

        try:
            encoded_polyline = response.json()["routes"][0]["polyline"]["encodedPolyline"]
        except (KeyError, IndexError, TypeError, ValueError) as error:
            raise GoogleRoutesResponseError("Google Routes API returned no usable route") from error

        if not isinstance(encoded_polyline, str) or not encoded_polyline:
            raise GoogleRoutesResponseError("Google Routes API returned an empty polyline")

        try:
            coordinates = decode_polyline(encoded_polyline)
        except ValueError as error:
            raise GoogleRoutesResponseError(
                "Google Routes API returned an invalid polyline"
            ) from error

        if not coordinates:
            raise GoogleRoutesResponseError("Google Routes API returned an empty polyline")

        return coordinates


def _build_request_body(plan: PreviewRoutePlan) -> dict[str, Any]:
    """アプリ内の経路計画をCompute Routesのリクエスト形式へ変換する。"""
    return {
        "origin": _waypoint(plan.origin),
        "destination": _waypoint(plan.destination),
        "intermediates": [_waypoint(coordinate) for coordinate in plan.intermediates],
        "travelMode": "DRIVE",
        "routingPreference": "TRAFFIC_UNAWARE",
        "computeAlternativeRoutes": False,
        "routeModifiers": {
            "avoidTolls": plan.conditions.avoid_tolls,
            "avoidHighways": plan.conditions.avoid_highways,
            "avoidFerries": True,
        },
        "polylineQuality": "HIGH_QUALITY",
        "polylineEncoding": "ENCODED_POLYLINE",
        "languageCode": "ja",
        "units": "METRIC",
    }


def _waypoint(coordinate: Coordinate) -> dict[str, Any]:
    return {
        "location": {
            "latLng": {
                "latitude": coordinate.latitude,
                "longitude": coordinate.longitude,
            }
        }
    }


def decode_polyline(encoded_polyline: str) -> list[Coordinate]:
    """GoogleのEncoded Polyline Algorithm Formatを緯度経度へ復号する。"""
    coordinates: list[Coordinate] = []
    latitude = 0
    longitude = 0
    index = 0

    while index < len(encoded_polyline):
        # 各点は絶対座標ではなく、直前の点からの差分として格納されている。
        latitude_delta, index = _decode_value(encoded_polyline, index)
        longitude_delta, index = _decode_value(encoded_polyline, index)
        latitude += latitude_delta
        longitude += longitude_delta

        # Encoded Polylineは緯度経度を10万倍した整数として扱う。
        decoded = Coordinate(latitude=latitude / 100_000, longitude=longitude / 100_000)
        if not (-90 <= decoded.latitude <= 90 and -180 <= decoded.longitude <= 180):
            raise ValueError("Decoded coordinate is outside valid latitude/longitude bounds")
        coordinates.append(decoded)

    return coordinates


def _decode_value(encoded_polyline: str, index: int) -> tuple[int, int]:
    """可変長エンコードされた符号付き整数を1つ復号する。"""
    result = 0
    shift = 0

    while True:
        if index >= len(encoded_polyline):
            raise ValueError("Truncated encoded polyline")

        value = ord(encoded_polyline[index]) - 63
        index += 1
        if value < 0 or value > 63:
            raise ValueError("Invalid character in encoded polyline")

        # 継続フラグを除いた下位5bitを、読み取った順に結合する。
        result |= (value & 0x1F) << shift
        shift += 5
        if value < 0x20:
            break
        if shift > 30:
            raise ValueError("Encoded polyline value is too large")

    # 最下位bitが符号を表すため、元の符号付き整数へ戻す。
    decoded = ~(result >> 1) if result & 1 else result >> 1
    return decoded, index
