"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import ConfettiExplosion from "react-confetti-explosion";
import { JSONUIProvider, Renderer } from "@json-render/react";
import type { Spec } from "@json-render/core";
import {
  registry,
  actionHandlers,
  computedFunctions,
  onConfetti,
} from "@/lib/render/registry";
import { examples } from "@/lib/examples";

function SpecRenderer({ spec }: { spec: Spec }): ReactNode {
  return (
    <JSONUIProvider
      registry={registry}
      initialState={spec.state ?? {}}
      handlers={actionHandlers}
      functions={computedFunctions}
    >
      <Renderer spec={spec} registry={registry} />
    </JSONUIProvider>
  );
}

export default function Page() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selected = examples[selectedIndex]!;
  const [confettiKey, setConfettiKey] = useState(0);
  const [confettiActive, setConfettiActive] = useState(false);

  const fireConfetti = useCallback(() => {
    setConfettiKey((k) => k + 1);
    setConfettiActive(true);
  }, []);

  useEffect(() => onConfetti(fireConfetti), [fireConfetti]);

  return (
    <div className="h-screen flex flex-col bg-muted/30">
      {/* Example selector */}
      <nav className="flex gap-1 p-3 overflow-x-auto border-b bg-background shrink-0">
        {examples.map((ex, i) => (
          <button
            key={ex.name}
            onClick={() => setSelectedIndex(i)}
            className={`px-3 py-1.5 text-sm rounded-md whitespace-nowrap transition-colors ${
              i === selectedIndex
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            }`}
          >
            {ex.name}
          </button>
        ))}
      </nav>

      {/* Render area */}
      <div className="flex-1 flex items-start justify-center overflow-auto p-6">
        <div className="relative bg-background border rounded-lg shadow-sm w-full max-w-[960px]">
          {confettiActive && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <ConfettiExplosion
                key={confettiKey}
                portal={false}
                force={0.8}
                duration={3500}
                particleCount={400}
                particleSize={8}
                colors={["#00F0FF", "#7B61FF", "#FF3DFF", "#00FF94", "#FFE14D"]}
                width={1600}
                height="200vh"
                zIndex={1}
                onComplete={() => setConfettiActive(false)}
              />
            </div>
          )}
          <div className="p-6 relative z-10">
            <p className="text-xs text-muted-foreground mb-4">
              {selected.description}
            </p>
            <SpecRenderer key={selectedIndex} spec={selected.spec} />
          </div>
        </div>
      </div>
    </div>
  );
}
