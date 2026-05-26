import type { CurriculumDraft } from "@/lib/programs/ebook-curriculum";

export const CURRICULUM_QUALITY_PASS_SCORE = 75;

export type CurriculumQualitySeverity = "critical" | "warning" | "suggestion";
export type CurriculumQualityDimensionKey =
  | "structure"
  | "roadmap"
  | "outcomes"
  | "skills"
  | "practice"
  | "governance";

export interface CurriculumQualityIssue {
  id: string;
  severity: CurriculumQualitySeverity;
  dimension: CurriculumQualityDimensionKey;
  title: string;
  detail: string;
  fixHint: string;
  relatedItems?: string[];
}

export interface CurriculumQualityDimension {
  key: CurriculumQualityDimensionKey;
  label: string;
  maxScore: number;
  score: number;
  status: "good" | "needs-work" | "blocked";
  notes: string[];
}

export interface CurriculumQualityReport {
  score: number;
  passScore: number;
  passed: boolean;
  statusLabel: string;
  summary: string;
  dimensions: CurriculumQualityDimension[];
  issues: CurriculumQualityIssue[];
}

interface DimensionDraft {
  key: CurriculumQualityDimensionKey;
  label: string;
  maxScore: number;
  score: number;
  notes: string[];
}

const measurableOutcomeVerbs = [
  "viet",
  "tao",
  "xay dung",
  "giai thich",
  "trinh bay",
  "mo ta",
  "nhan dien",
  "xac dinh",
  "phan tich",
  "ap dung",
  "van dung",
  "hoan thanh",
  "sua",
  "sua loi",
  "debug",
  "thiet ke",
  "trien khai",
  "so sanh",
  "su dung",
  "cai dat",
  "kiem tra",
  "chay",
  "doc",
  "xu ly",
  "ve",
];

const vagueOutcomePatterns = [
  "nam duoc",
  "hieu",
  "biet",
  "lam quen",
  "tong quan",
  "kien thuc trong",
];

const practicePatterns = [
  "bai tap",
  "thuc hanh",
  "du an",
  "project",
  "on tap",
  "luyen",
  "kiem tra",
  "quiz",
  "test",
  "challenge",
];

export function evaluateCurriculumDraft(
  draft: CurriculumDraft | null | undefined
): CurriculumQualityReport {
  if (!draft) {
    return {
      score: 0,
      passScore: CURRICULUM_QUALITY_PASS_SCORE,
      passed: false,
      statusLabel: "Chưa có bản nháp",
      summary: "Hãy parse mục lục và tạo gợi ý roadmap trước khi duyệt.",
      dimensions: createEmptyDimensions(),
      issues: [
        {
          id: "missing-draft",
          severity: "critical",
          dimension: "structure",
          title: "Chưa có dữ liệu để duyệt",
          detail: "Bộ lọc cần bản nháp chương trình gồm lesson, milestone, outcome và skill.",
          fixHint: "Parse mục lục, sau đó bấm tạo gợi ý roadmap.",
        },
      ],
    };
  }

  const issues: CurriculumQualityIssue[] = [];
  const dimensions = createDimensionDrafts();
  const lessonByKey = new Map(draft.lessons.map((lesson) => [lesson.key, lesson]));
  const milestoneByKey = new Map(draft.milestones.map((milestone) => [milestone.key, milestone]));
  const outcomeByKey = new Map(draft.outcomes.map((outcome) => [outcome.key, outcome]));
  const skillByKey = new Map(draft.skills.map((skill) => [skill.key, skill]));
  const lessonKeysInMilestones = new Set(draft.milestones.flatMap((milestone) => milestone.lessonKeys));
  const outcomeKeysInSkills = new Set(draft.skills.flatMap((skill) => skill.outcomeKeys));

  scoreStructure(draft, dimensions.structure, issues, lessonKeysInMilestones);
  scoreRoadmap(draft, dimensions.roadmap, issues, lessonByKey);
  scoreOutcomes(draft, dimensions.outcomes, issues, milestoneByKey);
  scoreSkills(draft, dimensions.skills, issues, outcomeByKey, skillByKey);
  scorePractice(draft, dimensions.practice, issues);
  scoreGovernance(draft, dimensions.governance, issues, lessonKeysInMilestones, outcomeKeysInSkills);

  const finalDimensions = Object.values(dimensions).map(toFinalDimension);
  const score = Math.max(
    0,
    Math.min(
      100,
      Math.round(finalDimensions.reduce((sum, dimension) => sum + dimension.score, 0))
    )
  );
  const hasCritical = issues.some((issue) => issue.severity === "critical");
  const passed = score >= CURRICULUM_QUALITY_PASS_SCORE && !hasCritical;

  return {
    score,
    passScore: CURRICULUM_QUALITY_PASS_SCORE,
    passed,
    statusLabel: passed ? "Đạt chuẩn duyệt" : hasCritical ? "Chưa thể duyệt" : "Cần chỉnh trước khi duyệt",
    summary: passed
      ? "Khung chương trình đủ rõ về lộ trình, outcome, skill và cách đo tiến độ."
      : "Bản nháp còn điểm cần chỉnh trước khi coi là giáo trình đạt chuẩn.",
    dimensions: finalDimensions,
    issues: sortIssues(issues),
  };
}

