"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Eye, EyeOff, Trash2 } from "lucide-react";
import { useEditorStore } from "@/lib/store";
import { useIsMobile } from "@/lib/use-mobile";
import type { SceneObject, Physics, LightType } from "@/lib/types";

function Section({
  label,
  defaultOpen = true,
  children,
}: {
  label: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-[#1e1e1e]">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-1.5 px-3 py-2.5 sm:py-2 text-[10px] font-semibold text-[#666] uppercase tracking-wider hover:text-[#999] active:text-[#999] min-h-[44px] sm:min-h-0"
      >
        {open ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
        {label}
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-2.5 sm:space-y-2">{children}</div>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-[10px] text-[#666] w-16 flex-shrink-0">
        {label}
      </label>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  step = 0.1,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <input
      type="number"
      value={value != null ? Number(value.toFixed(3)) : 0}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      step={step}
      className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-1.5 py-1 sm:py-0.5 text-xs sm:text-[11px] text-[#ccc] outline-none focus:border-[#555]"
    />
  );
}

function Vec3Input({
  value,
  onChange,
  labels = ["X", "Y", "Z"],
}: {
  value: [number, number, number];
  onChange: (v: [number, number, number]) => void;
  labels?: [string, string, string];
}) {
  return (
    <div className="flex gap-1">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex-1">
          <div className="text-[8px] text-[#555] mb-0.5">{labels[i]}</div>
          <NumberInput
            value={value[i] ?? 0}
            onChange={(v) => {
              const next = [...value] as [number, number, number];
              next[i] = v;
              onChange(next);
            }}
          />
        </div>
      ))}
    </div>
  );
}

function ColorInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-8 h-8 sm:w-6 sm:h-6 rounded border border-[#2a2a2a] cursor-pointer bg-transparent"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded px-1.5 py-1 sm:py-0.5 text-xs sm:text-[11px] text-[#ccc] outline-none focus:border-[#555]"
      />
    </div>
  );
}

function SelectInput({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-1.5 py-1 sm:py-0.5 text-xs sm:text-[11px] text-[#ccc] outline-none focus:border-[#555]"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

function CheckboxInput({
  value,
  onChange,
  label,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-2 text-xs sm:text-[11px] text-[#ccc] cursor-pointer py-0.5">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded border-[#2a2a2a] w-4 h-4 sm:w-3.5 sm:h-3.5"
      />
      {label}
    </label>
  );
}

function ObjectListItem({ obj }: { obj: SceneObject }) {
  const {
    selectedObjectId,
    selectObject,
    removeObject,
    toggleObjectVisibility,
  } = useEditorStore();
  const isSelected = selectedObjectId === obj.id;
  const isMobile = useIsMobile();

  return (
    <div
      className={`group flex items-center justify-between px-2 ${isMobile ? "py-2" : "py-1"} rounded cursor-pointer text-[11px] ${
        isSelected
          ? "bg-white/10 text-white"
          : "text-[#888] hover:text-[#ccc] hover:bg-white/5"
      }`}
      onClick={() => selectObject(obj.id)}
    >
      <span className="truncate">{obj.name}</span>
      <div
        className={`${isMobile || isSelected ? "flex" : "hidden group-hover:flex"} items-center gap-1`}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleObjectVisibility(obj.id);
          }}
          className={`${isMobile ? "p-1.5" : "p-0.5"} text-[#666] hover:text-white active:text-white`}
        >
          {obj.visible ? (
            <Eye size={isMobile ? 14 : 10} />
          ) : (
            <EyeOff size={isMobile ? 14 : 10} />
          )}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            removeObject(obj.id);
          }}
          className={`${isMobile ? "p-1.5" : "p-0.5"} text-[#666] hover:text-red-400 active:text-red-400`}
        >
          <Trash2 size={isMobile ? 14 : 10} />
        </button>
      </div>
    </div>
  );
}

function TransformEditor({ obj }: { obj: SceneObject }) {
  const updateObjectTransform = useEditorStore((s) => s.updateObjectTransform);
  const saveToHistory = useEditorStore((s) => s.saveToHistory);

  return (
    <Section label="Transform">
      <Field label="Position">
        <Vec3Input
          value={obj.position}
          onChange={(v) => {
            updateObjectTransform(obj.id, { position: v });
            saveToHistory();
          }}
        />
      </Field>
      <Field label="Rotation">
        <Vec3Input
          value={obj.rotation}
          onChange={(v) => {
            updateObjectTransform(obj.id, { rotation: v });
            saveToHistory();
          }}
        />
      </Field>
      <Field label="Scale">
        <Vec3Input
          value={obj.scale}
          onChange={(v) => {
            updateObjectTransform(obj.id, { scale: v });
            saveToHistory();
          }}
        />
      </Field>
    </Section>
  );
}

