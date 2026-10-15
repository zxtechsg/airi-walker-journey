import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { createGroundSurface } from "../src/game/gameWorld";
import { advanceDrivePose, apartmentCollision, batteryUnlocked, MANUAL_EXIT, approachAngle, DOCK, DRIVE_TURN_RATE, SEATS, STREET_BOUNDS, streetCollision, shouldTriggerWall, wallContactDistance, WALL_OBSTACLE } from "../src/game/gamePhysics";

describe("AIRI movement boundaries", () => {
  it("keeps both ordinary and folded walkers outside holes and walls", () => {
    for (const folded of [false, true]) {
      expect(streetCollision(-4, -5, folded)).toBe(true);
      expect(streetCollision(-4, -3.5, folded)).toBe(true);
      expect(streetCollision(4, -8, folded)).toBe(true);
      expect(streetCollision(4, -7.5, folded)).toBe(true);
      expect(streetCollision(0, 3, folded)).toBe(false);
    }
  });
  it("reserves the narrow passage for the compression animation", () => {
    expect(streetCollision(4, -25)).toBe(true);
    expect(streetCollision(4, -25, true)).toBe(false);
    expect(streetCollision(4, -28.1)).toBe(false);
    expect(streetCollision(4, -21.9)).toBe(false);
  });
  it("limits movement at every world edge", () => {
    expect(streetCollision(STREET_BOUNDS.minX - .01, 0)).toBe(true);
    expect(streetCollision(STREET_BOUNDS.maxX + .01, 0)).toBe(true);
    expect(streetCollision(0, STREET_BOUNDS.minZ - .01)).toBe(true);
    expect(streetCollision(0, STREET_BOUNDS.maxZ + .01)).toBe(true);
  });
  it("offers reachable approach points to both seats and a clear docking route", () => {
    for (const seat of Object.values(SEATS)) {
      expect(apartmentCollision(seat.x, -.8)).toBe(false);
      expect(apartmentCollision(seat.x, -1.45)).toBe(false);
      expect(apartmentCollision(seat.x, -2.8)).toBe(true);
      for (let x = seat.x; x <= DOCK.x; x += .1) expect(apartmentCollision(x, .55)).toBe(false);
    }
    for (let z = .55; z >= DOCK.z; z -= .1) expect(apartmentCollision(DOCK.x, z)).toBe(false);
  });
  it("turns across the ±pi seam without spinning the long way", () => {
    const actual = approachAngle(Math.PI - .01, -Math.PI + .01, .5);
    expect(Math.abs(actual - Math.PI)).toBeLessThan(.001);
  });
});

describe("AIRI manual battery chapter", () => {
  it("unlocks only after all street hazards and leaves a clear manual path home", () => {
    const hazards = ["hole", "wall", "ice", "gap"] as const;
    for (const missing of hazards) expect(batteryUnlocked(new Set(hazards.filter(id => id !== missing)))).toBe(false);
    expect(batteryUnlocked(new Set(hazards))).toBe(true);
    for (let z = -28; z >= MANUAL_EXIT.z - .65; z -= .1) expect(streetCollision(MANUAL_EXIT.x, z)).toBe(false);
  });
});

