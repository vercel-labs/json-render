import { defineSchema, type PromptContext } from "@json-render/core";
import type { z } from "zod";

/**
 * Prompt template for Remotion timeline generation
 *
 * Uses JSONL patch format (same as React) but builds up a timeline spec structure.
 */
function remotionPromptTemplate(context: PromptContext): string {
  const { catalog, options, formatZodType } = context;
  const { system = "You are a video timeline generator.", customRules = [] } =
    options;

  const lines: string[] = [];
  lines.push(system);
  lines.push("");

  // Output format - JSONL patches
  lines.push("OUTPUT FORMAT:");
  lines.push(
    "Output JSONL (one JSON object per line) with patches to build a timeline spec.",
  );
  lines.push(
    "Each line is a JSON patch operation. Build the timeline incrementally.",
  );
  lines.push("");
  lines.push("Example output (each line is a separate JSON object):");
  lines.push("");
  lines.push(`{"op":"add","path":"/composition","value":{"id":"intro","fps":30,"width":1920,"height":1080,"durationInFrames":300}}
{"op":"add","path":"/tracks","value":[{"id":"main","name":"Main","type":"video","enabled":true},{"id":"overlay","name":"Overlay","type":"overlay","enabled":true}]}
{"op":"add","path":"/clips","value":[]}
{"op":"add","path":"/clips/-","value":{"id":"clip-1","trackId":"main","component":"TitleCard","props":{"title":"Welcome","subtitle":"Getting Started"},"from":0,"durationInFrames":90,"transitionIn":{"type":"fade","durationInFrames":15},"transitionOut":{"type":"fade","durationInFrames":15},"motion":{"enter":{"opacity":0,"y":50,"scale":0.9,"duration":25},"spring":{"damping":15}}}}
{"op":"add","path":"/clips/-","value":{"id":"clip-2","trackId":"main","component":"TitleCard","props":{"title":"Features"},"from":90,"durationInFrames":90,"motion":{"enter":{"opacity":0,"x":-100,"duration":20},"exit":{"opacity":0,"x":100,"duration":15}}}}
{"op":"add","path":"/audio","value":{"tracks":[]}}`);
  lines.push("");

  // Components
  const catalogData = catalog as {
    components?: Record<
      string,
      { description?: string; defaultDuration?: number; props?: z.ZodType }
    >;
    transitions?: Record<string, { description?: string }>;
    effects?: Record<string, { description?: string }>;
  };

  if (catalogData.components) {
    lines.push(
      `AVAILABLE COMPONENTS (${Object.keys(catalogData.components).length}):`,
    );
    lines.push("");
    for (const [name, def] of Object.entries(catalogData.components)) {
      const duration = def.defaultDuration
        ? ` [default: ${def.defaultDuration} frames]`
        : "";
      const propsStr = def.props ? ` ${formatZodType(def.props)}` : "";
      lines.push(
        `- ${name}:${propsStr} ${def.description || "No description"}${duration}`,
      );
    }
    lines.push("");
  }

  // Transitions
  if (
    catalogData.transitions &&
    Object.keys(catalogData.transitions).length > 0
  ) {
    lines.push("AVAILABLE TRANSITIONS:");
    lines.push("");
    for (const [name, def] of Object.entries(catalogData.transitions)) {
      lines.push(`- ${name}: ${def.description || "No description"}`);
    }
    lines.push("");
  }

  // Motion system documentation
  lines.push("MOTION SYSTEM:");
  lines.push(
    "Clips can have a 'motion' field for declarative animations (optional, use for dynamic/engaging videos):",
  );
  lines.push("");
  lines.push(
    "- enter: {opacity?, scale?, x?, y?, rotate?, duration?} - animate FROM these values TO normal when clip starts",
  );
  lines.push(
    "- exit: {opacity?, scale?, x?, y?, rotate?, duration?} - animate FROM normal TO these values when clip ends",
  );
  lines.push(
    "- spring: {damping?, stiffness?, mass?} - physics config (lower damping = more bounce)",
  );
  lines.push(
    '- loop: {property, from, to, duration, easing?} - continuous animation (property: "scale"|"rotate"|"x"|"y"|"opacity")',
  );
  lines.push("");
  lines.push("Example motion configs:");
  lines.push('  Fade up: {"enter":{"opacity":0,"y":30,"duration":20}}');
  lines.push(
    '  Scale pop: {"enter":{"scale":0.5,"opacity":0,"duration":15},"spring":{"damping":10}}',
  );
  lines.push(
    '  Slide in/out: {"enter":{"x":-100,"duration":20},"exit":{"x":100,"duration":15}}',
  );
  lines.push(
    '  Gentle pulse: {"loop":{"property":"scale","from":1,"to":1.05,"duration":60,"easing":"ease"}}',
  );
  lines.push("");

  // Rules
  lines.push("RULES:");
  const baseRules = [
    "Output ONLY JSONL patches - one JSON object per line, no markdown, no code fences",
    'First add /composition with {id, fps:30, width:1920, height:1080, durationInFrames}: {"op":"add","path":"/composition","value":{...}}',
    'Then add /tracks array with video/overlay tracks: {"op":"add","path":"/tracks","value":[...]}',
    'Then add each clip by appending to the array: {"op":"add","path":"/clips/-","value":{...}}',
    'Finally add /audio with {tracks:[]}: {"op":"add","path":"/audio","value":{...}}',
    "ONLY use components listed above",
    "fps is always 30 (1 second = 30 frames, 10 seconds = 300 frames)",
    'Clips on "main" track flow sequentially (from = previous clip\'s from + durationInFrames)',
    'Overlay clips (LowerThird, TextOverlay) go on "overlay" track',
    "Use motion.enter for engaging clip entrances, motion.exit for smooth departures",
    "Spring damping: 20=smooth, 10=bouncy, 5=very bouncy",
  ];
  const allRules = [...baseRules, ...customRules];
  allRules.forEach((rule, i) => {
    lines.push(`${i + 1}. ${rule}`);
  });

  return lines.join("\n");
}

