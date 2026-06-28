import { describe, it, expect } from "vitest";
import { normalizeScheduleRules } from "./classroom-schedule";

describe("normalizeScheduleRules", () => {
  it("không phải mảng -> []", () => {
    expect(normalizeScheduleRules(null)).toEqual([]);
    expect(normalizeScheduleRules(undefined)).toEqual([]);
    expect(normalizeScheduleRules("x")).toEqual([]);
    expect(normalizeScheduleRules({})).toEqual([]);
  });

  it("giữ rule hợp lệ", () => {
    expect(
      normalizeScheduleRules([{ weekday: 2, startTime: "08:00", endTime: "09:30" }])
    ).toEqual([{ weekday: 2, startTime: "08:00", endTime: "09:30" }]);
  });

  it("loại weekday ngoài 0..6 hoặc không nguyên", () => {
    expect(normalizeScheduleRules([{ weekday: 7, startTime: "08:00" }])).toEqual([]);
    expect(normalizeScheduleRules([{ weekday: -1, startTime: "08:00" }])).toEqual([]);
    expect(normalizeScheduleRules([{ weekday: 1.5, startTime: "08:00" }])).toEqual([]);
  });

  it("loại startTime sai định dạng / ngoài phạm vi", () => {
    expect(normalizeScheduleRules([{ weekday: 1, startTime: "25:00" }])).toEqual([]);
    expect(normalizeScheduleRules([{ weekday: 1, startTime: "8h" }])).toEqual([]);
    expect(normalizeScheduleRules([{ weekday: 1, startTime: "08:60" }])).toEqual([]);
  });

  it("endTime null/rỗng -> null; endTime sai -> loại cả rule", () => {
    expect(normalizeScheduleRules([{ weekday: 1, startTime: "08:00" }])).toEqual([
      { weekday: 1, startTime: "08:00", endTime: null },
    ]);
    expect(normalizeScheduleRules([{ weekday: 1, startTime: "08:00", endTime: "" }])).toEqual([
      { weekday: 1, startTime: "08:00", endTime: null },
    ]);
    expect(
      normalizeScheduleRules([{ weekday: 1, startTime: "08:00", endTime: "99:99" }])
    ).toEqual([]);
  });

  it("khử trùng theo (weekday, startTime) — giữ rule đầu tiên", () => {
    const result = normalizeScheduleRules([
      { weekday: 3, startTime: "08:00", endTime: "09:00" },
      { weekday: 3, startTime: "08:00", endTime: "10:00" },
      { weekday: 3, startTime: "13:00" },
    ]);
    expect(result).toEqual([
      { weekday: 3, startTime: "08:00", endTime: "09:00" },
      { weekday: 3, startTime: "13:00", endTime: null },
    ]);
  });

  it("bỏ qua phần tử không phải object", () => {
    expect(
      normalizeScheduleRules([null, 5, "x", { weekday: 0, startTime: "07:05" }])
    ).toEqual([{ weekday: 0, startTime: "07:05", endTime: null }]);
  });
});
