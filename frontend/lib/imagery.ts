/**
 * Endurance photography (Unsplash CDN).
 * Ids are checked with `npm run verify:imagery` (HTTP) and spot-checked visually —
 * Unsplash often returns 200 for the wrong asset (e.g. jeans, gym, bedroom).
 */

type UnsplashOpts = {
  w?: number;
  h?: number;
  q?: number;
};

export function unsplash(photoId: string, opts: UnsplashOpts = {}): string {
  const w = opts.w ?? 2800;
  const q = opts.q ?? 90;
  const params = new URLSearchParams({
    auto: "format",
    fit: "crop",
    w: String(w),
    q: String(q),
  });
  if (opts.h) params.set("h", String(opts.h));
  return `https://images.unsplash.com/${photoId}?${params.toString()}`;
}

/**
 * Visually verified endurance subjects (not gym / jeans / interiors).
 */
const PHOTOS = {
  ironmanSwim: "photo-1633114078244-353b1ce7b096",
  ironmanBike: "photo-1576858574144-9ae1ebcf5ae5",
  mountainTrail: "photo-1502904550040-7534597429ae",
  roadRunnersDawn: "photo-1552674605-db6ffd4facb5",
  marathonStreet: "photo-1560789363-cfa0cbf748f8",
  roadCyclist: "photo-1541625602330-2277a4c46182",
  countryRoad: "photo-1476480862126-209bfaa8edc8",
  desertRun: "photo-1605296867304-46d5465a13f1",
  cityParkRun: "photo-1483721310020-03333e577078",
  openWaterSwim: "photo-1544551763-46a013bb70d5",
  poolSwim: "photo-1519315901367-f34ff9154487",
  openWaterBw: "photo-1533049426476-9a889e21ece5",
} as const;

export const IMAGES = {
  /** Dashboard hero band */
  home: unsplash(PHOTOS.ironmanBike),
  analytics: unsplash(PHOTOS.mountainTrail),
  plan: unsplash(PHOTOS.marathonStreet),
  settings: unsplash(PHOTOS.roadCyclist),
  coach: unsplash(PHOTOS.roadRunnersDawn),
  login: unsplash(PHOTOS.ironmanSwim),
  raceCountdown: unsplash(PHOTOS.ironmanSwim),
  activityAmbient: unsplash(PHOTOS.countryRoad),
  ultra: unsplash(PHOTOS.desertRun),
  morningRun: unsplash(PHOTOS.cityParkRun),
  swim: unsplash(PHOTOS.openWaterSwim),
  activityRun: unsplash(PHOTOS.roadRunnersDawn),
  activityTrail: unsplash(PHOTOS.mountainTrail),
  activityWalk: unsplash(PHOTOS.cityParkRun),

  heroTrail: unsplash(PHOTOS.ironmanBike),
  heroRoad: unsplash(PHOTOS.countryRoad),
  heroMountains: unsplash(PHOTOS.mountainTrail),
  heroUltra: unsplash(PHOTOS.desertRun),
  heroCycling: unsplash(PHOTOS.roadCyclist),
} as const;

export function sportSceneImage(sportType: string): string {
  const s = sportType.toLowerCase();
  if (s.includes("trail") || s.includes("hike")) return IMAGES.activityTrail;
  if (s.includes("ride") || s.includes("bike")) return IMAGES.settings;
  if (s.includes("swim")) return IMAGES.swim;
  if (s.includes("walk")) return IMAGES.activityWalk;
  return IMAGES.activityRun;
}

export function canvasImageForPath(pathname: string): string {
  if (pathname.startsWith("/training")) return IMAGES.analytics;
  if (pathname.startsWith("/plan")) return IMAGES.plan;
  if (pathname.startsWith("/settings")) return IMAGES.settings;
  if (pathname === "/home" || pathname === "/") return IMAGES.home;
  if (pathname.startsWith("/activities")) return IMAGES.activityAmbient;
  return IMAGES.home;
}

export function ambientImageForPath(pathname: string): string | undefined {
  if (pathname === "/coach") return IMAGES.coach;
  if (pathname.startsWith("/activities/")) return IMAGES.activityAmbient;
  return undefined;
}

export function allImageUrls(): string[] {
  return Object.values(IMAGES);
}
