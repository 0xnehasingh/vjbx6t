import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// For local work, "npm run dev" sends /api requests to the Python backend on port 8000.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:8000",
    },
  },
});
