import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  const useLocalApi = !env.VITE_API_URL;

  return {
    plugins: [react()],
    define: {
      global: "globalThis",
    },
    server: {
      host: true,
      port: 3000,
      proxy: useLocalApi
        ? {
            "/api": {
              target: "http://localhost:3001",
              changeOrigin: true,
            },
          }
        : undefined,
    },
    build: {
      outDir: "dist",
    },
  };
});
