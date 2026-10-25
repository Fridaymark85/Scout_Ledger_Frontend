import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite config: React plugin; /api is proxied to the future backend (port 8000).
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { "/api": "http://localhost:8000" } },
});
