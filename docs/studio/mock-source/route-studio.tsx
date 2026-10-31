import { createFileRoute } from "@tanstack/react-router";
import { StudioWorkspace } from "../../features/studio/components/studio-workspace.tsx";

export const Route = createFileRoute("/_authed/studio")({
  component: () => (
    <div className="w-full pt-2 pb-6">
      <StudioWorkspace />
    </div>
  ),
});
