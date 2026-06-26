import { Suspense } from "react";
import { ToolsWorkspace } from "@/components/tools/ToolsWorkspace";

export default function ToolsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-100" />}>
      <ToolsWorkspace />
    </Suspense>
  );
}
