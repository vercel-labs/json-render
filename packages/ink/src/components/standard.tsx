import { useState, useEffect, useMemo } from "react";
import {
  Box,
  Text,
  Newline as InkNewline,
  Spacer as InkSpacer,
  useInput,
} from "ink";
import { marked, type Token, type Tokens } from "marked";
import type { ComponentRenderProps, ComponentRegistry } from "../renderer";
import { useBoundProp } from "../hooks";
import { useFocus } from "../contexts/focus";

// =============================================================================
// Layout Components (Ink Primitives)
// =============================================================================

// Props that must never be forwarded from AI-generated specs to React/Ink elements.
const BLOCKED_PROPS = new Set([
  "key",
  "ref",
  "children",
  "dangerouslySetInnerHTML",
  "style",
  "className",
  "id",
]);

// Colors that are invisible on typical dark terminal backgrounds.
const INVISIBLE_COLORS = new Set(["black", "#000", "#000000"]);

/** Return undefined for colors that would be invisible on dark terminals. */
function safeColor(color: string | undefined): string | undefined {
  if (color && INVISIBLE_COLORS.has(color)) return undefined;
  return color;
}

// Strip null values so Ink's default layout applies (Ink has no concept of null props)
// and block dangerous or web-only props from AI-generated specs.
function safeBoxProps(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && !BLOCKED_PROPS.has(k)) {
      // Drop foreground colors that would be invisible on dark backgrounds
      if (k === "color" && typeof v === "string" && INVISIBLE_COLORS.has(v)) {
        continue;
      }
      result[k] = v;
    }
  }
  return result;
}

function BoxComponent({ element, children }: ComponentRenderProps) {
  const p = element.props as Record<string, unknown>;

  return <Box {...safeBoxProps(p)}>{children}</Box>;
}

function TextComponent({ element }: ComponentRenderProps) {
  const { text, ...style } = element.props as Record<string, unknown>;

  return <Text {...safeBoxProps(style)}>{(text as string) ?? ""}</Text>;
}

function NewlineComponent({ element }: ComponentRenderProps) {
  const p = element.props as { count?: number };
  return <InkNewline count={p.count} />;
}

function SpacerComponent() {
  return <InkSpacer />;
}

// =============================================================================
// Content Components (Higher-Level)
// =============================================================================

function HeadingComponent({ element }: ComponentRenderProps) {
  const p = element.props as {
    text?: string;
    level?: "h1" | "h2" | "h3" | "h4";
    color?: string;
  };

  const level = p.level ?? "h2";

  switch (level) {
    case "h1":
      return (
        <Text bold underline color={safeColor(p.color)}>
          {p.text ?? ""}
        </Text>
      );
    case "h2":
      return (
        <Text bold color={safeColor(p.color)}>
          {p.text ?? ""}
        </Text>
      );
    case "h3":
      return (
        <Text bold dimColor color={safeColor(p.color)}>
          {p.text ?? ""}
        </Text>
      );
    case "h4":
    default:
      return (
        <Text dimColor color={safeColor(p.color)}>
          {p.text ?? ""}
        </Text>
      );
  }
}

function DividerComponent({ element }: ComponentRenderProps) {
  const p = element.props as {
    character?: string;
    color?: string;
    dimColor?: boolean;
    title?: string;
    width?: number;
  };

  const char = Array.from(p.character ?? "─")[0] || "─";
  const totalWidth = p.width ?? 40;

  if (p.title) {
    const titleStr = ` ${p.title} `;
    const available = Math.max(0, totalWidth - titleStr.length);
    const leftLen = Math.floor(available / 2);
    const rightLen = available - leftLen;
    return (
      <Text color={safeColor(p.color)} dimColor={p.dimColor}>
        {char.repeat(leftLen)}
        {titleStr}
        {char.repeat(rightLen)}
      </Text>
    );
  }

  return (
    <Text color={safeColor(p.color)} dimColor={p.dimColor}>
      {char.repeat(totalWidth)}
    </Text>
  );
}

