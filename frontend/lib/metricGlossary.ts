/** Plain-language definitions; dashboard keys also ship from backend/app/metric_glossary.py. */
export const METRIC_GLOSSARY: Record<string, string> = {
  volume28:
    "Total distance in the last 28 days from your synced Strava activities (runs, rides, hikes, and more).",
  this_week:
    "Kilometers logged this calendar week (Mon–Sun) compared with the previous week.",
  weekly_average: "Your 28-day training volume divided by four — a smoothed weekly baseline.",
  longest_run: "The single longest workout in the last 28 days, by distance.",
  hr_coverage:
    "Share of activities that include average heart rate. Low coverage makes zone charts less reliable.",
  acwr:
    "Acute:chronic workload ratio — this week's training load divided by your rolling 4-week average. Around 0.8–1.3 is a common sweet spot; above 1.5 often means ramping too fast.",
  training_load:
    "Same as ACWR: compares recent load to your longer-term average to flag spikes or detraining.",
  heart_rate_zones:
    "How much of your recent workouts were easy, moderate, or hard, based on your heart rate.",
  zone2:
    "Roughly 65–75% of heart rate reserve — conversational pace that builds aerobic capacity.",
  weekly_volume: "Kilometers per calendar week over the last eight weeks.",
  plan_adherence:
    "Planned sessions marked done or skipped this week, versus how many were scheduled.",
  max_hr:
    "Your highest sustainable heart rate. Used with resting HR to estimate training zones if you don't wear a chest strap for every run.",
  resting_hr: "Typical heart rate at rest (often measured in the morning). Lower often means better aerobic fitness.",
  lthr:
    "Lactate threshold heart rate — the HR you can hold for about an hour. Optional; helps fine-tune tempo and threshold work.",
  hr_reserve:
    "Max HR minus resting HR. Zone targets on your plan are calculated as a percentage of this reserve plus resting HR.",
  by_sport: "Distance in the last 28 days split by Strava sport type.",
  adapt_plan:
    "Tells the planner to reshape upcoming sessions when life happens — missed days, travel, injury, or moving a long run.",
  missed_week: "Reduces load and shifts key sessions forward after a week with little or no training.",
  travel_week: "Shortens or swaps sessions when you're away from your normal routes or gym.",
  injured: "Prioritizes rest and easy work while keeping structure until you're ready to build again.",
  move_long_run: "Slides your long run to another day in the same week without changing total volume much.",
  moving_time: "Time Strava counted you as moving, excluding long pauses.",
  avg_pace: "Average minutes per kilometer for this activity (moving time ÷ distance).",
  activity_avg_hr: "Average heart rate while moving — useful for judging how hard the session felt.",
  activity_max_hr: "Highest heart rate recorded on this activity.",
};

export function metricTip(key: string, fromApi?: Record<string, string> | null): string {
  return fromApi?.[key] ?? METRIC_GLOSSARY[key] ?? "";
}