function createDimensionDrafts(): Record<CurriculumQualityDimensionKey, DimensionDraft> {
  return {
    structure: {
      key: "structure",
      label: "Cấu trúc chương trình",
      maxScore: 18,
      score: 18,
      notes: [],
    },
    roadmap: {
      key: "roadmap",
      label: "Lộ trình học",
      maxScore: 17,
      score: 17,
      notes: [],
    },
    outcomes: {
      key: "outcomes",
      label: "Learning outcome",
      maxScore: 25,
      score: 25,
      notes: [],
    },
    skills: {
      key: "skills",
      label: "Skill tree",
      maxScore: 18,
      score: 18,
      notes: [],
    },
    practice: {
      key: "practice",
      label: "Thực hành và đánh giá",
      maxScore: 12,
      score: 12,
      notes: [],
    },
    governance: {
      key: "governance",
      label: "Sẵn sàng biên soạn",
      maxScore: 10,
      score: 10,
      notes: [],
    },
  };
}

function createEmptyDimensions(): CurriculumQualityDimension[] {
  return Object.values(createDimensionDrafts()).map((dimension) => ({
    ...dimension,
    score: 0,
    status: "blocked",
    notes: ["Chưa có bản nháp để chấm."],
  }));
}

function scoreStructure(
  draft: CurriculumDraft,
  dimension: DimensionDraft,
  issues: CurriculumQualityIssue[],
  lessonKeysInMilestones: Set<string>
) {
  if (!draft.programTitle.trim()) {
    penalize(dimension, 3, "Thiếu tên chương trình.");
    addIssue(issues, "critical", "structure", "Thiếu tên chương trình", "Tên chương trình là tín hiệu đầu tiên để giáo viên và học sinh hiểu phạm vi học.", "Đặt tên theo chủ đề và trình độ, ví dụ: Python nền tảng cho người mới.");
  }

  if (draft.chapters.length === 0) {
    penalize(dimension, 4, "Chưa có chapter nguồn.");
    addIssue(issues, "critical", "structure", "Chưa có chapter", "Không thể dựng giáo trình nếu mục lục chưa tách được chương.", "Kiểm tra lại mục lục ebook hoặc paste phần mục lục rõ hơn.");
  }

  if (draft.lessons.length === 0) {
    penalize(dimension, 5, "Chưa có lesson.");
    addIssue(issues, "critical", "structure", "Chưa có bài học", "Roadmap cần lesson để tính tiến độ và tạo nội dung sau này.", "Mỗi mục 1.1, 1.2 hoặc bài tập nên trở thành một lesson nháp.");
  }

  if (draft.milestones.length === 0) {
    penalize(dimension, 4, "Chưa có milestone.");
    addIssue(issues, "critical", "structure", "Chưa có milestone", "Milestone là lớp lộ trình phía trên nội dung bài học.", "Tạo ít nhất một milestone cho mỗi chặng học chính.");
  }

  const unlinkedLessons = draft.lessons.filter((lesson) => !lessonKeysInMilestones.has(lesson.key));
  if (unlinkedLessons.length > 0) {
    penalize(dimension, Math.min(4, unlinkedLessons.length), `${unlinkedLessons.length} lesson chưa vào roadmap.`);
    addIssue(issues, "warning", "structure", "Có bài học chưa nằm trong roadmap", `${unlinkedLessons.length} lesson sẽ không xuất hiện đúng trong lộ trình học sinh.`, "Gắn mọi lesson vào milestone phù hợp hoặc loại khỏi bản nháp.");
  }
}

