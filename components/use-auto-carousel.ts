"use client";

import { useEffect, type RefObject } from "react";
import { type CarouselApi } from "@/components/ui/carousel";

export function useAutoCarousel(api: CarouselApi, root: RefObject<HTMLElement | null>, enabled: boolean) {
  useEffect(() => {
    const element = root.current;
    if (!api || !element || !enabled) return;
    let visible = false;
    let pointerDown = false;
    let lastInput = 0;
    const interacted = () => { lastInput = performance.now(); };
    const down = () => { pointerDown = true; interacted(); };
    const up = () => { pointerDown = false; interacted(); };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }, { threshold: .15 });
    observer.observe(element);
    element.addEventListener("pointerdown", down);
    element.addEventListener("pointerup", up);
    element.addEventListener("pointercancel", up);
    element.addEventListener("keydown", interacted);
    const timer = window.setInterval(() => {
      if (!visible || document.hidden || pointerDown || element.matches(":hover") || element.contains(document.activeElement) || performance.now() - lastInput < 6000) return;
      api.scrollNext();
    }, 4200);
    return () => {
      observer.disconnect(); window.clearInterval(timer);
      element.removeEventListener("pointerdown", down); element.removeEventListener("pointerup", up);
      element.removeEventListener("pointercancel", up); element.removeEventListener("keydown", interacted);
    };
  }, [api, root, enabled]);
}