const BADGE_COLORS: Record<string, string> = {
  default: "white",
  info: "blue",
  success: "green",
  warning: "yellow",
  error: "red",
};

function BadgeComponent({ element }: ComponentRenderProps) {
  const p = element.props as {
    label?: string;
    variant?: "default" | "info" | "success" | "warning" | "error";
  };

  const color = BADGE_COLORS[p.variant ?? "default"] ?? "white";

  return (
    <Text backgroundColor={color} bold>
      {` ${p.label ?? ""} `}
    </Text>
  );
}

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

function SpinnerComponent({ element }: ComponentRenderProps) {
  const p = element.props as {
    label?: string;
    color?: string;
  };

  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setFrame((prev) => (prev + 1) % SPINNER_FRAMES.length);
    }, 80);
    return () => clearInterval(timer);
  }, []);

  return (
    <Box gap={1}>
      <Text color={safeColor(p.color)}>{SPINNER_FRAMES[frame]}</Text>
      {p.label ? <Text>{p.label}</Text> : null}
    </Box>
  );
}

function ProgressBarComponent({ element }: ComponentRenderProps) {
  const p = element.props as {
    progress?: number;
    width?: number;
    color?: string;
    label?: string;
  };

  const progress = Math.min(1, Math.max(0, p.progress ?? 0));
  const barWidth = p.width ?? 30;
  const filled = Math.round(progress * barWidth);
  const empty = barWidth - filled;
  const percentage = Math.round(progress * 100);

  return (
    <Box gap={1}>
      {p.label ? <Text>{p.label}</Text> : null}
      <Text>
        <Text color={safeColor(p.color) ?? "green"}>{"█".repeat(filled)}</Text>
        <Text dimColor>{"░".repeat(empty)}</Text>
      </Text>
      <Text dimColor>{percentage}%</Text>
    </Box>
  );
}

const SPARK_BLOCKS = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];

function SparklineComponent({ element }: ComponentRenderProps) {
  const p = element.props as {
    data?: number[];
    width?: number;
    color?: string;
    label?: string;
    min?: number;
    max?: number;
  };

  const data = p.data ?? [];
  if (data.length === 0) {
    return p.label ? <Text dimColor>{p.label}: (no data)</Text> : null;
  }

  const minVal = p.min ?? Math.min(...data);
  const maxVal = p.max ?? Math.max(...data);
  const range = maxVal - minVal || 1;

  // If width is set and smaller than data length, sample down
  const maxWidth = p.width ?? data.length;
  let sampled = data;
  if (maxWidth < data.length) {
    sampled = [];
    for (let i = 0; i < maxWidth; i++) {
      const idx =
        maxWidth === 1
          ? 0
          : Math.round((i / (maxWidth - 1)) * (data.length - 1));
      sampled.push(data[idx]!);
    }
  }

  const blocks = sampled
    .map((v) => {
      const normalized = (v - minVal) / range;
      const idx = Math.min(
        SPARK_BLOCKS.length - 1,
        Math.round(normalized * (SPARK_BLOCKS.length - 1)),
      );
      return SPARK_BLOCKS[idx];
    })
    .join("");

  return (
    <Box gap={1}>
      {p.label ? <Text>{p.label}</Text> : null}
      <Text color={safeColor(p.color) ?? "green"}>{blocks}</Text>
    </Box>
  );
}