describe("AIRI autonomous return", () => {
  it("backs out of the dock and reaches either seat handles first without an arrival spin", () => {
    for (const seat of Object.values(SEATS)) {
      let pose = { ...DOCK, heading: 0, speed: 0 };
      const route = [{ x: DOCK.x, z: .55, reverse: true }, { x: seat.x, z: .55 }, { x: seat.x, z: seat.z + .65, reverse: true }];
      for (const [leg, target] of route.entries()) {
        let arrived = false;
        for (let frame = 0; frame < 3000; frame++) {
          const next = advanceDrivePose(pose, target, 1 / 60);
          expect(Math.abs(next.heading - pose.heading)).toBeLessThanOrEqual(DRIVE_TURN_RATE / 60 + 1e-8);
          if (leg === 0) { expect(Math.abs(next.heading)).toBeLessThan(1e-6); expect(next.speed).toBeLessThanOrEqual(0); }
          if (next.speed) expect(next.speed > 0).toBe(!target.reverse);
          pose = next;
          if (next.arrived) { arrived = true; break; }
        }
        expect(arrived).toBe(true);
      }
      expect(pose.x).toBe(seat.x); expect(pose.z).toBe(seat.z + .65);
      expect(Math.abs(Math.atan2(Math.sin(pose.heading - Math.PI), Math.cos(pose.heading - Math.PI)))).toBeLessThan(.08);
    }
  });
  it("turns before translating instead of skating sideways around a waypoint", () => {
    const next = advanceDrivePose({ x: 4, z: 0, heading: 0, speed: 0 }, { x: 0, z: 0 }, .05);
    expect(next.x).toBe(4); expect(next.z).toBe(0); expect(next.speed).toBe(0);
    expect(next.heading).toBeCloseTo(DRIVE_TURN_RATE * .05);
  });
});


describe("AIRI physical hole geometry", () => {
  it("cuts the road and ground all the way through instead of painting a dark circle", () => {
    const road = createGroundSurface(17.7, 50, -12, .02, 0xc6b79b);
    const ground = createGroundSurface(90, 100, -12, -.04, 0x9caa83);
    road.updateMatrixWorld(true); ground.updateMatrixWorld(true);
    const ray = new THREE.Raycaster(new THREE.Vector3(-4, 3, -5), new THREE.Vector3(0, -1, 0));
    expect(ray.intersectObjects([road, ground])).toHaveLength(0);
    ray.set(new THREE.Vector3(-2.4, 3, -5), new THREE.Vector3(0, -1, 0));
    expect(ray.intersectObjects([road, ground])).toHaveLength(2);
    road.geometry.dispose(); ground.geometry.dispose();
  });
});


describe("AIRI circular wall approach", () => {
  it("matches the round obstacle on every side and only triggers near an inward impact", () => {
    const boundary = WALL_OBSTACLE.radius + WALL_OBSTACLE.clearance;
    for (let i = 0; i < 16; i++) {
      const angle = i * Math.PI / 8, nx = Math.cos(angle), nz = Math.sin(angle);
      const x = WALL_OBSTACLE.x + nx * (boundary + .2), z = WALL_OBSTACLE.z + nz * (boundary + .2);
      const dx = -nx, dz = -nz, heading = Math.atan2(-dx, -dz);
      expect(streetCollision(WALL_OBSTACLE.x + nx * (boundary - .01), WALL_OBSTACLE.z + nz * (boundary - .01))).toBe(true);
      expect(streetCollision(x, z)).toBe(false);
      expect(wallContactDistance(x, z, dx, dz)).toBeCloseTo(.2);
      expect(shouldTriggerWall(x, z, dx, dz, heading)).toBe(true);
      expect(shouldTriggerWall(x + nx * .5, z + nz * .5, dx, dz, heading)).toBe(false);
      expect(shouldTriggerWall(x, z, -dx, -dz, heading + Math.PI)).toBe(false);
      expect(shouldTriggerWall(x, z, dx, dz, heading + Math.PI / 2)).toBe(false);
    }
  });
  it("does not fire on a close parallel pass or a glancing path that misses the wall", () => {
    const offset = WALL_OBSTACLE.radius + WALL_OBSTACLE.clearance + .06;
    expect(wallContactDistance(WALL_OBSTACLE.x - 2, WALL_OBSTACLE.z + offset, 1, 0)).toBeNull();
    expect(shouldTriggerWall(WALL_OBSTACLE.x - .1, WALL_OBSTACLE.z + offset, 1, 0, -Math.PI / 2)).toBe(false);
    expect(shouldTriggerWall(WALL_OBSTACLE.x, WALL_OBSTACLE.z + offset, 0, 0, 0)).toBe(false);
  });
});
