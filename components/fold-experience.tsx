"use client";

import { useRef } from "react";
import { useVisibleVideo } from "@/components/use-visible-video";

export function FoldExperience({ motionOn }: { motionOn: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  useVisibleVideo(video, motionOn, false, true);
  return <div className="fold-film-viewer ambient-film">
    <video ref={video} src="./assets/scenarios/compact-v3.mp4" poster="./assets/scenarios/compact-v3-start.webp"
      autoPlay muted loop playsInline preload="metadata" aria-label="AIRI's two side frames slide together on telescoping rails" />
  </div>;
}