function BarChartComponent({ element }: ComponentRenderProps) {
  const p = element.props as {
    data?: Array<{ label: string; value: number; color?: string }>;
    width?: number;
    showValues?: boolean;
    showPercentage?: boolean;
  };

  const data = p.data ?? [];
  if (data.length === 0) return null;

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const maxLabelLen = Math.max(...data.map((d) => d.label.length));
  const barWidth = p.width ?? 30;

  return (
    <Box flexDirection="column">
      {data.map((item) => {
        const filled = Math.round((item.value / maxValue) * barWidth);
        const padded = item.label.padEnd(maxLabelLen);
        const suffix: string[] = [];
        if (p.showValues) suffix.push(String(item.value));
        if (p.showPercentage && total > 0)
          suffix.push(`${Math.round((item.value / total) * 100)}%`);

        return (
          <Box key={item.label} gap={1}>
            <Text>{padded}</Text>
            <Text color={item.color ?? "green"}>{"█".repeat(filled)}</Text>
            {suffix.length > 0 ? (
              <Text dimColor>{suffix.join(" ")}</Text>
            ) : null}
          </Box>
        );
      })}
    </Box>
  );
}

function TableComponent({ element }: ComponentRenderProps) {
  const p = element.props as {
    columns?: Array<{
      header: string;
      key: string;
      width?: number;
      align?: "left" | "center" | "right";
    }>;
    rows?: Array<Record<string, string>>;
    borderStyle?: string;
    headerColor?: string;
  };

  const columns = p.columns ?? [];
  const rows = p.rows ?? [];

  // Calculate column widths
  const colWidths = columns.map((col) => {
    if (col.width) return col.width;
    let max = col.header.length;
    for (const row of rows) {
      const val = row[col.key] ?? "";
      if (val.length > max) max = val.length;
    }
    return max + 2;
  });

  const padCell = (text: string, width: number, align?: string): string => {
    const truncated =
      text.length > width ? text.slice(0, width - 1) + "…" : text;
    const pad = width - truncated.length;
    if (align === "right") return " ".repeat(pad) + truncated;
    if (align === "center") {
      const left = Math.floor(pad / 2);
      return " ".repeat(left) + truncated + " ".repeat(pad - left);
    }
    return truncated + " ".repeat(pad);
  };

  const borderStyleProp = p.borderStyle as
    | "single"
    | "double"
    | "round"
    | "bold"
    | "classic"
    | undefined;

  return (
    <Box flexDirection="column" borderStyle={borderStyleProp}>
      {/* Header */}
      <Box>
        {columns.map((col, i) => (
          <Text key={col.key} bold color={safeColor(p.headerColor)}>
            {padCell(col.header, colWidths[i]!, col.align)}
          </Text>
        ))}
      </Box>
      {/* Separator */}
      <Text dimColor>{colWidths.map((w) => "─".repeat(w)).join("─")}</Text>
      {/* Rows */}
      {rows.map((row, rowIdx) => (
        <Box key={rowIdx}>
          {columns.map((col, i) => (
            <Text key={col.key}>
              {padCell(row[col.key] || "—", colWidths[i]!, col.align)}
            </Text>
          ))}
        </Box>
      ))}
    </Box>
  );
}

function ListComponent({ element }: ComponentRenderProps) {
  const p = element.props as {
    items?: string[];
    ordered?: boolean;
    bulletChar?: string;
    spacing?: number;
  };

  const items = p.items ?? [];
  const bullet = p.bulletChar ?? "•";

  return (
    <Box flexDirection="column" gap={p.spacing ?? 0}>
      {items.map((item, i) => (
        <Box key={i} gap={1}>
          <Text dimColor>{p.ordered ? `${i + 1}.` : bullet}</Text>
          <Text>{item}</Text>
        </Box>
      ))}
    </Box>
  );
}

function ListItemComponent({ element }: ComponentRenderProps) {
  const p = element.props as {
    title?: string;
    subtitle?: string;
    leading?: string;
    trailing?: string;
  };

  return (
    <Box gap={1}>
      {p.leading ? <Text>{p.leading}</Text> : null}
      <Box flexDirection="column" flexGrow={1}>
        <Text bold>{p.title ?? ""}</Text>
        {p.subtitle ? <Text>{p.subtitle}</Text> : null}
      </Box>
      {p.trailing ? <Text>{String(p.trailing)}</Text> : null}
    </Box>
  );
}

