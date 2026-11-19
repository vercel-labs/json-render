import {
  createContext,
  useContext,
  type ParentProps,
  type JSX,
} from "solid-js";

export interface RepeatScopeValue {
  item: unknown;
  index: number;
  basePath: string;
}

const RepeatScopeContext = createContext<RepeatScopeValue | null>(null);

export function RepeatScopeProvider(
  props: ParentProps<RepeatScopeValue>,
): JSX.Element {
  return (
    <RepeatScopeContext.Provider
      value={{ item: props.item, index: props.index, basePath: props.basePath }}
    >
      {props.children}
    </RepeatScopeContext.Provider>
  );
}

export function useRepeatScope(): RepeatScopeValue | null {
  return useContext(RepeatScopeContext);
}
