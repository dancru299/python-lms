export const TAB_COMPLETION_SECONDS = 60;

interface LessonProgressSectionSource {
  id: string;
  title: string;
}

interface LessonProgressExerciseSource {
  type: string;
}

interface LessonProgressLessonSource {
  sections: LessonProgressSectionSource[];
  exercises: LessonProgressExerciseSource[];
}

export interface LessonProgressTabDefinition {
  id: string;
  label: string;
}

export interface LessonProgressTabRecord {
  tabId: string;
  timeSpent: number;
  completed: boolean;
}

export interface LessonProgressTabState extends LessonProgressTabDefinition {
  timeSpent: number;
  completed: boolean;
  remainingSeconds: number;
}

export interface LessonProgressSummary {
  completed: boolean;
  completedTabs: number;
  totalTabs: number;
  percent: number;
  timeSpent: number;
  tabs: LessonProgressTabState[];
}

export function buildLessonProgressTabs(
  lesson: LessonProgressLessonSource
): LessonProgressTabDefinition[] {
  const tabs: LessonProgressTabDefinition[] = [{ id: "trang-chu", label: "Trang chủ" }];

  lesson.sections.forEach((section, index) => {
    tabs.push({
      id: `section-${section.id}`,
      label: `${index + 1}. ${section.title}`,
    });
  });

  const hasPracticeExercises = lesson.exercises.some((exercise) => exercise.type === "practice");
  const hasHomeworkExercises = lesson.exercises.some((exercise) => exercise.type === "homework");

  if (hasPracticeExercises) {
    tabs.push({ id: "luyen-tap", label: "Luyện tập" });
  }

  if (hasHomeworkExercises) {
    tabs.push({ id: "bai-tap", label: "Bài tập về nhà" });
  }

  return tabs;
}

export function summarizeLessonProgress(
  tabDefinitions: LessonProgressTabDefinition[],
  tabRecords: LessonProgressTabRecord[]
): LessonProgressSummary {
  const recordMap = new Map(tabRecords.map((record) => [record.tabId, record]));

  const tabs = tabDefinitions.map((tab) => {
    const record = recordMap.get(tab.id);
    const timeSpent = record?.timeSpent ?? 0;
    const completed = record?.completed ?? false;

    return {
      ...tab,
      timeSpent,
      completed,
      remainingSeconds: Math.max(TAB_COMPLETION_SECONDS - timeSpent, 0),
    };
  });

  const completedTabs = tabs.filter((tab) => tab.completed).length;
  const totalTabs = tabs.length;
  const percent = totalTabs > 0 ? Math.round((completedTabs / totalTabs) * 100) : 0;
  const timeSpent = tabs.reduce((sum, tab) => sum + tab.timeSpent, 0);

  return {
    completed: totalTabs > 0 && completedTabs === totalTabs,
    completedTabs,
    totalTabs,
    percent,
    timeSpent,
    tabs,
  };
}
