"""Plain-language metric copy returned by the API; UI falls back to frontend/lib/metricGlossary.ts."""

METRIC_EXPLAINERS: dict[str, str] = {
    "acwr": "Acute:chronic workload ratio — this week's load divided by your 4-week average. Above 1.5 suggests elevated injury risk.",
    "zone2": "Zone 2 is roughly 65–75% of heart rate reserve—easy aerobic work that builds endurance.",
    "volume": "Weekly run volume is total kilometers in the selected window divided by weeks.",
    "volume28": "Total running distance in the last 28 days from Strava runs.",
    "weekly_average": "28-day run volume divided by four weeks.",
    "hr_coverage": "Percentage of runs that include heart rate data.",
    "adherence": "Share of planned sessions completed or explicitly skipped this week.",
    "heart_rate_zones": "Time in each HR band based on your max and resting heart rate.",
}