function scoreRoadmap(
  draft: CurriculumDraft,
  dimension: DimensionDraft,
  issues: CurriculumQualityIssue[],
  lessonByKey: Map<string, CurriculumDraft["lessons"][number]>
) {
  const emptyMilestones = draft.milestones.filter((milestone) => milestone.lessonKeys.length === 0);
  if (emptyMilestones.length > 0) {
    penalize(dimension, Math.min(6, emptyMilestones.length * 2), `${emptyMilestones.length} milestone chưa có lesson.`);
    addIssue(issues, "critical", "roadmap", "Milestone chưa có bài học", "Một milestone rỗng không thể đo tiến độ hay hiển thị lộ trình học.", "Gắn lesson vào từng milestone hoặc xóa milestone rỗng.");
  }

  const overloadedMilestones = draft.milestones.filter((milestone) => milestone.lessonKeys.length > 8);
  if (overloadedMilestones.length > 0) {
    penalize(dimension, Math.min(4, overloadedMilestones.length * 2), "Milestone quá dài.");
    addIssue(issues, "warning", "roadmap", "Milestone quá dài", "Một chặng học quá nhiều bài làm học sinh khó thấy điểm kết thúc.", "Tách milestone lớn thành 2-3 chặng nhỏ hơn.");
  }

  const tinyMiddleMilestones = draft.milestones.filter(
    (milestone) => milestone.lessonKeys.length === 1 && draft.milestones.length > 2
  );
  if (tinyMiddleMilestones.length > 0) {
    penalize(dimension, Math.min(3, tinyMiddleMilestones.length), "Một số milestone quá mỏng.");
    addIssue(issues, "suggestion", "roadmap", "Milestone quá mỏng", "Milestone chỉ có một lesson thường chưa đủ tạo cảm giác một chặng học.", "Gộp với milestone gần nhất hoặc thêm bài thực hành/chốt kiến thức.");
  }

  const advancedEarly = draft.milestones[0]?.lessonKeys.some(
    (lessonKey) => lessonByKey.get(lessonKey)?.difficulty === "advanced"
  );
  if (advancedEarly) {
    penalize(dimension, 3, "Bài nâng cao xuất hiện quá sớm.");
    addIssue(issues, "warning", "roadmap", "Độ khó tăng chưa tự nhiên", "Bài advanced ở milestone đầu có thể làm lộ trình quá dốc.", "Đưa bài nâng cao về sau hoặc thêm bài nền tảng trước đó.");
  }

  const badDurations = draft.lessons.filter((lesson) => lesson.duration < 30 || lesson.duration > 120);
  if (badDurations.length > 0) {
    penalize(dimension, Math.min(3, badDurations.length), "Một số lesson có thời lượng bất thường.");
    addIssue(issues, "suggestion", "roadmap", "Thời lượng bài học cần rà lại", "Bài quá ngắn hoặc quá dài làm nhịp học khó ổn định.", "Giữ đa số lesson trong khoảng 45-90 phút, bài thực hành có thể dài hơn.");
  }
}

