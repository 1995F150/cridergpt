
import { ProjectManager } from "@/components/ProjectManager";
import { DedicationMessage } from "@/components/DedicationMessage";

export function ProjectPanel() {
  return (
    <div className="project-manager-panel h-full w-full p-8">
      <DedicationMessage />
      <ProjectManager />
    </div>
  );
}
