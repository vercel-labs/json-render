"use client";

import { useEditorStore } from "@/lib/store";
import { useIsMobile } from "@/lib/use-mobile";

export function HealthBar() {
  const health = useEditorStore((s) => s.health);
  const shield = useEditorStore((s) => s.shield);
  const maxHealth = useEditorStore((s) => s.maxHealth);
  const maxShield = useEditorStore((s) => s.maxShield);
  const isMobile = useIsMobile();

  const healthPct = (health / maxHealth) * 100;
  const shieldPct = (shield / maxShield) * 100;

  return (
    <div
      className={`absolute ${isMobile ? "top-14 left-3" : "bottom-4 left-4"} z-10 flex flex-col gap-1.5 pointer-events-none`}
    >
      {/* Shield bar */}
      <div className="flex items-center gap-2">
        <div className="text-[10px] text-blue-400 w-5 text-right font-mono">
          {Math.round(shield)}
        </div>
        <div
          className={`${isMobile ? "w-28" : "w-40"} h-2 bg-[#1a1a1a] rounded-full overflow-hidden`}
        >
          <div
            className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-300"
            style={{ width: `${shieldPct}%` }}
          />
        </div>
      </div>
      {/* Health bar */}
      <div className="flex items-center gap-2">
        <div
          className={`text-[10px] w-5 text-right font-mono ${
            health < 30 ? "text-red-400 animate-pulse-low" : "text-green-400"
          }`}
        >
          {Math.round(health)}
        </div>
        <div
          className={`${isMobile ? "w-28" : "w-40"} h-2 bg-[#1a1a1a] rounded-full overflow-hidden`}
        >
          <div
            className={`h-full transition-all duration-300 ${
              health < 30
                ? "bg-gradient-to-r from-red-600 to-red-400 animate-pulse-low"
                : "bg-gradient-to-r from-green-600 to-green-400"
            }`}
            style={{ width: `${healthPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
