import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const dir = fileURLToPath(new URL(".", import.meta.url));
const apiTarget = process.env.VITE_API_PROXY ?? "http://127.0.0.1:4000";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(dir, "src"),
    },
  },
  server: {
    port: 5174,
    host: "127.0.0.1",
    proxy: {
      "/api": apiTarget,
    },
  },
});
