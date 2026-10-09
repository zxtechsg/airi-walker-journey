"use client";

import { useEffect, useRef, type RefObject } from "react";

/** Autoplay only visible films; an explicit Play may opt into local playback. */
export function useVisibleVideo(
  videoRef: RefObject<HTMLVideoElement | null>,
  motionOn: boolean,
  userPaused: boolean,
  loop = false,
  manualOverride = false,
) {
  const policy = useRef({ motionOn, userPaused, manualOverride });
  const synchronize = useRef<() => void>(() => {});

  useEffect(() => {
    policy.current = { motionOn, userPaused, manualOverride };
    synchronize.current();
  }, [motionOn, userPaused, manualOverride]);

  useEffect(() => {
    const film = videoRef.current;
    if (!film) return;
    let inView = false;
    let active = true;
    film.loop = loop;

    const canPlay = () => {
      const current = policy.current;
      return active && inView && !document.hidden && !current.userPaused
        && (current.motionOn || current.manualOverride);
    };
    const sync = () => {
      if (!canPlay()) film.pause();
      else if (film.paused && !film.ended) {
        void film.play().then(() => { if (!canPlay()) film.pause(); }).catch(() => {});
      }
    };
    synchronize.current = sync;
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting && entry.intersectionRatio >= .3;
      sync();
    }, { threshold: [0, .3] });
    observer.observe(film);
    document.addEventListener("visibilitychange", sync);
    sync();

    return () => {
      active = false;
      synchronize.current = () => {};
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
      film.pause();
    };
  }, [videoRef, loop]);
}
