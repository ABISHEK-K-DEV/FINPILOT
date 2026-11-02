import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// The API is proxied so the session cookie stays first-party (same origin) in development.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: { "/api": { target: process.env.VITE_API_PROXY_TARGET ?? "http://localhost:4000", changeOrigin: false } },
  },
  preview: { port: 4173 },
});
