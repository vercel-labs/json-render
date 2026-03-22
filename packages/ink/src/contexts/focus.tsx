import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useReducer,
  useState,
} from "react";
import { useInput } from "ink";

// =============================================================================
// Focus context — tracks which interactive component receives keyboard input.
// Tab/Shift+Tab cycles focus. useInput's `isActive` gates input delivery.
// =============================================================================

interface FocusContextValue {
  /** Register an interactive component by ID. */
  register: (id: string) => void;
  /** Unregister when unmounting. */
  unregister: (id: string) => void;
  /** The currently focused component's ID (or null). */
  focusedId: string | null;
  /** Check if a given ID is the focused component. */
  isFocused: (id: string) => boolean;
  /** Suppress Tab cycling (e.g. during modal dialogs). */
  setDisabled: (disabled: boolean) => void;
}

const FocusContext = createContext<FocusContextValue | null>(null);

// Reducer state combines ids and focusedId for atomic updates.
interface FocusState {
  ids: string[];
  focusedId: string | null;
}

type FocusAction =
  | { type: "register"; id: string }
  | { type: "unregister"; id: string }
  | { type: "cycle"; direction: "next" | "prev" };

function focusReducer(state: FocusState, action: FocusAction): FocusState {
  switch (action.type) {
    case "register": {
      if (state.ids.includes(action.id)) return state;
      const ids = [...state.ids, action.id];
      // Auto-focus if first interactive component
      const focusedId = state.focusedId ?? action.id;
      return { ids, focusedId };
    }
    case "unregister": {
      const ids = state.ids.filter((x) => x !== action.id);
      let focusedId = state.focusedId;
      if (focusedId === action.id) {
        // Move focus to first remaining element, or null
        focusedId = ids[0] ?? null;
      }
      return { ids, focusedId };
    }
    case "cycle": {
      const { ids, focusedId } = state;
      if (ids.length === 0) return { ...state, focusedId: null };
      const idx = focusedId ? ids.indexOf(focusedId) : -1;
      const next =
        action.direction === "next"
          ? ids[(idx + 1) % ids.length]!
          : ids[(idx - 1 + ids.length) % ids.length]!;
      return { ...state, focusedId: next };
    }
  }
}

export function FocusProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(focusReducer, {
    ids: [],
    focusedId: null,
  });
  const [disableCount, setDisableCount] = useState(0);
  const disabled = disableCount > 0;

  // Counter-based disable: multiple concurrent callers (e.g. nested modals)
  // each increment on mount and decrement on unmount. Focus is only re-enabled
  // when all callers have released.
  const setDisabled = useCallback((value: boolean) => {
    setDisableCount((prev) => (value ? prev + 1 : Math.max(0, prev - 1)));
  }, []);

  const register = useCallback(
    (id: string) => dispatch({ type: "register", id }),
    [],
  );

  const unregister = useCallback(
    (id: string) => dispatch({ type: "unregister", id }),
    [],
  );

  // When disabled (e.g. modal dialog open), all components report isActive=false
  // so their useInput({ isActive }) stops processing keystrokes.
  const isFocused = useCallback(
    (id: string) => !disabled && state.focusedId === id,
    [state.focusedId, disabled],
  );

  // Tab / Shift+Tab to cycle focus (suppressed when disabled, e.g. during modals)
  useInput((_input, key) => {
    if (disabled) return;
    if (!key.tab) return;
    dispatch({ type: "cycle", direction: key.shift ? "prev" : "next" });
  });

  const value = useMemo(
    () => ({
      register,
      unregister,
      focusedId: state.focusedId,
      isFocused,
      setDisabled,
    }),
    [register, unregister, state.focusedId, isFocused, setDisabled],
  );

  return (
    <FocusContext.Provider value={value}>{children}</FocusContext.Provider>
  );
}

/**
 * Hook for interactive components. Registers on mount via useEffect,
 * unregisters on unmount. Returns `isActive` boolean for gating `useInput`.
 *
 * Uses React.useId() for stable, instance-scoped IDs (no module-level counters).
 */
export function useFocus(): { isActive: boolean; id: string } {
  const ctx = useContext(FocusContext);
  const id = useId();

  useEffect(() => {
    ctx?.register(id);
    return () => {
      ctx?.unregister(id);
    };
  }, [ctx, id]);

  const isActive = ctx?.isFocused(id) ?? false;
  return { isActive, id };
}

/**
 * Hook to suppress/restore Tab cycling.
 * Used by modal dialogs (e.g. ConfirmDialog) to prevent background focus changes.
 *
 * Tracks the disabled value at effect time via a ref to avoid double-decrement
 * when the `disabled` prop toggles from true to false.
 */
export function useFocusDisable(disabled: boolean): void {
  const ctx = useContext(FocusContext);

  useEffect(() => {
    if (!disabled) return;
    ctx?.setDisabled(true);
    return () => {
      ctx?.setDisabled(false);
    };
  }, [ctx, disabled]);
}