function scoreOutcomes(
  draft: CurriculumDraft,
  dimension: DimensionDraft,
  issues: CurriculumQualityIssue[],
  milestoneByKey: Map<string, CurriculumDraft["milestones"][number]>
) {
  const outcomesByMilestone = new Map<string, CurriculumDraft["outcomes"]>();
  draft.outcomes.forEach((outcome) => {
    outcomesByMilestone.set(outcome.milestoneKey, [
      ...(outcomesByMilestone.get(outcome.milestoneKey) ?? []),
      outcome,
    ]);
  });

  const milestonesWithoutOutcomes = draft.milestones.filter(
    (milestone) => (outcomesByMilestone.get(milestone.key) ?? []).length === 0
  );
  if (milestonesWithoutOutcomes.length > 0) {
    penalize(dimension, Math.min(8, milestonesWithoutOutcomes.length * 3), `${milestonesWithoutOutcomes.length} milestone chưa có outcome.`);
    addIssue(issues, "critical", "outcomes", "Milestone chưa có learning outcome", "Không có outcome thì không biết học xong chặng này học sinh làm được gì.", "Tạo 1-3 outcome đo được cho mỗi milestone.");
  }

  const outcomesWithoutLessons = draft.outcomes.filter((outcome) => outcome.lessonKeys.length === 0);
  if (outcomesWithoutLessons.length > 0) {
    penalize(dimension, Math.min(7, outcomesWithoutLessons.length * 2), `${outcomesWithoutLessons.length} outcome chưa gắn lesson.`);
    addIssue(issues, "critical", "outcomes", "Outcome chưa gắn bài đo", "Outcome cần lesson liên quan để tính progress.", "Gắn outcome với lesson trực tiếp tạo ra năng lực đó.");
  }

  const vagueOutcomes = draft.outcomes.filter((outcome) => !isMeasurableOutcome(outcome.title));
  if (vagueOutcomes.length > 0) {
    penalize(dimension, Math.min(6, vagueOutcomes.length * 2), `${vagueOutcomes.length} outcome còn mơ hồ.`);
    addIssue(
      issues,
      "warning",
      "outcomes",
      "Outcome chưa đo được rõ",
      `Có ${vagueOutcomes.length} outcome cần viết lại để mô tả hành động quan sát được, không chỉ 'hiểu' hoặc 'nắm'.`,
      "Viết theo mẫu: Học sinh có thể + động từ hành động + sản phẩm/bài toán.",
      vagueOutcomes.map((outcome) => outcome.title)
    );
  }

  const duplicateOutcomeTitles = findDuplicates(draft.outcomes.map((outcome) => normalizeText(outcome.title)));
  if (duplicateOutcomeTitles.length > 0) {
    penalize(dimension, Math.min(3, duplicateOutcomeTitles.length), "Có outcome trùng tên.");
    addIssue(issues, "suggestion", "outcomes", "Outcome bị trùng", "Outcome trùng làm rubric đánh giá thiếu sắc nét.", "Gộp outcome trùng hoặc viết lại để phân biệt năng lực.");
  }

  for (const [milestoneKey, outcomes] of outcomesByMilestone.entries()) {
    if (!milestoneByKey.has(milestoneKey)) {
      penalize(dimension, 2, "Outcome trỏ tới milestone không tồn tại.");
      addIssue(issues, "critical", "outcomes", "Outcome trỏ sai milestone", "Mapping sai làm dashboard không tính đúng tiến độ.", "Chọn lại milestone hợp lệ cho outcome.");
    }
    if (outcomes.length > 4) {
      penalize(dimension, 2, "Một milestone có quá nhiều outcome.");
      addIssue(issues, "suggestion", "outcomes", "Quá nhiều outcome trong một milestone", "Nhiều outcome nhỏ làm giáo trình khó theo dõi.", "Giữ 1-3 outcome chính cho mỗi milestone.");
    }
  }
}

