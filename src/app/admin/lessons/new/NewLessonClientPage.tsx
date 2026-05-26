import LessonEditorForm, {
  type LessonEditorChapter,
} from "@/components/lessons/LessonEditorForm";
import type { LessonAiClientConfig } from "@/lib/ai/provider-types";

interface NewLessonClientPageProps {
  initialChapters: LessonEditorChapter[];
  initialChapterId: string;
  initialAiConfig: LessonAiClientConfig;
}

export default function NewLessonClientPage({
  initialChapters,
  initialChapterId,
  initialAiConfig,
}: NewLessonClientPageProps) {
  return (
    <LessonEditorForm
      mode="create"
      initialChapters={initialChapters}
      initialChapterId={initialChapterId}
      initialAiConfig={initialAiConfig}
    />
  );
}
