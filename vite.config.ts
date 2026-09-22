import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const dir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, dir, "");
  const apiTarget = env.VITE_API_PROXY || "http://127.0.0.1:4000";

  return {
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
  };
});
