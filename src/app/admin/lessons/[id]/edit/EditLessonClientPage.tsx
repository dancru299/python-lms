import LessonEditorForm, {
  type LessonEditorChapter,
  type LessonEditorLesson,
} from "@/components/lessons/LessonEditorForm";
import type { LessonAiClientConfig } from "@/lib/ai/provider-types";

interface EditLessonClientPageProps {
  initialChapters: LessonEditorChapter[];
  initialAiConfig: LessonAiClientConfig;
  initialLesson: LessonEditorLesson;
}

export default function EditLessonClientPage({
  initialChapters,
  initialAiConfig,
  initialLesson,
}: EditLessonClientPageProps) {
  return (
    <LessonEditorForm
      mode="edit"
      initialChapters={initialChapters}
      initialAiConfig={initialAiConfig}
      initialLesson={initialLesson}
    />
  );
}
