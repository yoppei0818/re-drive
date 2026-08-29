from urllib.parse import urlencode

from re_drive_api.routes.preview_plan import Coordinate, PreviewRoutePlan

GOOGLE_MAPS_DIRECTIONS_URL = "https://www.google.com/maps/dir/"


def build_google_maps_directions_url(plan: PreviewRoutePlan) -> str:
    """同じ地点計画をGoogle Mapsで再計算するためのUniversal URLを生成する。"""
    parameters = {
        "api": "1",
        "origin": _format_coordinate(plan.origin),
        "destination": _format_coordinate(plan.destination),
        "waypoints": "|".join(_format_coordinate(point) for point in plan.intermediates),
        "travelmode": "driving",
        "avoid": "tolls,highways,ferries",
        "dir_action": "navigate",
    }
    return f"{GOOGLE_MAPS_DIRECTIONS_URL}?{urlencode(parameters)}"


def _format_coordinate(coordinate: Coordinate) -> str:
    return f"{coordinate.latitude:.7f},{coordinate.longitude:.7f}"