function scoreSkills(
  draft: CurriculumDraft,
  dimension: DimensionDraft,
  issues: CurriculumQualityIssue[],
  outcomeByKey: Map<string, CurriculumDraft["outcomes"][number]>,
  skillByKey: Map<string, CurriculumDraft["skills"][number]>
) {
  if (draft.skills.length === 0) {
    penalize(dimension, 8, "Chưa có skill tree.");
    addIssue(issues, "critical", "skills", "Chưa có skill tree", "Skill tree giúp giáo viên và học sinh nhìn năng lực được hình thành.", "Tạo nhóm skill gốc và skill con theo năng lực Python.");
  }

  const rootSkills = draft.skills.filter((skill) => !skill.parentKey);
  if (draft.skills.length > 0 && rootSkills.length === 0) {
    penalize(dimension, 4, "Không có skill gốc.");
    addIssue(issues, "critical", "skills", "Skill tree thiếu skill gốc", "Cây kỹ năng cần node gốc để nhóm các năng lực con.", "Chọn 2-5 nhóm skill gốc như Môi trường, Cú pháp, Tư duy giải bài.");
  }

  const orphanSkills = draft.skills.filter((skill) => skill.parentKey && !skillByKey.has(skill.parentKey));
  if (orphanSkills.length > 0) {
    penalize(dimension, Math.min(4, orphanSkills.length * 2), "Có skill con trỏ sai parent.");
    addIssue(issues, "critical", "skills", "Skill con không có skill cha hợp lệ", "Mapping parent sai làm cây kỹ năng bị gãy.", "Gắn lại skill cha hoặc chuyển thành skill gốc.");
  }

  const outcomesWithoutSkills = draft.outcomes.filter(
    (outcome) => !draft.skills.some((skill) => skill.outcomeKeys.includes(outcome.key))
  );
  if (outcomesWithoutSkills.length > 0) {
    penalize(dimension, Math.min(6, outcomesWithoutSkills.length * 2), `${outcomesWithoutSkills.length} outcome chưa gắn skill.`);
    addIssue(issues, "critical", "skills", "Outcome chưa được map vào skill", "Outcome không gắn skill thì skill tree không phản ánh tiến độ thật.", "Gắn mỗi outcome vào ít nhất một skill phù hợp.");
  }

  const invalidOutcomeLinks = draft.skills.flatMap((skill) =>
    skill.outcomeKeys.filter((outcomeKey) => !outcomeByKey.has(outcomeKey))
  );
  if (invalidOutcomeLinks.length > 0) {
    penalize(dimension, Math.min(3, invalidOutcomeLinks.length), "Skill trỏ tới outcome không tồn tại.");
    addIssue(issues, "critical", "skills", "Skill mapping sai outcome", "Mapping sai làm trạng thái skill không tính được.", "Chỉ gắn skill vào outcome đang tồn tại trong bản nháp.");
  }

  const lessonTitles = new Set(draft.lessons.map((lesson) => normalizeText(lesson.title)));
  const copiedLessonSkillTitles = draft.skills.filter((skill) => lessonTitles.has(normalizeText(skill.title)));
  if (copiedLessonSkillTitles.length > 0) {
    penalize(dimension, Math.min(3, copiedLessonSkillTitles.length), "Skill đang copy tên bài học.");
    addIssue(issues, "warning", "skills", "Skill chưa phải năng lực", "Skill nên là năng lực bền vững, không phải tên bài học.", "Đổi thành năng lực như 'Dùng biến và biểu thức' thay vì copy tên lesson.");
  }
}

function scorePractice(
  draft: CurriculumDraft,
  dimension: DimensionDraft,
  issues: CurriculumQualityIssue[]
) {
  const practiceLessons = draft.lessons.filter((lesson) => practicePatterns.some((pattern) => normalizeText(lesson.title).includes(pattern)));
  if (practiceLessons.length === 0) {
    penalize(dimension, 5, "Chưa thấy bài thực hành/bài tập.");
    addIssue(issues, "warning", "practice", "Thiếu điểm thực hành", "Giáo trình lập trình cần bài luyện tập để kiểm tra năng lực thật.", "Thêm lesson thực hành, bài tập hoặc mini project cho các chặng chính.");
  }

  const milestonesWithoutPractice = draft.milestones.filter((milestone) => {
    const titles = milestone.lessonKeys
      .map((lessonKey) => draft.lessons.find((lesson) => lesson.key === lessonKey)?.title ?? "")
      .join(" ");
    return !practicePatterns.some((pattern) => normalizeText(titles).includes(pattern));
  });
  if (draft.milestones.length > 1 && milestonesWithoutPractice.length === draft.milestones.length) {
    penalize(dimension, 3, "Các milestone chưa có thực hành rõ ràng.");
    addIssue(issues, "suggestion", "practice", "Milestone thiếu bài chốt", "Mỗi chặng nên có một điểm vận dụng để giáo viên quan sát năng lực.", "Thêm bài tập cuối chặng hoặc gắn bài tập ebook vào milestone.");
  }

  const practiceOutcomes = draft.outcomes.filter((outcome) =>
    practicePatterns.some((pattern) => normalizeText(`${outcome.title} ${outcome.description ?? ""}`).includes(pattern))
  );
  if (practiceLessons.length > 0 && practiceOutcomes.length === 0) {
    penalize(dimension, 2, "Có bài tập nhưng outcome chưa phản ánh năng lực vận dụng.");
    addIssue(issues, "suggestion", "practice", "Outcome chưa bao phủ thực hành", "Nếu có bài tập, nên có outcome đo việc vận dụng.", "Thêm outcome dạng 'Hoàn thành được bài tập...' hoặc 'Viết được chương trình...'.");
  }
}

