"use client";

import { useSyncExternalStore } from "react";

const MOBILE_BREAKPOINT = 768;

function getIsMobile() {
  return typeof window !== "undefined"
    ? window.innerWidth < MOBILE_BREAKPOINT
    : false;
}

function subscribe(callback: () => void) {
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
  mql.addEventListener("change", callback);
  window.addEventListener("resize", callback);
  return () => {
    mql.removeEventListener("change", callback);
    window.removeEventListener("resize", callback);
  };
}

export function useIsMobile() {
  return useSyncExternalStore(subscribe, getIsMobile, () => false);
}
