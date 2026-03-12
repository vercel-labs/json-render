import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import react from "@vitejs/plugin-react";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import solid from "vite-plugin-solid";

export default defineConfig({
  plugins: [
    svelte(),
    vue(),
    react({ include: /src\/react\/.*\.tsx$/ }),
    solid({ include: [/src\/solid\/.*\.tsx$/, /packages\/solid\/.*\.tsx$/] }),
  ],
});
