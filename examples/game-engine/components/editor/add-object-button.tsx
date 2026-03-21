"use client";

import { useState, useRef, useEffect } from "react";
import {
  Plus,
  Box,
  Circle,
  Cylinder,
  Triangle,
  Sun,
  User,
  Volume2,
  Image,
  Video,
  Package,
  Users,
  Hexagon,
  Spline,
  Pentagon,
  Shapes,
} from "lucide-react";
import { useEditorStore } from "@/lib/store";
import { useIsMobile } from "@/lib/use-mobile";
import type { ObjectType } from "@/lib/types";

const sections = [
  {
    label: "Basic Shapes",
    items: [
      { type: "box" as ObjectType, label: "Box", icon: Box },
      { type: "sphere" as ObjectType, label: "Sphere", icon: Circle },
      { type: "cylinder" as ObjectType, label: "Cylinder", icon: Cylinder },
      { type: "cone" as ObjectType, label: "Cone", icon: Triangle },
      { type: "torus" as ObjectType, label: "Torus", icon: Circle },
      { type: "plane" as ObjectType, label: "Plane", icon: Box },
    ],
  },
  {
    label: "Advanced Shapes",
    items: [
      { type: "capsule" as ObjectType, label: "Capsule", icon: Cylinder },
      {
        type: "tetrahedron" as ObjectType,
        label: "Tetrahedron",
        icon: Triangle,
      },
      { type: "octahedron" as ObjectType, label: "Octahedron", icon: Circle },
      {
        type: "dodecahedron" as ObjectType,
        label: "Dodecahedron",
        icon: Circle,
      },
      { type: "icosahedron" as ObjectType, label: "Icosahedron", icon: Circle },
      { type: "knot" as ObjectType, label: "Knot", icon: Circle },
    ],
  },
  {
    label: "Custom Geometry",
    items: [
      { type: "extrude" as ObjectType, label: "Extrude", icon: Hexagon },
      { type: "tube" as ObjectType, label: "Tube", icon: Spline },
      { type: "shape" as ObjectType, label: "Shape", icon: Pentagon },
      { type: "mesh" as ObjectType, label: "Mesh", icon: Shapes },
    ],
  },
  {
    label: "Environment",
    items: [
      { type: "light" as ObjectType, label: "Light", icon: Sun },
      { type: "sound" as ObjectType, label: "Sound", icon: Volume2 },
    ],
  },
  {
    label: "Media",
    items: [
      { type: "image" as ObjectType, label: "Image", icon: Image },
      { type: "video" as ObjectType, label: "Video", icon: Video },
    ],
  },
  {
    label: "Entities",
    items: [
      { type: "player" as ObjectType, label: "Player", icon: User },
      { type: "character" as ObjectType, label: "Character", icon: Users },
      { type: "model" as ObjectType, label: "Model", icon: Package },
    ],
  },
];

export function AddObjectButton() {
  const [open, setOpen] = useState(false);
  const addObject = useEditorStore((s) => s.addObject);
  const popoverRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: PointerEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", handleClickOutside);
    return () =>
      document.removeEventListener("pointerdown", handleClickOutside);
  }, [open]);

  return (
    <div className="absolute bottom-4 left-4 z-10" ref={popoverRef}>
      {open && (
        <div
          className={`absolute bottom-14 left-0 ${isMobile ? "w-64" : "w-56"} bg-[#141414] border border-[#2a2a2a] rounded-lg shadow-xl overflow-hidden`}
        >
          <div className="max-h-80 overflow-y-auto py-1">
            {sections.map((section) => (
              <div key={section.label}>
                <div className="px-3 py-1.5 text-[9px] font-semibold text-[#555] uppercase tracking-wider">
                  {section.label}
                </div>
                {section.items.map((item) => (
                  <button
                    key={item.type}
                    onClick={() => {
                      addObject(item.type);
                      setOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 ${isMobile ? "py-2.5" : "py-1.5"} text-xs text-[#aaa] hover:text-white active:text-white hover:bg-white/5 active:bg-white/10 transition-colors`}
                  >
                    <item.icon size={isMobile ? 16 : 12} />
                    {item.label}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
      <button
        onClick={() => setOpen(!open)}
        className={`${isMobile ? "w-11 h-11" : "w-9 h-9"} flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 text-white transition-colors backdrop-blur-sm`}
        title="Add object"
      >
        <Plus size={isMobile ? 20 : 18} />
      </button>
    </div>
  );
}
