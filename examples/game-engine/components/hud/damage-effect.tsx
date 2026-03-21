"use client";

import { useState, useEffect } from "react";

interface DamageEffectProps {
  lastDamageTime: number | null;
}

export function DamageEffect({ lastDamageTime }: DamageEffectProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!lastDamageTime) return;
    setShow(true);
    const timer = setTimeout(() => setShow(false), 400);
    return () => clearTimeout(timer);
  }, [lastDamageTime]);

  if (!show) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-20 animate-screen-flash bg-red-600/30 rounded-none" />
  );
}