function CardComponent({ element, children }: ComponentRenderProps) {
  const p = element.props as {
    title?: string;
    borderStyle?: "single" | "double" | "round" | "bold" | "classic";
    borderColor?: string;
    padding?: number;
  };

  return (
    <Box
      flexDirection="column"
      borderStyle={p.borderStyle ?? "round"}
      borderColor={p.borderColor}
      padding={p.padding ?? 1}
    >
      {p.title ? (
        <Box marginBottom={1}>
          <Text bold>{p.title}</Text>
        </Box>
      ) : null}
      {children}
    </Box>
  );
}

/** Coerce any value into a display string. Handles arrays, numbers, objects. */
function coerceToString(val: unknown): string {
  if (val == null) return "";
  if (typeof val === "string") return val;
  if (typeof val === "number") return val.toLocaleString();
  if (typeof val === "boolean") return val ? "true" : "false";
  if (Array.isArray(val)) return val.map(coerceToString).join(", ");
  if (typeof val === "object") {
    // Handle {language: "TypeScript", percentage: 65} style objects
    const values = Object.values(val as Record<string, unknown>);
    return values.map(coerceToString).join(" ");
  }
  return String(val);
}

function KeyValueComponent({ element }: ComponentRenderProps) {
  const p = element.props as {
    label?: string;
    value?: unknown;
    labelColor?: string;
    separator?: string;
  };

  const sep = p.separator ?? ":";

  return (
    <Box gap={1}>
      <Text color={safeColor(p.labelColor)} bold dimColor>
        {p.label ?? ""}
        {sep}
      </Text>
      <Text>{coerceToString(p.value) || "—"}</Text>
    </Box>
  );
}

function LinkComponent({ element }: ComponentRenderProps) {
  const p = element.props as {
    url?: string;
    label?: string;
    color?: string;
  };

  const url = p.url ?? "";
  const label = p.label ?? url;

  return (
    <Text color={safeColor(p.color) ?? "cyan"} underline>
      {label}
      {label !== url ? ` (${url})` : ""}
    </Text>
  );
}

const STATUS_CONFIG: Record<string, { icon: string; color: string }> = {
  info: { icon: "ℹ", color: "blue" },
  success: { icon: "✔", color: "green" },
  warning: { icon: "⚠", color: "yellow" },
  error: { icon: "✖", color: "red" },
};

function StatusLineComponent({ element }: ComponentRenderProps) {
  const p = element.props as {
    text?: string;
    status?: "info" | "success" | "warning" | "error";
    icon?: string;
  };

  const status = p.status ?? "info";
  const config = STATUS_CONFIG[status];
  const icon = p.icon ?? config?.icon ?? "•";
  const color = config?.color ?? "white";

  return (
    <Box gap={1}>
      <Text color={color}>{icon}</Text>
      <Text>{p.text ?? ""}</Text>
    </Box>
  );
}

// =============================================================================
// Interactive Components
// =============================================================================

