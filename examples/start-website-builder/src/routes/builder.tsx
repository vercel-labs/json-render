import { createFileRoute } from "@tanstack/react-router";
import { Editor } from "@/components/editor";

export const Route = createFileRoute("/builder")({
  head: () => ({
    meta: [{ title: "Builder | Start Website Builder" }],
  }),
  component: Editor,
});
