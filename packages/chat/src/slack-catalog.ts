import { z } from "zod";

// Native objects deliberately retain every field. Slack evolves nested elements
// independently of the portable Chat SDK card model (and of @slack/types).
const nativeObject = z.record(z.string(), z.json());
const nativeElement = z.object({ type: z.string().min(1) }).catchall(z.json());
const textObject = (max: number, plain = false) =>
  z
    .object({
      type: plain ? z.literal("plain_text") : z.enum(["plain_text", "mrkdwn"]),
      text: z.string().min(1).max(max),
    })
    .catchall(z.json());
const objects = (max: number) => z.array(nativeElement).min(1).max(max);
const blockId = z.string().max(255).optional();

function block<T extends z.ZodRawShape>(shape: T) {
  return z
    .object({ ...shape, block_id: blockId, type: z.never().optional() })
    .catchall(z.json());
}

const task = z
  .object({
    task_id: z.string().min(1),
    title: z.string().min(1),
    status: z.enum(["pending", "in_progress", "complete", "error"]),
  })
  .catchall(z.json());

/** Native Slack block props, without the wire-format `type` discriminator. */
export const slackBlockDefinitions = {
  SlackActions: {
    type: "actions",
    props: block({ elements: objects(25) }),
    description:
      "Interactive elements, including buttons, selects, pickers, and workflow buttons.",
    example: {
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "Approve" },
          action_id: "approve",
        },
      ],
    },
  },
  SlackAlert: {
    type: "alert",
    props: block({
      text: textObject(3000),
      level: z
        .enum(["default", "info", "warning", "error", "success"])
        .optional(),
    }),
    description: "An informational, success, warning, or error alert.",
    example: {
      text: { type: "plain_text", text: "Deployment complete" },
      level: "success",
    },
  },
  SlackCard: {
    type: "card",
    props: block({
      title: textObject(150).optional(),
      subtitle: textObject(150).optional(),
      body: textObject(200).optional(),
      subtext: textObject(200).optional(),
      hero_image: nativeElement.optional(),
      icon: nativeElement.optional(),
      slack_icon: nativeObject.optional(),
      actions: objects(3).optional(),
    })
      .refine(
        (p) => p.hero_image || p.title || p.actions || p.body,
        "card needs hero_image, title, actions, or body",
      )
      .refine(
        (p) => !(p.icon && p.slack_icon),
        "icon and slack_icon are mutually exclusive",
      ),
    description:
      "Native Slack card with images, text objects, icons, and up to three action buttons.",
    example: { title: { type: "plain_text", text: "Deployment" } },
  },
  SlackCarousel: {
    type: "carousel",
    props: block({ elements: objects(10) }),
    description:
      "Horizontally scrolling cards. Supply native card objects in elements.",
    example: {
      elements: [
        { type: "card", title: { type: "plain_text", text: "Project" } },
      ],
    },
  },
  SlackContainer: {
    type: "container",
    props: block({
      title: textObject(150, true).optional(),
      rich_text_title: nativeElement.optional(),
      child_blocks: objects(10),
    }).refine(
      (p) => p.title || p.rich_text_title,
      "container needs title or rich_text_title",
    ),
    description:
      "Groups native child_blocks under a title. Supports width, icons, and collapsible content.",
    example: {
      title: { type: "plain_text", text: "Details" },
      child_blocks: [{ type: "divider" }],
    },
  },
  SlackContextActions: {
    type: "context_actions",
    props: block({ elements: objects(5) }),
    description:
      "Context actions containing feedback_buttons and icon_button elements.",
    example: {
      elements: [
        {
          type: "icon_button",
          icon: "copy",
          text: { type: "plain_text", text: "Copy" },
          action_id: "copy",
        },
      ],
    },
  },
  SlackContext: {
    type: "context",
    props: block({ elements: objects(10) }),
    description: "Contextual text objects and image elements.",
    example: { elements: [{ type: "mrkdwn", text: "Updated today" }] },
  },
  SlackDataTable: {
    type: "data_table",
    props: block({
      caption: z.string().min(1),
      rows: z.array(z.array(nativeElement).min(1).max(20)).min(2).max(201),
      page_size: z.number().int().min(1).max(100).optional(),
      row_header_column_index: z.number().int().min(0).optional(),
    }),
    description:
      "Paginated table with raw_text, raw_number, rich_text, and action_cell cells. Include a header row.",
    example: {
      caption: "Projects",
      rows: [
        [{ type: "raw_text", text: "Name" }],
        [{ type: "raw_text", text: "Web" }],
      ],
    },
  },
  SlackDataVisualization: {
    type: "data_visualization",
    props: block({ title: z.string().min(1).max(50), chart: nativeElement }),
    description:
      "Native pie, bar, line, or area chart. Series charts use axis_config and series[].data.",
    example: {
      title: "Deploys",
      chart: { type: "pie", segments: [{ label: "Web", value: 12 }] },
    },
  },
  SlackDivider: {
    type: "divider",
    props: block({}),
    description: "A visual separator.",
    example: {},
  },

  SlackHeader: {
    type: "header",
    props: block({ text: textObject(150, true) }),
    description: "Plain-text heading, up to 150 characters.",
    example: { text: { type: "plain_text", text: "Weekly report" } },
  },
  SlackImage: {
    type: "image",
    props: block({
      alt_text: z.string().max(2000),
      image_url: z.string().url().max(3000).optional(),
      slack_file: nativeObject.optional(),
      title: textObject(2000, true).optional(),
    }).refine(
      (p) => Boolean(p.image_url) !== Boolean(p.slack_file),
      "image needs exactly one of image_url or slack_file",
    ),
    description:
      "An image supplied by image_url or a Slack file composition object.",
    example: {
      image_url: "https://example.com/chart.png",
      alt_text: "Deploys per day",
    },
  },

  SlackLayout: {
    type: "layout",
    props: block({
      label: z.string().min(1).max(150),
      rows: z
        .array(
          z
            .object({
              items: z
                .array(z.object({ block: nativeElement }).catchall(z.json()))
                .min(1)
                .max(3),
            })
            .catchall(z.json()),
        )
        .min(1)
        .max(5),
    }),
    description:
      "Grid of rows[].items[].block objects. Supports widths, alignment, grid_lines, and fallback blocks.",
    example: {
      label: "Summary",
      rows: [
        {
          items: [
            {
              block: {
                type: "section",
                text: { type: "mrkdwn", text: "*Deploys* 12" },
              },
            },
          ],
        },
      ],
    },
  },

  SlackPlan: {
    type: "plan",
    props: block({ title: z.string().min(1), tasks: z.array(task).max(50) }),
    description:
      "A plan with tasks. Each task has task_id, title, and status; task objects omit type.",
    example: {
      title: "Deploy",
      tasks: [{ task_id: "build", title: "Build", status: "complete" }],
    },
  },

  SlackSection: {
    type: "section",
    props: block({
      text: textObject(3000).optional(),
      fields: z.array(textObject(2000)).min(1).max(10).optional(),
      accessory: nativeElement.optional(),
      expand: z.boolean().optional(),
    }).refine((p) => p.text || p.fields, "section needs text or fields"),
    description:
      "Text or fields, with an optional native accessory and expand flag.",
    example: { text: { type: "mrkdwn", text: "*Deploy complete*" } },
  },
  SlackTable: {
    type: "table",
    props: block({
      rows: z.array(z.array(nativeElement).min(1).max(20)).min(1).max(100),
      column_settings: z.array(nativeObject).max(20).optional(),
    }),
    description:
      "Native table of raw_text, raw_number, or rich_text cells, with optional column_settings.",
    example: {
      rows: [
        [
          { type: "raw_text", text: "Deploys" },
          { type: "raw_number", value: 12 },
        ],
      ],
    },
  },
  SlackTaskCard: {
    type: "task_card",
    props: block(task.shape),
    description:
      "Task progress with task_id, title, status, and optional details, output, sources, and icon.",
    example: { task_id: "build", title: "Build", status: "complete" },
  },
} as const;

export type SlackBlockComponent = keyof typeof slackBlockDefinitions;
export type SlackBlockType =
  (typeof slackBlockDefinitions)[SlackBlockComponent]["type"];

/** Catalog for native Slack payloads. Nested elements use Slack's JSON format. */
export const slackComponentDefinitions = {
  SlackMessage: {
    props: z.object({}),
    slots: ["default"],
    description:
      "Root of native Slack content. Children are Slack blocks or SlackGroup elements.",
    example: {},
  },
  SlackGroup: {
    props: z.object({}),
    slots: ["default"],
    description:
      "Logical group, flattened into its parent's blocks. Use repeat and visible here.",
    example: {},
  },
  ...(Object.fromEntries(
    Object.entries(slackBlockDefinitions).map(([name, def]) => [
      name,
      {
        props: def.props,
        slots: [],
        description: def.description,
        example: def.example,
      },
    ]),
  ) as {
    [K in SlackBlockComponent]: Omit<
      (typeof slackBlockDefinitions)[K],
      "type"
    > & { slots: [] };
  }),
};