/**
 * The schema for @json-render/remotion
 *
 * This schema is fundamentally different from the React element tree schema.
 * It's timeline-based, designed for video composition:
 *
 * - Spec: A composition with tracks containing timed clips
 * - Catalog: Video components (scenes, overlays, etc.) and effects
 *
 * This demonstrates that json-render is truly agnostic - different renderers
 * can have completely different spec formats.
 */
export const schema = defineSchema(
  (s) => ({
    // What the AI-generated SPEC looks like (timeline-based)
    spec: s.object({
      /** Composition settings */
      composition: s.object({
        /** Unique composition ID */
        id: s.string(),
        /** Frames per second */
        fps: s.number(),
        /** Width in pixels */
        width: s.number(),
        /** Height in pixels */
        height: s.number(),
        /** Total duration in frames */
        durationInFrames: s.number(),
      }),

      /** Timeline tracks (like layers in video editing) */
      tracks: s.array(
        s.object({
          /** Unique track ID */
          id: s.string(),
          /** Track name for organization */
          name: s.string(),
          /** Track type: "video" | "audio" | "overlay" | "text" */
          type: s.string(),
          /** Whether track is muted/hidden */
          enabled: s.boolean(),
        }),
      ),

      /** Clips placed on the timeline */
      clips: s.array(
        s.object({
          /** Unique clip ID */
          id: s.string(),
          /** Which track this clip belongs to */
          trackId: s.string(),
          /** Component type from catalog */
          component: s.ref("catalog.components"),
          /** Component props */
          props: s.propsOf("catalog.components"),
          /** Start frame (when clip begins) */
          from: s.number(),
          /** Duration in frames */
          durationInFrames: s.number(),
          /** Transition in effect */
          transitionIn: s.object({
            type: s.ref("catalog.transitions"),
            durationInFrames: s.number(),
          }),
          /** Transition out effect */
          transitionOut: s.object({
            type: s.ref("catalog.transitions"),
            durationInFrames: s.number(),
          }),
          /** Declarative motion configuration for custom animations */
          motion: s.object({
            /** Enter animation - animates FROM these values TO neutral */
            enter: s.object({
              /** Starting opacity (0-1), animates to 1 */
              opacity: s.number(),
              /** Starting scale (e.g., 0.8 = 80%), animates to 1 */
              scale: s.number(),
              /** Starting X offset in pixels, animates to 0 */
              x: s.number(),
              /** Starting Y offset in pixels, animates to 0 */
              y: s.number(),
              /** Starting rotation in degrees, animates to 0 */
              rotate: s.number(),
              /** Duration of enter animation in frames (default: 20) */
              duration: s.number(),
            }),
            /** Exit animation - animates FROM neutral TO these values */
            exit: s.object({
              /** Ending opacity (0-1), animates from 1 */
              opacity: s.number(),
              /** Ending scale, animates from 1 */
              scale: s.number(),
              /** Ending X offset in pixels, animates from 0 */
              x: s.number(),
              /** Ending Y offset in pixels, animates from 0 */
              y: s.number(),
              /** Ending rotation in degrees, animates from 0 */
              rotate: s.number(),
              /** Duration of exit animation in frames (default: 20) */
              duration: s.number(),
            }),
            /** Spring physics configuration */
            spring: s.object({
              /** Damping coefficient (default: 20) */
              damping: s.number(),
              /** Stiffness (default: 100) */
              stiffness: s.number(),
              /** Mass (default: 1) */
              mass: s.number(),
            }),
            /** Continuous looping animation */
            loop: s.object({
              /** Property to animate: "scale" | "rotate" | "x" | "y" | "opacity" */
              property: s.string(),
              /** Starting value */
              from: s.number(),
              /** Ending value */
              to: s.number(),
              /** Duration of one cycle in frames */
              duration: s.number(),
              /** Easing type: "linear" | "ease" | "spring" (default: "ease") */
              easing: s.string(),
            }),
          }),
        }),
      ),

      /** Audio configuration */
      audio: s.object({
        /** Background music/audio clips */
        tracks: s.array(
          s.object({
            id: s.string(),
            src: s.string(),
            from: s.number(),
            durationInFrames: s.number(),
            volume: s.number(),
          }),
        ),
      }),
    }),

    // What the CATALOG must provide
    catalog: s.object({
      /** Video component definitions (scenes, overlays, etc.) */
      components: s.map({
        /** Zod schema for component props */
        props: s.zod(),
        /** Component type: "scene" | "overlay" | "text" | "image" | "video" */
        type: s.string(),
        /** Default duration in frames (can be overridden per clip) */
        defaultDuration: s.number(),
        /** Description for AI generation hints */
        description: s.string(),
      }),
      /** Transition effect definitions */
      transitions: s.map({
        /** Default duration in frames */
        defaultDuration: s.number(),
        /** Description for AI generation hints */
        description: s.string(),
      }),
      /** Effect definitions (filters, animations, etc.) */
      effects: s.map({
        /** Zod schema for effect params */
        params: s.zod(),
        /** Description for AI generation hints */
        description: s.string(),
      }),
    }),
  }),
  {
    promptTemplate: remotionPromptTemplate,
  },
);

/**
 * Type for the Remotion schema
 */
export type RemotionSchema = typeof schema;

/**
 * Infer the spec type from a catalog
 */
export type RemotionSpec<TCatalog> = typeof schema extends {
  createCatalog: (catalog: TCatalog) => { _specType: infer S };
}
  ? S
  : never;
