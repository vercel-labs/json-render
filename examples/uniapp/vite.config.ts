import { defineConfig } from "vite";
import uni from "@dcloudio/vite-plugin-uni";

// Target H5 platform by default
process.env.UNI_PLATFORM = process.env.UNI_PLATFORM ?? "h5";

export default defineConfig({
  plugins: [uni()],
});
