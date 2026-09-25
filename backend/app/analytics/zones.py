
from app.models import Activity

ZONE_PLAIN_LABELS = {
    1: "Very easy",
    2: "Easy aerobic",
    3: "Moderate",
    4: "Threshold",
    5: "Max effort",
}


def hr_zone(hr: float, max_hr: int, resting_hr: int) -> int:
    """Karvonen-style zones 1-5."""
    if max_hr <= resting_hr:
        return 2
    reserve = max_hr - resting_hr
    pct = (hr - resting_hr) / reserve
    if pct < 0.6:
        return 1
    if pct < 0.7:
        return 2
    if pct < 0.8:
        return 3
    if pct < 0.9:
        return 4
    return 5


def hr_zone_distribution(
    activities: list[Activity],
    max_hr: int,
    resting_hr: int,
) -> dict[str, float]:
    counts = {f"z{i}": 0 for i in range(1, 6)}
    total = 0
    for act in activities:
        if not act.average_heartrate:
            continue
        zone = hr_zone(act.average_heartrate, max_hr, resting_hr)
        counts[f"z{zone}"] += act.moving_time_seconds
        total += act.moving_time_seconds
    if total == 0:
        return {k: 0.0 for k in counts}
    return {k: round(v / total * 100, 1) for k, v in counts.items()}


def activity_hr_zone_fields(
    activity: Activity,
    max_hr: int,
    resting_hr: int,
) -> tuple[str | None, str | None, int | None]:
    """Returns (zone_key e.g. z4, plain label, zone number 1-5)."""
    if not activity.average_heartrate:
        return None, None, None
    zone = hr_zone(activity.average_heartrate, max_hr, resting_hr)
    return f"z{zone}", ZONE_PLAIN_LABELS.get(zone, f"Zone {zone}"), zone
