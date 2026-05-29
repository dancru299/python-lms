import prisma from "@/lib/prisma";

// App phục vụ một vùng (VN) nên dùng offset cố định UTC+7, không DST.
const OFFSET_HOURS = 7;

// Số tuần sinh sẵn khi lớp không đặt ngày kết thúc.
const DEFAULT_HORIZON_WEEKS = 16;

// Giới hạn an toàn để tránh sinh quá nhiều buổi.
const MAX_DAYS = 400;

export const WEEKDAY_LABELS = [
  "Chủ nhật",
  "Thứ 2",
  "Thứ 3",
  "Thứ 4",
  "Thứ 5",
  "Thứ 6",
  "Thứ 7",
];

export interface ScheduleRuleInput {
  weekday: number; // 0=CN ... 6=T7
  startTime: string; // "HH:MM"
  endTime?: string | null; // "HH:MM"
}

function parseHHMM(value: string): [number, number] | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return [h, m];
}

// Tạo instant UTC từ ngày dương lịch + giờ địa phương (UTC+7).
function localInstant(
  year: number,
  monthIndex: number,
  day: number,
  hhmm: string,
): Date | null {
  const parsed = parseHHMM(hhmm);
  if (!parsed) return null;
  const [h, m] = parsed;
  return new Date(Date.UTC(year, monthIndex, day, h - OFFSET_HOURS, m));
}

export function normalizeScheduleRules(
  rules: unknown,
): ScheduleRuleInput[] {
  if (!Array.isArray(rules)) return [];
  const seen = new Set<string>();
  const result: ScheduleRuleInput[] = [];

  for (const raw of rules) {
    if (!raw || typeof raw !== "object") continue;
    const weekday = Number((raw as { weekday?: unknown }).weekday);
    const startTime = String((raw as { startTime?: unknown }).startTime ?? "").trim();
    const endTimeRaw = (raw as { endTime?: unknown }).endTime;
    const endTime =
      endTimeRaw === null || endTimeRaw === undefined
        ? null
        : String(endTimeRaw).trim() || null;

    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) continue;
    if (!parseHHMM(startTime)) continue;
    if (endTime && !parseHHMM(endTime)) continue;

    const key = `${weekday}-${startTime}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ weekday, startTime, endTime });
  }

  return result;
}

// Sinh lại các buổi học từ scheduleRules trong khoảng [startDate, endDate].
// Giữ nguyên buổi đã có bài tập gắn vào; chỉ xóa buổi "mồ côi" do đổi lịch.
export async function regenerateClassroomSessions(classroomId: string): Promise<void> {
  const classroom = await prisma.classroom.findUnique({
    where: { id: classroomId },
    select: {
      startDate: true,
      endDate: true,
      scheduleRules: {
        select: { weekday: true, startTime: true, endTime: true },
      },
    },
  });

  if (!classroom) return;

  const existing = await prisma.classroomSession.findMany({
    where: { classroomId },
    select: {
      id: true,
      startsAt: true,
      _count: { select: { assignments: true } },
    },
  });
  const existingByIso = new Map(existing.map((s) => [s.startsAt.toISOString(), s]));

  // Không có lịch hoặc ngày bắt đầu => xóa các buổi mồ côi và dừng.
  if (!classroom.startDate || classroom.scheduleRules.length === 0) {
    const orphanIds = existing
      .filter((s) => s._count.assignments === 0)
      .map((s) => s.id);
    if (orphanIds.length > 0) {
      await prisma.classroomSession.deleteMany({ where: { id: { in: orphanIds } } });
    }
    return;
  }

  const rulesByWeekday = new Map<number, ScheduleRuleInput[]>();
  for (const rule of classroom.scheduleRules) {
    const list = rulesByWeekday.get(rule.weekday) ?? [];
    list.push(rule);
    rulesByWeekday.set(rule.weekday, list);
  }

  const start = classroom.startDate;
  const horizonDefault = new Date(start.getTime());
  horizonDefault.setUTCDate(horizonDefault.getUTCDate() + DEFAULT_HORIZON_WEEKS * 7);
  const end = classroom.endDate ?? horizonDefault;

  const desired = new Map<string, { startsAt: Date; endsAt: Date | null }>();

  const cursor = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()),
  );
  let dayCount = 0;
  while (cursor.getTime() <= end.getTime() && dayCount < MAX_DAYS) {
    const weekday = cursor.getUTCDay();
    const rules = rulesByWeekday.get(weekday);
    if (rules) {
      for (const rule of rules) {
        const startsAt = localInstant(
          cursor.getUTCFullYear(),
          cursor.getUTCMonth(),
          cursor.getUTCDate(),
          rule.startTime,
        );
        if (!startsAt) continue;
        const endsAt = rule.endTime
          ? localInstant(
              cursor.getUTCFullYear(),
              cursor.getUTCMonth(),
              cursor.getUTCDate(),
              rule.endTime,
            )
          : null;
        desired.set(startsAt.toISOString(), { startsAt, endsAt });
      }
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    dayCount += 1;
  }

  const toCreate = [...desired.entries()]
    .filter(([iso]) => !existingByIso.has(iso))
    .map(([, value]) => ({
      classroomId,
      startsAt: value.startsAt,
      endsAt: value.endsAt,
    }));

  const toDelete = existing
    .filter((s) => !desired.has(s.startsAt.toISOString()) && s._count.assignments === 0)
    .map((s) => s.id);

  await prisma.$transaction(async (tx) => {
    if (toDelete.length > 0) {
      await tx.classroomSession.deleteMany({ where: { id: { in: toDelete } } });
    }
    if (toCreate.length > 0) {
      await tx.classroomSession.createMany({ data: toCreate });
    }
  });
}

// Buổi học kế tiếp (đang lên lịch) sau mốc thời gian cho trước.
export async function getNextSession(
  classroomId: string,
  after: Date = new Date(),
): Promise<{ id: string; startsAt: Date } | null> {
  return prisma.classroomSession.findFirst({
    where: {
      classroomId,
      status: "scheduled",
      startsAt: { gt: after },
    },
    orderBy: { startsAt: "asc" },
    select: { id: true, startsAt: true },
  });
}
