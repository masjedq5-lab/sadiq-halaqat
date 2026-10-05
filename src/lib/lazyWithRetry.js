import { lazy } from "react";

const CHUNK_RELOAD_KEY = "sadiq:chunk-reload";

export default function lazyWithRetry(importer) {
  return lazy(async () => {
    try {
      const module = await importer();

      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(CHUNK_RELOAD_KEY);
      }

      return module;
    } catch (error) {
      const message = String(error?.message || error || "");
      const isChunkLoadError =
        /Failed to fetch dynamically imported module/i.test(message) ||
        /Importing a module script failed/i.test(message) ||
        /Loading chunk/i.test(message) ||
        /dynamically imported module/i.test(message) ||
        /MIME type/i.test(message) ||
        /valid JavaScript MIME type/i.test(message);

      if (isChunkLoadError && typeof window !== "undefined") {
        const lastReload = Number(
          window.sessionStorage.getItem(CHUNK_RELOAD_KEY) || 0
        );

        // A production deployment can replace hashed Vite chunks while an
        // already-open tab still has the previous app shell in memory.
        // Reload once to fetch the current index and chunk manifest.
        if (!lastReload || Date.now() - lastReload > 15000) {
          window.sessionStorage.setItem(
            CHUNK_RELOAD_KEY,
            String(Date.now())
          );
          window.location.reload();

          return new Promise(() => {});
        }
      }

      throw error;
    }
  });
}

