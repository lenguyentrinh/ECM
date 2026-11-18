import { lazy, Suspense, type ComponentType } from "react";
import PageFallback from "@/app/PageFallback.tsx";

/**
 * Route-level code splitting: the page chunk loads on first render.
 * Call at module level only (a call inside a component would remount the page every render).
 * Failed chunk loads are handled globally by `reloadOnStaleChunk`.
 */
export function lazyPage(load: () => Promise<{ default: ComponentType }>): ComponentType {
  const Page = lazy(load);
  return function LazyPage() {
    return (
      <Suspense fallback={<PageFallback />}>
        <Page />
      </Suspense>
    );
  };
}
