/// <reference types="@solidjs/start/env" />
/// <reference types="@types/google.maps" />

declare global {
  interface Window {
    google?: typeof google;
  }
}

// Provide minimal module declaration for vite-tsconfig-paths plugin
declare module "vite-tsconfig-paths" {
  import type { Plugin } from "vite";
  function tsconfigPaths(): Plugin;
  export default tsconfigPaths;
}

export {};