function TextInputComponent({ element, emit, bindings }: ComponentRenderProps) {
  const p = element.props as {
    placeholder?: string;
    value?: string;
    label?: string;
    mask?: string;
  };

  const { isActive } = useFocus();
  const [value, setValue] = useBoundProp<string>(
    (p.value as string) ?? "",
    bindings?.value,
  );

  const currentValue = value ?? "";
  const [cursorPos, setCursorPos] = useState(currentValue.length);

  // Keep cursor in bounds when value changes externally
  useEffect(() => {
    setCursorPos((prev) => Math.min(prev, currentValue.length));
  }, [currentValue]);

  useInput(
    (input, key) => {
      if (key.return) {
        emit("submit");
        return;
      }

      if (key.backspace || key.delete) {
        if (cursorPos > 0) {
          const newVal =
            currentValue.slice(0, cursorPos - 1) +
            currentValue.slice(cursorPos);
          setValue(newVal);
          setCursorPos((prev) => prev - 1);
          emit("change");
        }
        return;
      }

      // Cursor movement
      if (key.leftArrow) {
        setCursorPos((prev) => Math.max(0, prev - 1));
        return;
      }
      if (key.rightArrow) {
        setCursorPos((prev) => Math.min(currentValue.length, prev + 1));
        return;
      }

      // Ignore control keys
      if (key.ctrl || key.meta || key.escape || key.tab) return;
      if (key.upArrow || key.downArrow) return;

      if (input) {
        const newVal =
          currentValue.slice(0, cursorPos) +
          input +
          currentValue.slice(cursorPos);
        setValue(newVal);
        setCursorPos((prev) => prev + input.length);
        emit("change");
      }
    },
    { isActive },
  );

  const displayValue = currentValue
    ? p.mask
      ? p.mask.repeat(currentValue.length)
      : currentValue
    : "";

  // Render with cursor position indicator
  const before = displayValue.slice(0, cursorPos);
  const after = displayValue.slice(cursorPos);

  return (
    <Box gap={1}>
      {p.label ? <Text bold>{p.label}:</Text> : null}
      <Text>
        {currentValue ? (
          <>
            {before}
            {isActive ? <Text color="cyan">▎</Text> : null}
            {after}
          </>
        ) : (
          <>
            {isActive ? <Text color="cyan">▎</Text> : null}
            <Text dimColor>{p.placeholder ?? ""}</Text>
          </>
        )}
      </Text>
    </Box>
  );
}

