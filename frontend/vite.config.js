import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  const proxy =
    mode === "development"
      ? {
          "/api": { target: env.VITE_PROXY_TARGET || "http://127.0.0.1:8000", changeOrigin: true },
          "/media": { target: env.VITE_PROXY_TARGET || "http://127.0.0.1:8000", changeOrigin: true },
        }
      : {
          "/api": "https://python1-jsnr.onrender.com/api/",
          "/media": "https://python1-jsnr.onrender.com/media/",
        };

  return {
    plugins: [react()],
    css: {
      preprocessorOptions: {
        scss: { api: "modern-compiler" },
      },
    },
    server: {
      port: 5173,
      proxy,
    },
  };
});