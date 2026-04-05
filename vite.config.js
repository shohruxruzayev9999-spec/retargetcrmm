import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    target: "es2020",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/firebase")) return "firebase";
          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom")) return "react-vendor";
        },
      },
    },
  },
  // Ensure env vars are loaded properly
  envPrefix: "VITE_",
});
