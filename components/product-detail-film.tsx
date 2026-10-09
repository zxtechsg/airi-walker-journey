"use client";

import { useRef } from "react";
import { useVisibleVideo } from "@/components/use-visible-video";

export function ProductDetailFilm({motionOn}:{motionOn:boolean}) {
  const video=useRef<HTMLVideoElement>(null);
  useVisibleVideo(video,motionOn,false,true);
  return <video ref={video} className="product-detail-film" src="./assets/airi-detail-film.mp4" poster="./assets/airi-detail-poster.webp" autoPlay muted loop playsInline preload="metadata" aria-label="A close-up film of AIRI’s contoured handles, frame and fabric in a sunlit space"/>;
}
