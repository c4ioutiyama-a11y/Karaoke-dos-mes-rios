import { defineConfig } from "vite";

export default defineConfig({
  // Caminhos relativos: a mesma build funciona num servidor web e, no futuro,
  // empacotada dentro de um instalador (Electron/Tauri).
  base: "./",
  worker: { format: "es" },
  build: { target: "es2022" },
});
