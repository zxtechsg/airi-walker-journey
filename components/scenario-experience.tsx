"use client";

import { useRef, useState } from "react";
import { type LucideIcon } from "lucide-react";
import { useVisibleVideo } from "@/components/use-visible-video";

export type Scenario = {
  id: string; name: string; icon: LucideIcon; title: string; description: string;
  cue: string; steps: string[]; details: string[]; states: string[];
};

/** A film is part of the page. The shared motion switch controls playback. */
export function ScenarioExperience({ scenario, motionOn }: { scenario: Scenario; motionOn: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  useVisibleVideo(video, motionOn, false, true);
  const mediaId = ["home", "travel"].includes(scenario.id) ? `${scenario.id}-v3` : scenario.id;
  const poster = `./assets/scenarios/${mediaId}-start.webp`;
  return <div className="scenario-stage ambient-film">
    {failed
      ? <img src={poster} alt={`${scenario.name} with AIRI`} width={1920} height={1080} />
      : <video ref={video} src={`./assets/scenarios/${mediaId}.mp4`} poster={poster}
          autoPlay muted loop playsInline preload="metadata"
          aria-label={`${scenario.name} — AIRI concept film`}
          onError={() => setFailed(true)} />}
  </div>;
}
