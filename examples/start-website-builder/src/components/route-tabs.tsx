import { useCallback, useState, type KeyboardEvent } from "react";

interface AddressBarProps {
  route: string;
  onNavigate: (route: string) => void;
}

export function AddressBar({ route, onNavigate }: AddressBarProps) {
  const [value, setValue] = useState(route);
  const [focused, setFocused] = useState(false);

  const commit = useCallback(() => {
    let normalized = value.trim();
    if (!normalized.startsWith("/")) normalized = "/" + normalized;
    onNavigate(normalized);
    setValue(normalized);
  }, [value, onNavigate]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        commit();
        (e.target as HTMLInputElement).blur();
      }
    },
    [commit],
  );

  const displayValue = focused ? value : route;

  return (
    <div className="flex items-center h-10 px-2 border-b border-border bg-muted/30">
      <div className="flex items-center flex-1 h-7 rounded-md border border-border bg-background px-2 gap-1.5">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-muted-foreground shrink-0"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
        <input
          type="text"
          value={displayValue}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => {
            setFocused(true);
            setValue(route);
          }}
          onBlur={() => {
            setFocused(false);
            commit();
          }}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          className="flex-1 bg-transparent text-xs font-mono text-foreground outline-none placeholder:text-muted-foreground"
          placeholder="/"
        />
      </div>
    </div>
  );
}
