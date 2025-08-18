
import { FileUpload } from "@/components/FileUpload";
import { DedicationMessage } from "@/components/DedicationMessage";

export function FilesPanel() {
  return (
    <div className="panel h-full w-full p-8">
      <DedicationMessage />
      <FileUpload />
    </div>
  );
}
