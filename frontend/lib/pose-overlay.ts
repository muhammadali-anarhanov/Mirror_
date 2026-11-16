/** Geometry for the calibrated 600x720 demo shirts. No browser or inference state. */
export type PosePoint = { x: number; y: number; visibility?: number; presence?: number };
export type Viewport = { videoWidth: number; videoHeight: number; width: number; height: number; fit: "cover" | "contain"; mirrored: boolean; positionX?: number; positionY?: number };
export type Affine = { a: number; b: number; c: number; d: number; e: number; f: number };
export const SHIRT_WIDTH = 600;
export const SHIRT_HEIGHT = 720;
export const DEMO_AR_SHIRTS = [
  { id: "blue", name: "Blue crew-neck", image: "/ar-shirts/blue-shirt.svg" },
  { id: "coral", name: "Coral striped tee", image: "/ar-shirts/coral-shirt.svg" },
] as const;
export type ARShirt = typeof DEMO_AR_SHIRTS[number]["id"];

export function projectPoint(point: PosePoint, view: Viewport) {
  const scale = (view.fit === "contain" ? Math.min : Math.max)(view.width / view.videoWidth, view.height / view.videoHeight);
  const x = point.x * view.videoWidth * scale + (view.width - view.videoWidth * scale) * (view.positionX ?? 0.5);
  const y = point.y * view.videoHeight * scale + (view.height - view.videoHeight * scale) * (view.positionY ?? 0.5);
  return { x: view.mirrored ? view.width - x : x, y };
}

export function garmentTransform(landmarks: PosePoint[], view: Viewport): Affine | null {
  if (![view.videoWidth, view.videoHeight, view.width, view.height].every(n => Number.isFinite(n) && n > 1)) return null;
  // MediaPipe indices: left/right shoulder 11/12; left/right hip 23/24.
  const points = [11, 12, 23, 24].map(index => landmarks[index]);
  if (points.some(p => !p || !Number.isFinite(p.x) || !Number.isFinite(p.y) || (p.visibility ?? 0) < 0.55 || (p.presence ?? 1) < 0.5 || p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1)) return null;
  const [s1, s2, h1, h2] = points.map(p => projectPoint(p, view));
  const [left, right] = s1.x <= s2.x ? [s1, s2] : [s2, s1];
  const mid = { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 };
  const hip = { x: (h1.x + h2.x) / 2, y: (h1.y + h2.y) / 2 };
  const shoulderWidth = Math.hypot(right.x - left.x, right.y - left.y);
  const torsoHeight = Math.hypot(hip.x - mid.x, hip.y - mid.y);
  if (shoulderWidth < 24 || right.x - left.x < shoulderWidth * 0.35 || torsoHeight < 35 || hip.y - mid.y < 20) return null;
  // Source shoulder anchors (150,100)/(450,100), hem midpoint (300,660).
  // The shoulder basis handles roll; the torso basis also follows hip sway/lean.
  const a = (right.x - left.x) / 300;
  const b = (right.y - left.y) / 300;
  const c = (hip.x - mid.x) * 1.12 / 560;
  const d = (hip.y - mid.y) * 1.12 / 560;
  return { a, b, c, d, e: mid.x - 300 * a - 100 * c, f: mid.y - 300 * b - 100 * d };
}

export function smoothTransform(previous: Affine | null, next: Affine, alpha = 0.45): Affine {
  if (!previous) return { ...next };
  const weight = Math.max(0, Math.min(1, alpha));
  return Object.fromEntries(Object.entries(next).map(([key, value]) => [key, previous[key as keyof Affine] + (value - previous[key as keyof Affine]) * weight])) as Affine;
}
