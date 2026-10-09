"use client";

import { useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { useVisibleVideo } from "@/components/use-visible-video";

/** A user-opened film with discreet controls and a deliberate final frame. */
export function ProductFilm() {
  const video = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
  const [ended, setEnded] = useState(false);
  useVisibleVideo(video, true, paused, false, true);

  function toggle() {
    if (ended && video.current) {
      video.current.currentTime = 0;
      setEnded(false);
      setPaused(false);
      void video.current.play().catch(() => setPaused(true));
      return;
    }
    setPaused(value => !value);
  }

  const label = ended ? "Replay film" : paused ? "Play film" : "Pause film";
  const Icon = ended ? RotateCcw : paused ? Play : Pause;
  return <div className={`product-film ${ended || paused ? "is-paused" : ""}`}>
    <video ref={video} src="./assets/airi-product-intro-v5.mp4" poster="./assets/airi-product-intro-v4.webp"
      autoPlay muted playsInline preload="metadata" aria-label="AIRI product film"
      onEnded={() => setEnded(true)} />
    <button className="product-film-toggle" onClick={toggle} aria-label={label}>
      <Icon size={18} strokeWidth={1.5} /><span>{ended ? "Watch again" : paused ? "Play" : "Pause"}</span>
    </button>
  </div>;
}