function SelectComponent({ element, emit, bindings }: ComponentRenderProps) {
  const p = element.props as {
    options?: Array<{ label: string; value: string }>;
    value?: string;
    label?: string;
  };

  const { isActive } = useFocus();
  const options = p.options ?? [];
  const [selectedValue, setSelectedValue] = useBoundProp<string>(
    (p.value as string) ?? "",
    bindings?.value,
  );

  const currentIndex = options.findIndex((o) => o.value === selectedValue);
  const [highlightIndex, setHighlightIndex] = useState(
    currentIndex >= 0 ? currentIndex : 0,
  );

  // Stable key derived from option values — prevents the effect from firing
  // on every render due to resolved props creating new array references.
  const optionsKey = options.map((o) => o.value).join("\0");

  // Sync highlight when selectedValue changes externally (e.g. via another action)
  // Also clamp when options shrink to prevent out-of-bounds highlight
  useEffect(() => {
    const idx = options.findIndex((o) => o.value === selectedValue);
    if (idx >= 0) {
      setHighlightIndex(idx);
    } else if (options.length > 0) {
      setHighlightIndex((prev) => Math.min(prev, options.length - 1));
    } else {
      setHighlightIndex(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- optionsKey is a stable proxy for options identity
  }, [selectedValue, optionsKey]);

  useInput(
    (_input, key) => {
      if (options.length === 0) return;
      if (key.upArrow) {
        setHighlightIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1));
      } else if (key.downArrow) {
        setHighlightIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0));
      } else if (key.return) {
        const option = options[highlightIndex];
        if (option) {
          setSelectedValue(option.value);
          emit("change");
        }
      }
    },
    { isActive },
  );

  return (
    <Box flexDirection="column">
      {p.label ? (
        <Box marginBottom={1}>
          <Text bold>{p.label}:</Text>
        </Box>
      ) : null}
      {options.map((option, i) => {
        const isHighlighted = i === highlightIndex;
        const isSelected = option.value === selectedValue;
        return (
          <Box key={option.value} gap={1}>
            <Text color={isHighlighted ? "cyan" : undefined}>
              {isHighlighted ? "❯" : " "}
            </Text>
            <Text
              color={isSelected ? "green" : isHighlighted ? "cyan" : undefined}
              bold={isSelected}
            >
              {option.label}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
}

function MultiSelectComponent({
  element,
  emit,
  bindings,
}: ComponentRenderProps) {
  const p = element.props as {
    options?: Array<{ label: string; value: string }>;
    value?: string[];
    label?: string;
    min?: number;
    max?: number;
  };

  const { isActive } = useFocus();
  const options = p.options ?? [];
  const [selectedValues, setSelectedValues] = useBoundProp<string[]>(
    (p.value as string[]) ?? [],
    bindings?.value,
  );

  const selected = selectedValues ?? [];
  const [highlightIndex, setHighlightIndex] = useState(0);

  const optionsKey = options.map((o) => o.value).join("\0");

  useEffect(() => {
    if (options.length > 0) {
      setHighlightIndex((prev) => Math.min(prev, options.length - 1));
    } else {
      setHighlightIndex(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- optionsKey is a stable proxy for options identity
  }, [optionsKey]);

  useInput(
    (_input, key) => {
      if (options.length === 0) return;
      if (key.upArrow) {
        setHighlightIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1));
      } else if (key.downArrow) {
        setHighlightIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0));
      } else if (_input === " ") {
        const option = options[highlightIndex];
        if (!option) return;
        const isSelected = selected.includes(option.value);
        let next: string[];
        if (isSelected) {
          if (p.min != null && selected.length <= p.min) return;
          next = selected.filter((v) => v !== option.value);
        } else {
          if (p.max != null && selected.length >= p.max) return;
          next = [...selected, option.value];
        }
        setSelectedValues(next);
        emit("change");
      } else if (key.return) {
        emit("submit");
      }
    },
    { isActive },
  );

  return (
    <Box flexDirection="column">
      {p.label ? (
        <Box marginBottom={1}>
          <Text bold>{p.label}:</Text>
          <Text dimColor> (space to toggle, enter to confirm)</Text>
        </Box>
      ) : null}
      {options.map((option, i) => {
        const isHighlighted = i === highlightIndex;
        const isChecked = selected.includes(option.value);
        return (
          <Box key={option.value} gap={1}>
            <Text color={isHighlighted ? "cyan" : undefined}>
              {isHighlighted ? "❯" : " "}
            </Text>
            <Text color={isChecked ? "green" : undefined}>
              {isChecked ? "◉" : "◯"}
            </Text>
            <Text color={isHighlighted ? "cyan" : undefined} bold={isChecked}>
              {option.label}
            </Text>
          </Box>
        );
      })}
      {selected.length > 0 ? (
        <Box marginTop={1}>
          <Text dimColor>Selected: {selected.length}</Text>
        </Box>
      ) : null}
    </Box>
  );
}

function ConfirmInputComponent({ element, emit }: ComponentRenderProps) {
  const p = element.props as {
    message?: string;
    defaultValue?: boolean;
    yesLabel?: string;
    noLabel?: string;
  };

  const { isActive } = useFocus();
  const [value, setValue] = useState<boolean | null>(p.defaultValue ?? null);

  useInput(
    (input, key) => {
      const lower = input.toLowerCase();
      if (lower === "y") {
        setValue(true);
        emit("confirm");
      } else if (lower === "n") {
        setValue(false);
        emit("deny");
      } else if (key.return && value !== null) {
        emit(value ? "confirm" : "deny");
      }
    },
    { isActive },
  );

  const yesLabel = p.yesLabel ?? "Yes";
  const noLabel = p.noLabel ?? "No";

  return (
    <Box gap={1}>
      <Text bold>{p.message ?? "Are you sure?"}</Text>
      <Text>
        <Text color={value === true ? "green" : "gray"} bold={value === true}>
          {yesLabel}
        </Text>
        <Text dimColor> / </Text>
        <Text color={value === false ? "red" : "gray"} bold={value === false}>
          {noLabel}
        </Text>
      </Text>
      <Text dimColor>(y/n)</Text>
    </Box>
  );
}

function TabsComponent({
  element,
  emit,
  bindings,
  children,
}: ComponentRenderProps) {
  const p = element.props as {
    tabs?: Array<{ label: string; value: string; icon?: string }>;
    value?: string;
    color?: string;
  };

  const { isActive } = useFocus();
  const tabs = p.tabs ?? [];
  const [activeTab, setActiveTab] = useBoundProp<string>(
    (p.value as string) ?? tabs[0]?.value ?? "",
    bindings?.value,
  );

  const activeIndex = tabs.findIndex((t) => t.value === activeTab);

  useInput(
    (_input, key) => {
      if (tabs.length === 0) return;
      const currentIdx = activeIndex >= 0 ? activeIndex : 0;
      if (key.leftArrow) {
        const next = currentIdx > 0 ? currentIdx - 1 : tabs.length - 1;
        const tab = tabs[next];
        if (tab) {
          setActiveTab(tab.value);
          emit("change");
        }
      } else if (key.rightArrow) {
        const next = currentIdx < tabs.length - 1 ? currentIdx + 1 : 0;
        const tab = tabs[next];
        if (tab) {
          setActiveTab(tab.value);
          emit("change");
        }
      }
    },
    { isActive },
  );

  const accentColor = p.color ?? "cyan";

  return (
    <Box flexDirection="column">
      <Box gap={2}>
        {tabs.map((tab) => {
          const isActive = tab.value === activeTab;
          return (
            <Text
              key={tab.value}
              color={isActive ? accentColor : undefined}
              bold={isActive}
              dimColor={!isActive}
            >
              {tab.icon ? `${tab.icon} ` : ""}
              {tab.label}
            </Text>
          );
        })}
      </Box>
      <Text color={accentColor}>
        {tabs
          .map((tab) => {
            const isActive = tab.value === activeTab;
            const labelWidth =
              (tab.icon ? tab.icon.length + 1 : 0) + tab.label.length;
            return isActive
              ? "━".repeat(labelWidth) + "  "
              : " ".repeat(labelWidth) + "  ";
          })
          .join("")}
      </Text>
      {children}
    </Box>
  );
}

// =============================================================================
// Markdown Component
// =============================================================================

/** Render an array of inline tokens into Ink Text elements. */
function renderInline(tokens: Token[]): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!;
    switch (t.type) {
      case "strong":
        nodes.push(
          <Text key={i} bold>
            {renderInline((t as Tokens.Strong).tokens)}
          </Text>,
        );
        break;
      case "em":
        nodes.push(
          <Text key={i} italic>
            {renderInline((t as Tokens.Em).tokens)}
          </Text>,
        );
        break;
      case "codespan":
        nodes.push(
          <Text
            key={i}
            bold
            dimColor
          >{`\`${(t as Tokens.Codespan).text}\``}</Text>,
        );
        break;
      case "del":
        nodes.push(
          <Text key={i} strikethrough>
            {renderInline((t as Tokens.Del).tokens)}
          </Text>,
        );
        break;
      case "link":
        nodes.push(
          <Text key={i} underline>
            {renderInline((t as Tokens.Link).tokens)}
          </Text>,
        );
        break;
      case "text": {
        const tt = t as Tokens.Text;
        // Paragraph-level text tokens can have nested inline tokens
        if (tt.tokens) {
          nodes.push(...renderInline(tt.tokens));
        } else {
          nodes.push(tt.text);
        }
        break;
      }
      case "br":
        nodes.push("\n");
        break;
      case "escape":
        nodes.push((t as Tokens.Escape).text);
        break;
      default:
        if ("text" in t) nodes.push((t as { text: string }).text);
        break;
    }
  }
  return nodes;
}