function MaterialEditor({ obj }: { obj: SceneObject }) {
  const updateObjectMaterial = useEditorStore((s) => s.updateObjectMaterial);

  return (
    <Section label="Material">
      <Field label="Color">
        <ColorInput
          value={obj.material.color}
          onChange={(v) => updateObjectMaterial(obj.id, { color: v })}
        />
      </Field>
      <Field label="Metalness">
        <NumberInput
          value={obj.material.metalness}
          onChange={(v) => updateObjectMaterial(obj.id, { metalness: v })}
          step={0.05}
        />
      </Field>
      <Field label="Roughness">
        <NumberInput
          value={obj.material.roughness}
          onChange={(v) => updateObjectMaterial(obj.id, { roughness: v })}
          step={0.05}
        />
      </Field>
      <Field label="Emissive">
        <ColorInput
          value={obj.material.emissive}
          onChange={(v) => updateObjectMaterial(obj.id, { emissive: v })}
        />
      </Field>
      <Field label="Emit Int.">
        <NumberInput
          value={obj.material.emissiveIntensity}
          onChange={(v) =>
            updateObjectMaterial(obj.id, { emissiveIntensity: v })
          }
          step={0.1}
        />
      </Field>
    </Section>
  );
}

function PhysicsEditor({ obj }: { obj: SceneObject }) {
  const updateObjectPhysics = useEditorStore((s) => s.updateObjectPhysics);

  return (
    <Section label="Physics" defaultOpen={false}>
      <Field label="Collider">
        <SelectInput
          value={obj.physics.colliderType}
          onChange={(v) =>
            updateObjectPhysics(obj.id, {
              colliderType: v as Physics["colliderType"],
            })
          }
          options={[
            { value: "none", label: "None" },
            { value: "cuboid", label: "Cuboid" },
            { value: "ball", label: "Ball" },
            { value: "capsule", label: "Capsule" },
          ]}
        />
      </Field>
      {obj.physics.colliderType !== "none" && (
        <>
          <Field label="Mass">
            <NumberInput
              value={obj.physics.mass}
              onChange={(v) => updateObjectPhysics(obj.id, { mass: v })}
            />
          </Field>
          <CheckboxInput
            value={obj.physics.isStatic}
            onChange={(v) => updateObjectPhysics(obj.id, { isStatic: v })}
            label="Static"
          />
          <Field label="Bounce">
            <NumberInput
              value={obj.physics.restitution}
              onChange={(v) => updateObjectPhysics(obj.id, { restitution: v })}
              step={0.05}
            />
          </Field>
          <Field label="Friction">
            <NumberInput
              value={obj.physics.friction}
              onChange={(v) => updateObjectPhysics(obj.id, { friction: v })}
              step={0.05}
            />
          </Field>
        </>
      )}
    </Section>
  );
}

function DamageEditor({ obj }: { obj: SceneObject }) {
  const updateDamage = useEditorStore((s) => s.updateDamage);
  const dmg = obj.damage || { amount: 0, enabled: false };

  return (
    <Section label="Damage" defaultOpen={false}>
      <CheckboxInput
        value={dmg.enabled}
        onChange={(v) => updateDamage(obj.id, { enabled: v })}
        label="Enabled"
      />
      {dmg.enabled && (
        <Field label="Amount">
          <NumberInput
            value={dmg.amount}
            onChange={(v) => updateDamage(obj.id, { amount: v })}
            step={1}
          />
        </Field>
      )}
    </Section>
  );
}

