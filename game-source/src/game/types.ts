import type { MutableRefObject } from "react";

export type GamePhase = "title" | "intro" | "street" | "batterySwap" | "homeIntro" | "apartment" | "sitting" | "seated" | "docking" | "timeJump" | "recall" | "returning" | "standing" | "ending" | "viewer";
export type ChallengeId = "hole" | "wall" | "ice" | "gap" | "battery";
export type CinematicId = ChallengeId | "assist";
export type PowerMode = "powered" | "reserve" | "manual";
export type SeatId = "sofa" | "chair";
export type GameIntent = "dock" | "help_stand" | "unknown";
export type GameSceneEvent =
  | { type: "ready" }
  | { type: "challenge"; id: ChallengeId }
  | { type: "cinematic"; active: boolean; id?: CinematicId }
  | { type: "manual-finished" }
  | { type: "actuation"; braking: boolean; assist: boolean; power: PowerMode; stage: string }
  | { type: "near-seat"; seat: SeatId | null }
  | { type: "sat"; seat: SeatId }
  | { type: "docked" }
  | { type: "returned" }
  | { type: "stood" }
  | { type: "position"; x: number; z: number; heading: number }
  | { type: "error"; message: string };
export type GameControls = { forward: boolean; back: boolean; left: boolean; right: boolean; interact: boolean; brake: boolean };
export const EMPTY_CONTROLS: GameControls = { forward: false, back: false, left: false, right: false, interact: false, brake: false };
export type GameSceneProps = {
  phase: GamePhase;
  paused: boolean;
  completed: ChallengeId[];
  seat: SeatId;
  session: number;
  controls: MutableRefObject<GameControls>;
  onEvent: (event: GameSceneEvent) => void;
  reducedMotion?: boolean;
};
export type FeatureId = "grips" | "frame" | "compute" | "wheels" | "lidar" | "adjust";

export type ShowcaseId = FeatureId | "manual" | "fallAI" | "voiceAI" | "navigationAI" | "findUserAI" | "computeAI";
