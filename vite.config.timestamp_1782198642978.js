// vite.config.ts
import { defineConfig } from "vite";
import path from "path";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
var vite_config_default = defineConfig({
  plugins: [
    tanstackRouter()
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  }
});
export {
  vite_config_default as default
};