function LightEditor({ obj }: { obj: SceneObject }) {
  const updateObjectGeneral = useEditorStore((s) => s.updateObjectGeneral);

  return (
    <Section label="Light">
      <Field label="Type">
        <SelectInput
          value={obj.lightType || "point"}
          onChange={(v) =>
            updateObjectGeneral(obj.id, { lightType: v as LightType })
          }
          options={[
            { value: "ambient", label: "Ambient" },
            { value: "directional", label: "Directional" },
            { value: "point", label: "Point" },
            { value: "spot", label: "Spot" },
          ]}
        />
      </Field>
      <Field label="Intensity">
        <NumberInput
          value={obj.intensity ?? 1}
          onChange={(v) => updateObjectGeneral(obj.id, { intensity: v })}
          step={0.1}
        />
      </Field>
      {(obj.lightType === "point" || obj.lightType === "spot") && (
        <Field label="Distance">
          <NumberInput
            value={obj.distance ?? 0}
            onChange={(v) => updateObjectGeneral(obj.id, { distance: v })}
          />
        </Field>
      )}
      {obj.lightType === "spot" && (
        <>
          <Field label="Angle">
            <NumberInput
              value={obj.angle ?? Math.PI / 3}
              onChange={(v) => updateObjectGeneral(obj.id, { angle: v })}
              step={0.05}
            />
          </Field>
          <Field label="Penumbra">
            <NumberInput
              value={obj.penumbra ?? 0}
              onChange={(v) => updateObjectGeneral(obj.id, { penumbra: v })}
              step={0.05}
            />
          </Field>
        </>
      )}
    </Section>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded px-1.5 py-1 sm:py-0.5 text-xs sm:text-[11px] text-[#ccc] outline-none focus:border-[#555] placeholder:text-[#444]"
    />
  );
}

function ModelUrlEditor({ obj }: { obj: SceneObject }) {
  const updateObjectGeneral = useEditorStore((s) => s.updateObjectGeneral);

  return (
    <Section label="Model">
      <Field label="URL">
        <TextInput
          value={obj.modelUrl || ""}
          onChange={(v) => updateObjectGeneral(obj.id, { modelUrl: v })}
          placeholder="/models/example.glb"
        />
      </Field>
      <p className="text-[9px] text-[#555] leading-relaxed">
        Enter a URL to a .glb or .gltf file. Place files in public/models/ to
        use local paths like /models/file.glb
      </p>
    </Section>
  );
}

function CharacterEditor({ obj }: { obj: SceneObject }) {
  const updateCharacter = useEditorStore((s) => s.updateCharacter);
  const role = obj.character?.role || "";

  return (
    <Section label="Character" defaultOpen={false}>
      <Field label="Role">
        <TextInput
          value={role}
          onChange={(v) => updateCharacter(obj.id, { role: v })}
          placeholder="e.g. village guard, merchant"
        />
      </Field>
    </Section>
  );
}

function EnvironmentEditor() {
  const scenes = useEditorStore((s) => s.scenes);
  const activeSceneId = useEditorStore((s) => s.activeSceneId);
  const updateEnvironmentSettings = useEditorStore(
    (s) => s.updateEnvironmentSettings,
  );
  const activeScene = scenes.find((s) => s.id === activeSceneId);
  if (!activeScene) return null;
  const env = activeScene.environmentSettings;

  return (
    <Section label="Environment" defaultOpen={false}>
      <Field label="Preset">
        <SelectInput
          value={env.preset}
          onChange={(v) => updateEnvironmentSettings({ preset: v })}
          options={[
            { value: "apartment", label: "Apartment" },
            { value: "city", label: "City" },
            { value: "dawn", label: "Dawn" },
            { value: "forest", label: "Forest" },
            { value: "lobby", label: "Lobby" },
            { value: "night", label: "Night" },
            { value: "park", label: "Park" },
            { value: "studio", label: "Studio" },
            { value: "sunset", label: "Sunset" },
            { value: "warehouse", label: "Warehouse" },
          ]}
        />
      </Field>
      <Field label="Intensity">
        <NumberInput
          value={env.intensity}
          onChange={(v) => updateEnvironmentSettings({ intensity: v })}
          step={0.1}
        />
      </Field>
      <Field label="Blur">
        <NumberInput
          value={env.blur}
          onChange={(v) => updateEnvironmentSettings({ blur: v })}
          step={0.1}
        />
      </Field>
    </Section>
  );
}

function FogEditor() {
  const scenes = useEditorStore((s) => s.scenes);
  const activeSceneId = useEditorStore((s) => s.activeSceneId);
  const updateSceneSettings = useEditorStore((s) => s.updateSceneSettings);
  const activeScene = scenes.find((s) => s.id === activeSceneId);
  if (!activeScene) return null;
  const fog = activeScene.sceneSettings.fog;

  return (
    <Section label="Fog" defaultOpen={false}>
      <CheckboxInput
        value={fog.enabled}
        onChange={(v) => updateSceneSettings({ fog: { ...fog, enabled: v } })}
        label="Enabled"
      />
      {fog.enabled && (
        <>
          <Field label="Color">
            <ColorInput
              value={fog.color}
              onChange={(v) =>
                updateSceneSettings({ fog: { ...fog, color: v } })
              }
            />
          </Field>
          <Field label="Near">
            <NumberInput
              value={fog.near}
              onChange={(v) =>
                updateSceneSettings({ fog: { ...fog, near: v } })
              }
            />
          </Field>
          <Field label="Far">
            <NumberInput
              value={fog.far}
              onChange={(v) => updateSceneSettings({ fog: { ...fog, far: v } })}
            />
          </Field>
        </>
      )}
    </Section>
  );
}

function GridEditor() {
  const scenes = useEditorStore((s) => s.scenes);
  const activeSceneId = useEditorStore((s) => s.activeSceneId);
  const updateSceneSettings = useEditorStore((s) => s.updateSceneSettings);
  const activeScene = scenes.find((s) => s.id === activeSceneId);
  if (!activeScene) return null;
  const grid = activeScene.sceneSettings.grid;

  return (
    <Section label="Grid" defaultOpen={false}>
      <CheckboxInput
        value={grid.visible}
        onChange={(v) => updateSceneSettings({ grid: { ...grid, visible: v } })}
        label="Visible"
      />
      {grid.visible && (
        <>
          <Field label="Size">
            <NumberInput
              value={grid.size}
              onChange={(v) =>
                updateSceneSettings({ grid: { ...grid, size: v } })
              }
              step={0.5}
            />
          </Field>
          <Field label="Divisions">
            <NumberInput
              value={grid.divisions}
              onChange={(v) =>
                updateSceneSettings({
                  grid: { ...grid, divisions: Math.max(1, Math.round(v)) },
                })
              }
              step={1}
            />
          </Field>
          <Field label="Fade Dist">
            <NumberInput
              value={grid.fadeDistance}
              onChange={(v) =>
                updateSceneSettings({ grid: { ...grid, fadeDistance: v } })
              }
              step={10}
            />
          </Field>
          <Field label="Fade Str">
            <NumberInput
              value={grid.fadeStrength}
              onChange={(v) =>
                updateSceneSettings({ grid: { ...grid, fadeStrength: v } })
              }
              step={0.1}
            />
          </Field>
        </>
      )}
    </Section>
  );
}

export function SceneInspector() {
  const scenes = useEditorStore((s) => s.scenes);
  const activeSceneId = useEditorStore((s) => s.activeSceneId);
  const selectedObjectId = useEditorStore((s) => s.selectedObjectId);

  const activeScene = scenes.find((s) => s.id === activeSceneId);
  const objects = activeScene?.objects ?? [];
  const selectedObj = selectedObjectId
    ? objects.find((o) => o.id === selectedObjectId)
    : null;

  return (
    <div className="flex flex-col h-full">
      {/* Object list */}
      <Section label="Scene Objects">
        <div className="space-y-0.5 max-h-40 overflow-y-auto">
          {objects.map((obj) => (
            <ObjectListItem key={obj.id} obj={obj} />
          ))}
        </div>
      </Section>

      {/* Selected object editors */}
      {selectedObj && (
        <>
          <div className="px-3 py-1.5 border-b border-[#1e1e1e]">
            <div className="text-[10px] text-[#555] uppercase tracking-wider">
              {selectedObj.name}
            </div>
          </div>
          <TransformEditor obj={selectedObj} />
          {selectedObj.type !== "light" &&
            selectedObj.type !== "player" &&
            selectedObj.type !== "sound" && (
              <MaterialEditor obj={selectedObj} />
            )}
          {selectedObj.type !== "light" && selectedObj.type !== "player" && (
            <PhysicsEditor obj={selectedObj} />
          )}
          {selectedObj.type !== "light" &&
            selectedObj.type !== "player" &&
            selectedObj.type !== "sound" && <DamageEditor obj={selectedObj} />}
          {selectedObj.type === "light" && <LightEditor obj={selectedObj} />}
          {(selectedObj.type === "model" ||
            selectedObj.type === "character") && (
            <ModelUrlEditor obj={selectedObj} />
          )}
          {selectedObj.type === "character" && (
            <CharacterEditor obj={selectedObj} />
          )}
        </>
      )}

      {/* Scene-level editors */}
      <EnvironmentEditor />
      <FogEditor />
      <GridEditor />
    </div>
  );
}
