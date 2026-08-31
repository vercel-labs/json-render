import { createStartApp } from "@json-render/start/server";
import { getSpec } from "./spec-store";

export const { getPageData, getHead, getStaticPaths } = createStartApp({
  spec: () => getSpec(),
});