/** Render a single block-level token into Ink components. */
function renderBlock(token: Token, key: number): React.ReactNode {
  switch (token.type) {
    case "heading": {
      const h = token as Tokens.Heading;
      const content = renderInline(h.tokens);
      if (h.depth === 1)
        return (
          <Text key={key} bold underline>
            {content}
          </Text>
        );
      if (h.depth === 2)
        return (
          <Text key={key} bold>
            {content}
          </Text>
        );
      if (h.depth === 3)
        return (
          <Text key={key} bold dimColor>
            {content}
          </Text>
        );
      return (
        <Text key={key} dimColor>
          {content}
        </Text>
      );
    }
    case "paragraph": {
      const p = token as Tokens.Paragraph;
      return <Text key={key}>{renderInline(p.tokens)}</Text>;
    }
    case "code": {
      const c = token as Tokens.Code;
      return (
        <Box
          key={key}
          borderStyle="single"
          borderColor="gray"
          paddingX={1}
          marginY={0}
        >
          <Text dimColor>{c.text}</Text>
        </Box>
      );
    }
    case "blockquote": {
      const bq = token as Tokens.Blockquote;
      return (
        <Box
          key={key}
          paddingLeft={1}
          borderStyle="bold"
          borderLeft
          borderTop={false}
          borderBottom={false}
          borderRight={false}
          borderColor="gray"
        >
          <Box flexDirection="column">
            {bq.tokens.map((child, i) => renderBlock(child, i))}
          </Box>
        </Box>
      );
    }
    case "list": {
      const l = token as Tokens.List;
      return (
        <Box key={key} flexDirection="column">
          {l.items.map((item, idx) => (
            <Box key={idx} gap={1}>
              <Text dimColor>
                {l.ordered ? `${Number(l.start ?? 1) + idx}.` : "•"}
              </Text>
              <Text>
                {item.tokens.flatMap((child) => {
                  if (child.type === "text") {
                    const tt = child as Tokens.Text;
                    return tt.tokens ? renderInline(tt.tokens) : [tt.text];
                  }
                  if (child.type === "list") return [renderBlock(child, idx)];
                  return "tokens" in child
                    ? renderInline((child as { tokens: Token[] }).tokens)
                    : [];
                })}
              </Text>
            </Box>
          ))}
        </Box>
      );
    }
    case "hr":
      return (
        <Text key={key} dimColor>
          {"─".repeat(40)}
        </Text>
      );
    case "space":
      return null;
    default:
      // Fallback: render raw text if present
      if ("text" in token)
        return <Text key={key}>{(token as { text: string }).text}</Text>;
      return null;
  }
}

