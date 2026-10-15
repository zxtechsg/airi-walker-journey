import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  base: "/airi-walker-journey/game/",
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: { "/api": { target: "http://127.0.0.1:8780", changeOrigin: true } },
  },
  build: {
    outDir: "../dist/game",
    emptyOutDir: true,
    chunkSizeWarningLimit: 750,
    rollupOptions: {
      output: {
        manualChunks: (id: string) =>
          id.includes("node_modules/three") ? "three" : undefined,
      },
    },
  },
});
