import math
from dataclasses import dataclass
from typing import Any

import httpx

COMPUTE_ROUTES_URL = "https://routes.googleapis.com/directions/v2:computeRoutes"
FIELD_MASK = "routes.polyline.encodedPolyline"
EARTH_RADIUS_METERS = 6_371_000


class GoogleRoutesError(Exception):
    """Base exception for failures while retrieving a route from Google."""


class GoogleRoutesTimeoutError(GoogleRoutesError):
    """Raised when Google Routes API does not respond before the deadline."""


class GoogleRoutesResponseError(GoogleRoutesError):
    """Raised when Google returns an error or an unusable response."""


@dataclass(frozen=True)
class Coordinate:
    latitude: float
    longitude: float


class GoogleRoutesClient:
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

    async def compute_preview_route(self, origin: Coordinate) -> list[Coordinate]:
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
                    json=_build_request_body(origin),
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


def _build_request_body(origin: Coordinate) -> dict[str, Any]:
    # A deterministic triangle makes Phase 0 behavior reproducible while producing a loop.
    intermediates = [
        _destination_point(origin, distance_meters=1_500, bearing_degrees=bearing)
        for bearing in (45, 165, 285)
    ]

    return {
        "origin": _waypoint(origin),
        "destination": _waypoint(origin),
        "intermediates": [_waypoint(coordinate) for coordinate in intermediates],
        "travelMode": "DRIVE",
        "routingPreference": "TRAFFIC_UNAWARE",
        "computeAlternativeRoutes": False,
        "routeModifiers": {
            "avoidTolls": True,
            "avoidHighways": True,
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


def _destination_point(
    origin: Coordinate,
    *,
    distance_meters: float,
    bearing_degrees: float,
) -> Coordinate:
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

    normalized_longitude = (math.degrees(destination_longitude) + 540) % 360 - 180
    return Coordinate(
        latitude=math.degrees(destination_latitude),
        longitude=normalized_longitude,
    )


def decode_polyline(encoded_polyline: str) -> list[Coordinate]:
    coordinates: list[Coordinate] = []
    latitude = 0
    longitude = 0
    index = 0

    while index < len(encoded_polyline):
        latitude_delta, index = _decode_value(encoded_polyline, index)
        longitude_delta, index = _decode_value(encoded_polyline, index)
        latitude += latitude_delta
        longitude += longitude_delta

        decoded = Coordinate(latitude=latitude / 100_000, longitude=longitude / 100_000)
        if not (-90 <= decoded.latitude <= 90 and -180 <= decoded.longitude <= 180):
            raise ValueError("Decoded coordinate is outside valid latitude/longitude bounds")
        coordinates.append(decoded)

    return coordinates


def _decode_value(encoded_polyline: str, index: int) -> tuple[int, int]:
    result = 0
    shift = 0

    while True:
        if index >= len(encoded_polyline):
            raise ValueError("Truncated encoded polyline")

        value = ord(encoded_polyline[index]) - 63
        index += 1
        if value < 0 or value > 63:
            raise ValueError("Invalid character in encoded polyline")

        result |= (value & 0x1F) << shift
        shift += 5
        if value < 0x20:
            break
        if shift > 30:
            raise ValueError("Encoded polyline value is too large")

    decoded = ~(result >> 1) if result & 1 else result >> 1
    return decoded, index
