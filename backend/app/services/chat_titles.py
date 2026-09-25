"""Short, readable thread titles from the first user message."""

import re

_RULES: list[tuple[str, str]] = [
    (r"half\s*marathon", "Half marathon plan"),
    (r"\bmarathon\b", "Marathon build"),
    (r"weekly\s*brief", "Weekly brief review"),
    (r"\bacwr\b|training\s*load|load\s*ratio", "Training load check"),
    (r"zone\s*2|\bz2\b|heart\s*rate\s*zone", "HR zone review"),
    (r"missed|adjust|travel|injur", "Plan adjustment"),
    (r"race\s*goal|suggest.*goal", "Race goal ideas"),
    (r"build.*plan|training\s*plan", "Training plan"),
    (r"review.*week|last\s*\d+\s*week", "Recent training review"),
    (r"long\s*run", "Long run advice"),
    (r"easy\s*(day|mile|run)", "Easy day guidance"),
    (r"taper", "Race taper"),
    (r"strava|sync", "Data & sync"),
]


def derive_thread_title(user_input: str) -> str:
    text = (user_input or "").strip()
    if not text:
        return "Coach chat"

    lower = text.lower()
    for pattern, title in _RULES:
        if re.search(pattern, lower):
            return title

    line = re.sub(r"\s+", " ", text.split("\n")[0].strip())
    if len(line) <= 42:
        return line[0].upper() + line[1:] if len(line) > 1 else line.upper()

    cut = line[:42].rsplit(" ", 1)[0]
    return (cut or line[:42]).rstrip() + "…"