/**
 * MarkdownText — renders markdown-formatted text with proper terminal styling.
 *
 * Uses `marked` lexer to parse markdown into an AST, then maps tokens to
 * Ink components. Supports headings, bold, italic, code (inline + blocks),
 * lists, blockquotes, horizontal rules, strikethrough, and links.
 *
 */
function MarkdownText({ text }: { text: string }) {
  const tokens = useMemo(
    () => marked.lexer(text, { gfm: true, breaks: true }),
    [text],
  );
  const blocks = tokens
    .map((t, i) => renderBlock(t, i))
    .filter((n) => n != null);
  return (
    <Box flexDirection="column" gap={0}>
      {blocks}
    </Box>
  );
}

function MarkdownComponent({ element }: ComponentRenderProps) {
  const p = element.props as { text?: string };
  return <MarkdownText text={p.text ?? ""} />;
}

// =============================================================================
// Standard Components Registry
// =============================================================================

export const standardComponents: ComponentRegistry = {
  Box: BoxComponent,
  Text: TextComponent,
  Newline: NewlineComponent,
  Spacer: SpacerComponent,
  Heading: HeadingComponent,
  Divider: DividerComponent,
  Badge: BadgeComponent,
  Spinner: SpinnerComponent,
  ProgressBar: ProgressBarComponent,
  Sparkline: SparklineComponent,
  BarChart: BarChartComponent,
  Table: TableComponent,
  List: ListComponent,
  ListItem: ListItemComponent,
  Card: CardComponent,
  KeyValue: KeyValueComponent,
  Link: LinkComponent,
  StatusLine: StatusLineComponent,
  TextInput: TextInputComponent,
  Select: SelectComponent,
  MultiSelect: MultiSelectComponent,
  ConfirmInput: ConfirmInputComponent,
  Tabs: TabsComponent,
  Markdown: MarkdownComponent,
};
