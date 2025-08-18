
import { TextToSpeech } from "@/components/TextToSpeech";
import { DedicationMessage } from "@/components/DedicationMessage";

export function TTSPanel() {
  return (
    <div className="panel h-full w-full p-8">
      <DedicationMessage />
      <TextToSpeech />
    </div>
  );
}
