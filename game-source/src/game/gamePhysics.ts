import type { ChallengeId } from "./types";

export const STREET_BOUNDS = { minX: -8.4, maxX: 8.4, minZ: -35.5, maxZ: 6 };
export const STREET_OBJECTIVES: Record<ChallengeId, { x: number; z: number; label: string }> = {
  hole: { x: -4, z: -5, label: "THE UNEXPECTED DROP" },
  wall: { x: 4, z: -8, label: "THE STUBBORN WALL" },
  ice: { x: -3, z: -17, label: "THE SLIPPERY SHORTCUT" },
  gap: { x: 4, z: -25, label: "THE TIGHT SQUEEZE" },
  battery: { x: -4, z: -28, label: "THE LAST CHARGE" },
};
export const WALL_OBSTACLE = { x: 4, z: -8, radius: 1.8, height: 1.5, clearance: .43, triggerDistance: .24 } as const;
export const MANUAL_EXIT = { x: -4, z: -33 };
export const batteryUnlocked = (completed: ReadonlySet<ChallengeId>) => (Object.keys(STREET_OBJECTIVES) as ChallengeId[]).every(id => id === "battery" || completed.has(id));
export const SEATS = {
  sofa: { x: -2.3, z: -2.72, height: .47 },
  chair: { x: 2.25, z: -2.72, height: .47 },
} as const;
export const DOCK = { x: 4.1, z: -4.05 };
export const clamp = (value: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, value));
export const ease = (value: number) => { const t = clamp(value, 0, 1); return t * t * (3 - 2 * t); };
export function approachAngle(current: number, target: number, factor: number) {
  const delta = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + delta * clamp(factor, 0, 1);
}
export type DrivePose = { x: number; z: number; heading: number; speed: number };
export const DRIVE_TURN_RATE = 2.4;
/** Turn in the clear aisle before driving; reverse legs keep the grips facing Rose. */
export function advanceDrivePose(pose: DrivePose, target: { x: number; z: number; reverse?: boolean }, dt: number): DrivePose & { arrived: boolean } {
  const dx = target.x - pose.x, dz = target.z - pose.z, distance = Math.hypot(dx, dz);
  if (distance <= .025) return { ...pose, x: target.x, z: target.z, speed: 0, arrived: true };
  const desired = Math.atan2(-dx, -dz) + (target.reverse ? Math.PI : 0);
  const delta = Math.atan2(Math.sin(desired - pose.heading), Math.cos(desired - pose.heading));
  const heading = pose.heading + clamp(delta, -DRIVE_TURN_RATE * dt, DRIVE_TURN_RATE * dt);
  const aligned = Math.abs(delta) < .16;
  const wanted = aligned ? Math.min(2, Math.sqrt(2 * 1.35 * distance)) : 0;
  const magnitude = Math.max(0, Math.abs(pose.speed) + clamp(wanted - Math.abs(pose.speed), -1.6 * dt, 1.5 * dt));
  const step = aligned ? Math.min(distance, magnitude * dt) : 0;
  return { x: pose.x + dx / distance * step, z: pose.z + dz / distance * step, heading, speed: (target.reverse ? -1 : 1) * (step / Math.max(dt, .001)), arrived: false };
}
export function rectDistance(x: number, z: number, cx: number, cz: number, halfX: number, halfZ: number) {
  return Math.hypot(Math.max(0, Math.abs(x - cx) - halfX), Math.max(0, Math.abs(z - cz) - halfZ));
}
/** Distance along the intended travel ray to the actual wall collision boundary. */
export function wallContactDistance(x: number, z: number, dx: number, dz: number): number | null {
  const length = Math.hypot(dx, dz);
  if (length < 1e-8) return null;
  const vx = dx / length, vz = dz / length, rx = x - WALL_OBSTACLE.x, rz = z - WALL_OBSTACLE.z;
  const toward = -(rx * vx + rz * vz);
  if (toward <= 0) return null;
  const radius = WALL_OBSTACLE.radius + WALL_OBSTACLE.clearance;
  const discriminant = radius * radius - (rx * rx + rz * rz - toward * toward);
  if (discriminant < 0) return null;
  return Math.max(0, toward - Math.sqrt(discriminant));
}
export function shouldTriggerWall(x: number, z: number, dx: number, dz: number, heading: number) {
  const length = Math.hypot(dx, dz), contact = wallContactDistance(x, z, dx, dz);
  if (length < 1e-8 || contact === null || contact > WALL_OBSTACLE.triggerDistance) return false;
  // A nearby sideways pass is not an impact, and the walker must face its travel.
  return (-Math.sin(heading) * dx - Math.cos(heading) * dz) / length > .85;
}
export function streetCollision(x: number, z: number, folded = false) {
  if (x < STREET_BOUNDS.minX || x > STREET_BOUNDS.maxX || z < STREET_BOUNDS.minZ || z > STREET_BOUNDS.maxZ) return true;
  if (Math.hypot(x + 4, z + 5) < 1.65) return true;
  if (Math.hypot(x - WALL_OBSTACLE.x, z - WALL_OBSTACLE.z) < WALL_OBSTACLE.radius + WALL_OBSTACLE.clearance) return true;
  if (!folded && rectDistance(x, z, 4, -25, .65, 1.7) < .4) return true;
  return false;
}
export function apartmentCollision(x: number, z: number) {
  if (x < -4.65 || x > 4.65 || z < -4.55 || z > 4.85) return true;
  if (rectDistance(x, z, -2.3, -2.8, 1.45, .6) < .32) return true;
  if (rectDistance(x, z, 2.25, -2.8, .58, .62) < .32) return true;
  if (rectDistance(x, z, -4.35, 2.2, .45, 1.1) < .3) return true;
  return false;
}
