import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import type {
  EditorState,
  Scene,
  SceneObject,
  ObjectType,
  TransformMode,
  ViewMode,
} from "./types";
import {
  createDefaultScene,
  createDefaultObject,
  createDefaultGrass,
  createDefaultAmbientLight,
  createDefaultPlayer,
  createDefaultSceneSettings,
  createDefaultEnvironmentSettings,
} from "./defaults";

function saveHistory(state: EditorState): Partial<EditorState> {
  return {
    history: {
      past: [...state.history.past.slice(-49), state.scenes],
      future: [],
    },
    canUndo: true,
    canRedo: false,
  };
}

const initialScene = createDefaultScene();

export const useEditorStore = create<EditorState>((set, get) => ({
  scenes: [initialScene],
  activeSceneId: initialScene.id,
  selectedObjectId: null,
  transformMode: "translate" as TransformMode,
  isPlaying: false,
  isLoading: false,
  viewMode: "first-person" as ViewMode,
  isPromptOpen: false,

  health: 100,
  shield: 50,
  maxHealth: 100,
  maxShield: 100,
  lastDamageTime: null,
  damageCooldown: 0.5,

  history: { past: [], future: [] },
  canUndo: false,
  canRedo: false,

  get activeScene() {
    const state = get();
    return (
      state.scenes.find((s) => s.id === state.activeSceneId) || state.scenes[0]
    );
  },
  get activeSceneObjects() {
    const state = get();
    const scene =
      state.scenes.find((s) => s.id === state.activeSceneId) || state.scenes[0];
    return scene ? scene.objects : [];
  },

  // Scene actions
  createScene: (name = "New Scene") =>
    set((state) => {
      const newSceneId = uuidv4();
      const newScene: Scene = {
        id: newSceneId,
        name,
        description: "",
        isDefault: state.scenes.length === 0,
        objects: [
          createDefaultGrass(),
          createDefaultAmbientLight(),
          createDefaultPlayer(),
        ],
        sceneSettings: createDefaultSceneSettings(),
        environmentSettings: createDefaultEnvironmentSettings(),
      };
      return {
        scenes: [...state.scenes, newScene],
        activeSceneId: newSceneId,
        selectedObjectId: null,
      };
    }),

  deleteScene: (id) =>
    set((state) => {
      if (state.scenes.length <= 1) return state;
      const updated = state.scenes.filter((s) => s.id !== id);
      const deletedWasDefault = state.scenes.find(
        (s) => s.id === id,
      )?.isDefault;
      if (deletedWasDefault && updated[0]) updated[0].isDefault = true;
      return {
        scenes: updated,
        activeSceneId:
          state.activeSceneId === id ? updated[0]!.id : state.activeSceneId,
        selectedObjectId: null,
      };
    }),

  duplicateScene: (id) =>
    set((state) => {
      const src = state.scenes.find((s) => s.id === id);
      if (!src) return state;
      const newId = uuidv4();
      const clone: Scene = {
        ...JSON.parse(JSON.stringify(src)),
        id: newId,
        name: `${src.name} (Copy)`,
        isDefault: false,
      };
      return {
        scenes: [...state.scenes, clone],
        activeSceneId: newId,
        selectedObjectId: null,
      };
    }),

  setActiveScene: (id) =>
    set((state) => {
      if (!state.scenes.some((s) => s.id === id)) return state;
      return { activeSceneId: id, selectedObjectId: null };
    }),

  updateSceneName: (id, name) =>
    set((state) => ({
      scenes: state.scenes.map((s) => (s.id === id ? { ...s, name } : s)),
    })),

  updateSceneDescription: (id, description) =>
    set((state) => ({
      scenes: state.scenes.map((s) =>
        s.id === id ? { ...s, description } : s,
      ),
    })),

  // Object actions
  addObject: (type: ObjectType) =>
    set((state) => {
      const scene = state.scenes.find((s) => s.id === state.activeSceneId);
      if (!scene) return state;
      if (type === "player" && scene.objects.some((o) => o.type === "player"))
        return state;

      const id = uuidv4();
      const newObj = createDefaultObject(type, id, scene.objects.length);

      if (type === "light") {
        const lightCount = scene.objects.filter(
          (o) => o.type === "light",
        ).length;
        if (lightCount === 0) {
          newObj.name = "Ambient Light";
          newObj.intensity = 0.5;
          newObj.position = [0, 3, 0];
          newObj.lightType = "ambient";
        } else if (lightCount === 1) {
          newObj.name = "Directional Light";
          newObj.intensity = 1;
          newObj.position = [10, 10, 10];
          newObj.lightType = "directional";
        } else {
          newObj.name = "Point Light";
          newObj.intensity = 1;
          newObj.distance = 10;
          newObj.lightType = "point";
        }
      }

      const updatedScenes = state.scenes.map((s) =>
        s.id === state.activeSceneId
          ? { ...s, objects: [...s.objects, newObj] }
          : s,
      );
      return {
        ...saveHistory({ ...state, scenes: updatedScenes }),
        scenes: updatedScenes,
        selectedObjectId: id,
      };
    }),

  createCustomObject: (type: ObjectType, properties: Partial<SceneObject>) =>
    set((state) => {
      const scene = state.scenes.find((s) => s.id === state.activeSceneId);
      if (!scene) return state;
      if (type === "player" && scene.objects.some((o) => o.type === "player"))
        return state;

      const id = uuidv4();
      const base = createDefaultObject(type, id, scene.objects.length);
      const newObj: SceneObject = {
        ...base,
        ...properties,
        id,
        type,
        material: { ...base.material, ...(properties.material || {}) },
        physics: { ...base.physics, ...(properties.physics || {}) },
      };

      if (type === "light" && properties.lightType) {
        newObj.lightType = properties.lightType;
        if (
          properties.lightType === "ambient" &&
          properties.intensity === undefined
        )
          newObj.intensity = 0.5;
        if (properties.lightType === "spot" && properties.angle === undefined)
          newObj.angle = Math.PI / 3;
        if (
          properties.lightType === "spot" &&
          properties.penumbra === undefined
        )
          newObj.penumbra = 0;
      }

      if (type === "plane") {
        newObj.scale[2] = 1;
        if (!properties.rotation) newObj.rotation = [-Math.PI / 2, 0, 0];
      }

      const updatedScenes = state.scenes.map((s) =>
        s.id === state.activeSceneId
          ? { ...s, objects: [...s.objects, newObj] }
          : s,
      );
      return {
        ...saveHistory({ ...state, scenes: updatedScenes }),
        scenes: updatedScenes,
        selectedObjectId: id,
      };
    }),

  removeObject: (id) =>
    set((state) => {
      const updatedScenes = state.scenes.map((s) =>
        s.id === state.activeSceneId
          ? { ...s, objects: s.objects.filter((o) => o.id !== id) }
          : s,
      );
      return {
        ...saveHistory({ ...state, scenes: updatedScenes }),
        scenes: updatedScenes,
        selectedObjectId:
          state.selectedObjectId === id ? null : state.selectedObjectId,
      };
    }),

  replaceSceneObjects: (objects: SceneObject[]) =>
    set((state) => {
      const updatedScenes = state.scenes.map((s) =>
        s.id === state.activeSceneId ? { ...s, objects } : s,
      );
      const selectionStillExists =
        state.selectedObjectId != null &&
        objects.some((o) => o.id === state.selectedObjectId);
      return {
        ...saveHistory({ ...state, scenes: updatedScenes }),
        scenes: updatedScenes,
        selectedObjectId: selectionStillExists ? state.selectedObjectId : null,
      };
    }),

  initializePlayer: () =>
    set((state) => {
      const scene = state.scenes.find((s) => s.id === state.activeSceneId);
      if (!scene || scene.objects.some((o) => o.type === "player"))
        return state;
      const player = createDefaultPlayer();
      const updatedScenes = state.scenes.map((s) =>
        s.id === state.activeSceneId
          ? { ...s, objects: [...s.objects, player] }
          : s,
      );
      return { scenes: updatedScenes };
    }),

  // Updates
  selectObject: (id) => set({ selectedObjectId: id }),

  updateObjectTransform: (id, transform) =>
    set((state) => {
      const updatedScenes = state.scenes.map((s) => {
        if (s.id !== state.activeSceneId) return s;
        return {
          ...s,
          objects: s.objects.map((o) => {
            if (o.id !== id) return o;
            const t = { ...transform };
            if (o.type === "plane" && t.scale)
              (t.scale as [number, number, number])[2] = 1;
            return { ...o, ...t };
          }),
        };
      });
      return { scenes: updatedScenes };
    }),

  updateObjectMaterial: (id, material) =>
    set((state) => {
      const updatedScenes = state.scenes.map((s) => {
        if (s.id !== state.activeSceneId) return s;
        return {
          ...s,
          objects: s.objects.map((o) =>
            o.id === id
              ? { ...o, material: { ...o.material, ...material } }
              : o,
          ),
        };
      });
      return {
        ...saveHistory({ ...state, scenes: updatedScenes }),
        scenes: updatedScenes,
      };
    }),

  updateObjectPhysics: (id, physics) =>
    set((state) => {
      const updatedScenes = state.scenes.map((s) => {
        if (s.id !== state.activeSceneId) return s;
        return {
          ...s,
          objects: s.objects.map((o) =>
            o.id === id ? { ...o, physics: { ...o.physics, ...physics } } : o,
          ),
        };
      });
      return {
        ...saveHistory({ ...state, scenes: updatedScenes }),
        scenes: updatedScenes,
      };
    }),

  updateCharacter: (id, character) =>
    set((state) => {
      const updatedScenes = state.scenes.map((s) => {
        if (s.id !== state.activeSceneId) return s;
        return {
          ...s,
          objects: s.objects.map((o) =>
            o.id === id
              ? {
                  ...o,
                  character: { ...(o.character || { role: "" }), ...character },
                }
              : o,
          ),
        };
      });
      return {
        ...saveHistory({ ...state, scenes: updatedScenes }),
        scenes: updatedScenes,
      };
    }),

  updateSound: (id, soundUpdates) =>
    set((state) => {
      const updatedScenes = state.scenes.map((s) => {
        if (s.id !== state.activeSceneId) return s;
        return {
          ...s,
          objects: s.objects.map((o) => {
            if (o.id !== id) return o;
            const current = o.sound || {
              url: "",
              loop: false,
              volume: 1,
              positional: true,
              distance: 10,
            };
            return { ...o, sound: { ...current, ...soundUpdates } };
          }),
        };
      });
      return {
        ...saveHistory({ ...state, scenes: updatedScenes }),
        scenes: updatedScenes,
      };
    }),

  updateMedia: (id, mediaUpdates) =>
    set((state) => {
      const updatedScenes = state.scenes.map((s) => {
        if (s.id !== state.activeSceneId) return s;
        return {
          ...s,
          objects: s.objects.map((o) => {
            if (o.id !== id) return o;
            const current = o.media || {
              url: "",
              type: "image",
              loop: false,
              autoplay: false,
              muted: true,
            };
            return { ...o, media: { ...current, ...mediaUpdates } };
          }),
        };
      });
      return {
        ...saveHistory({ ...state, scenes: updatedScenes }),
        scenes: updatedScenes,
      };
    }),

  updateDamage: (id, damageUpdates) =>
    set((state) => {
      const updatedScenes = state.scenes.map((s) => {
        if (s.id !== state.activeSceneId) return s;
        return {
          ...s,
          objects: s.objects.map((o) => {
            if (o.id !== id) return o;
            const current = o.damage || { amount: 0, enabled: false };
            return { ...o, damage: { ...current, ...damageUpdates } };
          }),
        };
      });
      return {
        ...saveHistory({ ...state, scenes: updatedScenes }),
        scenes: updatedScenes,
      };
    }),

  updateSceneSettings: (settings) =>
    set((state) => {
      const updatedScenes = state.scenes.map((s) => {
        if (s.id !== state.activeSceneId) return s;
        return {
          ...s,
          sceneSettings: {
            ...s.sceneSettings,
            ...settings,
            grid: { ...s.sceneSettings.grid, ...(settings.grid || {}) },
            fog: { ...s.sceneSettings.fog, ...(settings.fog || {}) },
          },
        };
      });
      return {
        ...saveHistory({ ...state, scenes: updatedScenes }),
        scenes: updatedScenes,
      };
    }),

  updateEnvironmentSettings: (settings) =>
    set((state) => {
      const updatedScenes = state.scenes.map((s) => {
        if (s.id !== state.activeSceneId) return s;
        return {
          ...s,
          environmentSettings: { ...s.environmentSettings, ...settings },
        };
      });
      return {
        ...saveHistory({ ...state, scenes: updatedScenes }),
        scenes: updatedScenes,
      };
    }),

  updateObjectGeneral: (id, updates) =>
    set((state) => {
      const updatedScenes = state.scenes.map((s) => {
        if (s.id !== state.activeSceneId) return s;
        return {
          ...s,
          objects: s.objects.map((o) => {
            if (o.id !== id) return o;
            if (o.type === "plane" && updates.scale) updates.scale[2] = 1;
            return { ...o, ...updates };
          }),
        };
      });
      return {
        ...saveHistory({ ...state, scenes: updatedScenes }),
        scenes: updatedScenes,
      };
    }),

  toggleObjectVisibility: (id) =>
    set((state) => {
      const updatedScenes = state.scenes.map((s) => {
        if (s.id !== state.activeSceneId) return s;
        return {
          ...s,
          objects: s.objects.map((o) =>
            o.id === id ? { ...o, visible: !o.visible } : o,
          ),
        };
      });
      return {
        ...saveHistory({ ...state, scenes: updatedScenes }),
        scenes: updatedScenes,
      };
    }),

  // UI state
  setTransformMode: (mode) => set({ transformMode: mode }),
  setIsPlaying: (playing) =>
    set((state) => ({
      isPlaying: playing,
      selectedObjectId: playing ? null : state.selectedObjectId,
      health: playing ? state.maxHealth : state.health,
      shield: playing ? state.maxShield : state.shield,
      isPromptOpen: playing ? false : state.isPromptOpen,
    })),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setIsPromptOpen: (open) => set({ isPromptOpen: open }),

  // History
  saveToHistory: () => set((state) => saveHistory(state)),

  undo: () =>
    set((state) => {
      if (state.history.past.length === 0) return state;
      const prev = state.history.past[state.history.past.length - 1]!;
      return {
        scenes: prev,
        history: {
          past: state.history.past.slice(0, -1),
          future: [state.scenes, ...state.history.future],
        },
        canUndo: state.history.past.length > 1,
        canRedo: true,
      };
    }),

  redo: () =>
    set((state) => {
      if (state.history.future.length === 0) return state;
      const next = state.history.future[0]!;
      return {
        scenes: next,
        history: {
          past: [...state.history.past, state.scenes],
          future: state.history.future.slice(1),
        },
        canUndo: true,
        canRedo: state.history.future.length > 1,
      };
    }),

  // Health
  setHealth: (health) =>
    set((state) => ({
      health: Math.max(0, Math.min(health, state.maxHealth)),
    })),
  setShield: (shield) =>
    set((state) => ({
      shield: Math.max(0, Math.min(shield, state.maxShield)),
    })),
  takeDamage: (amount) =>
    set((state) => {
      const now = Date.now();
      if (
        state.lastDamageTime &&
        now - state.lastDamageTime < state.damageCooldown * 1000
      )
        return state;

      let remainingShield = state.shield;
      let remainingHealth = state.health;
      let remaining = amount;

      if (remainingShield > 0) {
        if (remainingShield >= remaining) {
          remainingShield -= remaining;
          remaining = 0;
        } else {
          remaining -= remainingShield;
          remainingShield = 0;
        }
      }
      if (remaining > 0)
        remainingHealth = Math.max(0, remainingHealth - remaining);

      return {
        shield: remainingShield,
        health: remainingHealth,
        lastDamageTime: now,
      };
    }),
}));
