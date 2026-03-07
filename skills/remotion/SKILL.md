---
name: remotion
description: Remotion renderer for json-render that turns JSON timeline specs into videos. Use when working with @json-render/remotion, building video compositions from JSON, creating video catalogs, or rendering AI-generated video timelines.
---

# @json-render/remotion

Remotion renderer that converts JSON timeline specs into video compositions.

## Quick Start

```typescript
import { Player } from "@remotion/player";
import { Renderer, type TimelineSpec } from "@json-render/remotion";

function VideoPlayer({ spec }: { spec: TimelineSpec }) {
  return (
    <Player
      component={Renderer}
      inputProps={{ spec }}
      durationInFrames={spec.composition.durationInFrames}
      fps={spec.composition.fps}
      compositionWidth={spec.composition.width}
      compositionHeight={spec.composition.height}
      controls
    />
  );
}
```

## Using Standard Components

```typescript
import { defineCatalog } from "@json-render/core";
import {
  schema,
  standardComponentDefinitions,
  standardTransitionDefinitions,
  standardEffectDefinitions,
} from "@json-render/remotion";

export const videoCatalog = defineCatalog(schema, {
  components: standardComponentDefinitions,
  transitions: standardTransitionDefinitions,
  effects: standardEffectDefinitions,
});
```

## Adding Custom Components

```typescript
import { z } from "zod";

const catalog = defineCatalog(schema, {
  components: {
    ...standardComponentDefinitions,
    MyCustomClip: {
      props: z.object({ text: z.string() }),
      type: "scene",
      defaultDuration: 90,
      description: "My custom video clip",
    },
  },
});

// Pass custom component to Renderer
<Player
  component={Renderer}
  inputProps={{
    spec,
    components: { MyCustomClip: MyCustomComponent },
  }}
/>
```

## Timeline Spec Structure

```json
{
  "composition": { "id": "video", "fps": 30, "width": 1920, "height": 1080, "durationInFrames": 300 },
  "tracks": [{ "id": "main", "name": "Main", "type": "video", "enabled": true }],
  "clips": [
    { "id": "clip-1", "trackId": "main", "component": "TitleCard", "props": { "title": "Hello" }, "from": 0, "durationInFrames": 90 }
  ],
  "audio": { "tracks": [] }
}
```

## Standard Components

| Component | Type | Description |
|-----------|------|-------------|
| `TitleCard` | scene | Full-screen title with subtitle |
| `TypingText` | scene | Terminal-style typing animation |
| `ImageSlide` | image | Full-screen image display |
| `SplitScreen` | scene | Two-panel comparison |
| `QuoteCard` | scene | Quote with attribution |
| `StatCard` | scene | Animated statistic display |
| `TextOverlay` | overlay | Text overlay |
| `LowerThird` | overlay | Name/title overlay |

## Key Exports

| Export | Purpose |
|--------|---------|
| `Renderer` | Render spec to Remotion composition |
| `schema` | Timeline schema |
| `standardComponents` | Pre-built component registry |
| `standardComponentDefinitions` | Catalog definitions |
| `useTransition` | Transition animation hook |
| `ClipWrapper` | Wrap clips with transitions |
