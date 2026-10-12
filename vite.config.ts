import path from "path"
import { mobrowserReactAnnotation } from "@mobrowser/api/internal/vite/react"
import react from "@vitejs/plugin-react"
import { defineConfig, type UserConfig } from "vite"

export default defineConfig(({ command, mode }) => {
  if (mode === "main") {
    return defineMainConfig()
  }
  if (mode === "renderer") {
    return defineRendererConfig(command)
  }
  throw new Error(`Unsupported Vite config mode: ${mode}`)
})

function defineMainConfig(): UserConfig {
  return {
    root: path.resolve(import.meta.dirname, "./src/main"),
    build: {
      target: "esnext",
      outDir: path.resolve(import.meta.dirname, "./out/main"),
      emptyOutDir: true,
      sourcemap: true,
      lib: {
        entry: path.resolve(import.meta.dirname, "./src/main/index.ts"),
        formats: ["es"],
        fileName: () => "index.js",
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "./src/main"),
      },
    },
    server: {
      forwardConsole: {
        unhandledErrors: true,
        logLevels: ['warn', 'error'],
      },
    },
  }
}


function defineRendererConfig(command: "build" | "serve"): UserConfig {
  return {
    root: path.resolve(import.meta.dirname, "./src/renderer"),
    plugins: [react(mobrowserReactAnnotation(command))],
    build: {
      outDir: path.resolve(import.meta.dirname, "./out/renderer"),
      emptyOutDir: true,
      sourcemap: true,
    },
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "./src/renderer"),
      },
    },
    server: {
      forwardConsole: {
        unhandledErrors: true,
        logLevels: ['warn', 'error'],
      },
    },
  }
}