function scoreGovernance(
  draft: CurriculumDraft,
  dimension: DimensionDraft,
  issues: CurriculumQualityIssue[],
  lessonKeysInMilestones: Set<string>,
  outcomeKeysInSkills: Set<string>
) {
  if (!draft.programDescription?.trim()) {
    penalize(dimension, 2, "Thiếu mô tả chương trình.");
    addIssue(issues, "suggestion", "governance", "Thiếu mô tả chương trình", "Mô tả giúp giáo viên biết phạm vi và mục tiêu tổng quát.", "Viết 1-2 câu mô tả người học, phạm vi kiến thức và sản phẩm đầu ra.");
  }

  const criticalMappingBroken =
    draft.lessons.some((lesson) => !lessonKeysInMilestones.has(lesson.key)) ||
    draft.outcomes.some((outcome) => !outcomeKeysInSkills.has(outcome.key));
  if (criticalMappingBroken) {
    penalize(dimension, 3, "Mapping chưa khép kín.");
    addIssue(issues, "warning", "governance", "Mapping chưa khép kín", "Một giáo trình duyệt tốt cần trace được lesson -> outcome -> skill.", "Rà từng lesson và outcome để đảm bảo có đầy đủ liên kết.");
  }

  const missingDescriptions =
    draft.milestones.filter((item) => !item.description?.trim()).length +
    draft.outcomes.filter((item) => !item.description?.trim()).length +
    draft.skills.filter((item) => !item.description?.trim()).length;
  if (missingDescriptions > 0) {
    penalize(dimension, Math.min(3, missingDescriptions), "Một số node thiếu mô tả.");
    addIssue(issues, "suggestion", "governance", "Thiếu mô tả ở milestone/outcome/skill", "Mô tả ngắn giúp giáo viên duyệt nhanh và tránh hiểu sai.", "Bổ sung mô tả 1 câu cho các node quan trọng.");
  }

  const totalDuration = draft.lessons.reduce((sum, lesson) => sum + lesson.duration, 0);
  if (totalDuration > 0 && totalDuration < 120) {
    penalize(dimension, 2, "Tổng thời lượng quá ngắn cho một chương trình.");
    addIssue(issues, "warning", "governance", "Thời lượng chương trình quá ngắn", "Một chương trình đào tạo cần đủ thời lượng để hình thành năng lực.", "Kiểm tra xem mục lục đã paste đủ chương/mục chưa.");
  }
}

function penalize(dimension: DimensionDraft, amount: number, note: string) {
  dimension.score = Math.max(0, dimension.score - amount);
  dimension.notes.push(note);
}

function addIssue(
  issues: CurriculumQualityIssue[],
  severity: CurriculumQualitySeverity,
  dimension: CurriculumQualityDimensionKey,
  title: string,
  detail: string,
  fixHint: string,
  relatedItems?: string[]
) {
  const id = `${dimension}-${slugify(title)}-${issues.length + 1}`;
  issues.push({ id, severity, dimension, title, detail, fixHint, relatedItems });
}

function toFinalDimension(dimension: DimensionDraft): CurriculumQualityDimension {
  const ratio = dimension.maxScore > 0 ? dimension.score / dimension.maxScore : 0;
  return {
    ...dimension,
    score: Math.max(0, Math.min(dimension.maxScore, Math.round(dimension.score))),
    status: ratio >= 0.8 ? "good" : ratio >= 0.5 ? "needs-work" : "blocked",
    notes: dimension.notes.length > 0 ? dimension.notes : ["Đạt tiêu chí."],
  };
}

function sortIssues(issues: CurriculumQualityIssue[]) {
  const severityOrder: Record<CurriculumQualitySeverity, number> = {
    critical: 0,
    warning: 1,
    suggestion: 2,
  };
  return [...issues].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}

function isMeasurableOutcome(title: string) {
  const normalized = normalizeText(title);
  if (vagueOutcomePatterns.some((pattern) => normalized.includes(pattern))) {
    return measurableOutcomeVerbs.some((verb) => normalized.includes(verb)) && normalized.length >= 24;
  }
  return measurableOutcomeVerbs.some((verb) => normalized.includes(verb)) && normalized.length >= 18;
}

function findDuplicates(values: string[]) {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return Array.from(counts.entries())
    .filter(([, count]) => count > 1)
    .map(([value]) => value);
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(value: string) {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}
