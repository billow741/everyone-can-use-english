import path from "path";
import react from "@vitejs/plugin-react";
import { viteStaticCopy } from "vite-plugin-static-copy";
import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  base: "/",
  build: {
    outDir: "dist-web",
    emptyOutDir: true,
    target: "esnext",
    sourcemap: false,
    chunkSizeWarningLimit: 2000,
  },
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: "assets/*",
          dest: "assets",
        },
      ],
    }),
  ],
  resolve: {
    preserveSymlinks: true,
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@renderer": path.resolve(__dirname, "./src/renderer"),
      "@commands": path.resolve(__dirname, "./src/commands"),
      "vendor/pdfjs": path.resolve(
        __dirname,
        "./node_modules/foliate-js/vendor/pdfjs"
      ),
    },
  },
  optimizeDeps: {
    exclude: ["@ffmpeg/ffmpeg", "@ffmpeg/util"],
    esbuildOptions: {
      target: "esnext",
    },
  },
});
