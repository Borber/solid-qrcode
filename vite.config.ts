import { defineConfig } from "vite"
import solid from "vite-plugin-solid"
import { resolve } from "node:path"

export default defineConfig(({ command, mode }) => {
  const isDemo = command === "serve" || mode === "demo"

  return {
    root: isDemo ? resolve(__dirname, "demo") : undefined,
    plugins: [solid()],
    publicDir: false,
    build: isDemo
      ? {
        outDir: resolve(__dirname, "demo-dist"),
        emptyOutDir: true,
      }
      : {
        copyPublicDir: false,
        lib: {
          entry: resolve(__dirname, "src/index.ts"),
          name: "SolidQRCode",
          formats: ["es"],
          fileName: "index",
        },
        rollupOptions: {
          external: ["solid-js", "solid-js/web"],
        },
      },
  }
})
