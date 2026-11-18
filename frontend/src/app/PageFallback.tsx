import { useContext } from "react";
import PageLoader from "@/shared/components/PageLoader.tsx";
import { ShellContext } from "@/shared/components/layout/shellContext.ts";

/** Inside a role shell only the content area shows a spinner, so the sidebar stays visible. */
export default function PageFallback() {
  const inShell = useContext(ShellContext);
  if (!inShell) return <PageLoader />;
  return (
    <div role="status" aria-live="polite" className="flex min-h-[40vh] items-center justify-center">
      <svg className="size-8 animate-spin text-slate-700 motion-reduce:animate-none" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <span className="sr-only">Đang tải</span>
    </div>
  );
}
