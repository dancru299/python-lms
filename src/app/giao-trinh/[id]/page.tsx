import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import PublicHeader from "../PublicHeader";
import CurriculumSectionNav from "./CurriculumSectionNav";
import { getPublicProgramDetail } from "@/lib/programs/public-curriculum";

interface PageProps {
  params: Promise<{ id: string }>;
}

function formatDuration(minutes: number): string {
  if (minutes <= 0) return "—";
  if (minutes < 60) return `${minutes} phút`;
  const hours = Math.round(minutes / 60);
  return `~${hours} giờ`;
}

function difficultyMeta(level: string): { label: string; className: string } {
  if (level === "advanced" || level === "hard") {
    return { label: "Nâng cao", className: "bg-rose-50 text-rose-600 ring-1 ring-rose-100" };
  }
  if (level === "intermediate" || level === "medium") {
    return { label: "Trung bình", className: "bg-amber-50 text-amber-600 ring-1 ring-amber-100" };
  }
  return { label: "Cơ bản", className: "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100" };
}

// Emoji often used as section headers in a description (NOT inline arrows like ➡️).
const SECTION_EMOJI = "🌟🎯💎📌🚀✨📚🎓⭐🔥✅💡🧠📖🏆📝🎁🔑🌈";
const LEADING_EMOJI = new RegExp(`^(?:${[...SECTION_EMOJI].join("|")})\\s*`, "u");
const SPLIT_BEFORE_EMOJI = new RegExp(`(?=(?:${[...SECTION_EMOJI].join("|")}))`, "u");

/**
 * Turn a free-text program description into readable paragraphs: honor explicit line
 * breaks, otherwise break the block before each section-header emoji so a long run-on
 * description reads as distinct sections instead of one wall of text.
 */
function splitDescriptionParagraphs(raw: string): string[] {
  const text = raw.replace(/\r\n/g, "\n").trim();
  const byLine = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  if (byLine.length > 1) return byLine;
  return text.split(SPLIT_BEFORE_EMOJI).map((part) => part.trim()).filter(Boolean);
}

function stripLeadingEmoji(text: string): string {
  return text.replace(LEADING_EMOJI, "").trim();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const program = await getPublicProgramDetail(id);
  if (!program) return { title: "Giáo trình · Python LMS" };
  return {
    title: `${program.title} · Giáo trình · Python LMS`,
    description: program.description ?? "Lộ trình học, mục tiêu đầu ra và kỹ năng của chương trình.",
  };
}

export default async function CurriculumDetailPage({ params }: PageProps) {
  const { id } = await params;
  const program = await getPublicProgramDetail(id);

  if (!program) {
    notFound();
  }

  const stats = [
    { value: program.milestoneCount, label: "Mốc học", icon: "fa-flag-checkered" },
    { value: program.lessonCount, label: "Bài học", icon: "fa-book" },
    { value: program.skillCount, label: "Kỹ năng", icon: "fa-bolt" },
    { value: formatDuration(program.totalMinutes), label: "Thời lượng", icon: "fa-clock" },
  ];

  const paragraphs = program.description ? splitDescriptionParagraphs(program.description) : [];
  const lead = paragraphs[0] ? stripLeadingEmoji(paragraphs[0]) : null;

  const navItems = [
    paragraphs.length > 0 ? { href: "#tong-quan", label: "Tổng quan" } : null,
    program.milestones.length > 0 ? { href: "#lo-trinh", label: "Lộ trình" } : null,
    program.skills.length > 0 ? { href: "#ky-nang", label: "Kỹ năng" } : null,
  ].filter((item): item is { href: string; label: string } => item !== null);

  return (
    <div className="min-h-screen bg-white">
      <PublicHeader />

      {/* ── Hero (light) ── */}
      <section className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-b from-indigo-50/60 via-white to-white">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-indigo-100/40 blur-3xl" />
        <div className="relative mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <nav className="flex items-center gap-2 text-sm text-slate-400">
            <Link href="/giao-trinh" className="font-medium text-slate-500 transition hover:text-indigo-600">
              Giáo trình
            </Link>
            <i className="fa-solid fa-chevron-right text-[10px]"></i>
            <span className="truncate text-slate-400">{program.title}</span>
          </nav>

          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600 ring-1 ring-indigo-100">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
            Chương trình đào tạo
          </div>

          <h1 className="font-display mt-4 max-w-3xl text-3xl font-extrabold leading-[1.15] text-slate-900 sm:text-4xl lg:text-[2.75rem]">
            {program.title}
          </h1>

          {lead && (
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-500 line-clamp-2">{lead}</p>
          )}

          <dl className="mt-8 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
              >
                <dt className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                  <i className={`fa-solid ${stat.icon} text-indigo-400`}></i>
                  {stat.label}
                </dt>
                <dd className="font-display mt-1 text-2xl font-bold text-slate-900">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── Sticky section nav (active-section highlight is client-side) ── */}
      {navItems.length > 0 && <CurriculumSectionNav items={navItems} />}

      <main className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8">
        {/* ── Overview ── */}
        {paragraphs.length > 0 && (
          <section id="tong-quan" className="scroll-mt-32">
            <h2 className="font-display text-2xl font-bold text-slate-900">Tổng quan chương trình</h2>
            <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="max-w-3xl space-y-4 text-[15px] leading-7 text-slate-600">
                {paragraphs.map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── Roadmap timeline ── */}
        <section id="lo-trinh" className="mt-16 scroll-mt-32">
          <h2 className="font-display text-2xl font-bold text-slate-900">Lộ trình học</h2>
          <p className="mt-2 text-sm text-slate-500">
            Các mốc học theo trình tự. Nội dung slide chi tiết dành cho học viên đã ghi danh.
          </p>

          {program.milestones.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-400">
              Chương trình đang được hoàn thiện lộ trình.
            </div>
          ) : (
            <div className="relative mt-8">
              <span
                aria-hidden
                className="absolute left-[22px] top-6 bottom-6 w-px bg-slate-200"
              />
              <ol className="space-y-6">
                {program.milestones.map((milestone, index) => (
                  <li key={milestone.id} className="relative pl-16">
                    <span
                      className="absolute left-0 top-0 flex h-11 w-11 items-center justify-center rounded-2xl shadow-sm ring-4 ring-white"
                      style={{ backgroundColor: `${milestone.color}1A`, color: milestone.color }}
                    >
                      <i className={`fa-solid ${milestone.icon}`}></i>
                    </span>

                    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
                      <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-500">
                          Mốc {index + 1}
                        </div>
                        <h3 className="font-display mt-1 text-lg font-bold text-slate-900">{milestone.title}</h3>
                        {milestone.description && (
                          <p className="mt-1.5 text-sm leading-6 text-slate-500">{milestone.description}</p>
                        )}
                      </div>

                      <div className="grid gap-6 p-5 sm:px-6 md:grid-cols-2">
                        {/* Outcomes */}
                        <div>
                          <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
                            <i className="fa-solid fa-circle-check text-emerald-500"></i>
                            Sau mốc này, em sẽ làm được
                          </h4>
                          {milestone.outcomes.length > 0 ? (
                            <ul className="space-y-2.5">
                              {milestone.outcomes.map((outcome) => (
                                <li
                                  key={outcome.id}
                                  className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3"
                                >
                                  <div className="text-sm font-semibold text-slate-800">{outcome.title}</div>
                                  {outcome.description && (
                                    <div className="mt-1 text-xs leading-5 text-slate-500">{outcome.description}</div>
                                  )}
                                  {outcome.skills.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                      {outcome.skills.map((skill) => (
                                        <span
                                          key={skill}
                                          className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-100"
                                        >
                                          {skill}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="rounded-xl border border-dashed border-slate-200 p-3 text-xs text-slate-400">
                              Mục tiêu đầu ra đang được cập nhật.
                            </p>
                          )}
                        </div>

                        {/* Lessons (titles only, no link to slides) */}
                        <div>
                          <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
                            <i className="fa-solid fa-list-ul text-indigo-500"></i>
                            Nội dung học
                          </h4>
                          {milestone.lessons.length > 0 ? (
                            <ol className="space-y-1.5">
                              {milestone.lessons.map((lesson, lessonIndex) => {
                                const meta = difficultyMeta(lesson.difficulty);
                                return (
                                  <li
                                    key={lesson.id}
                                    className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2"
                                  >
                                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white text-[11px] font-bold text-slate-400 ring-1 ring-slate-200">
                                      {lessonIndex + 1}
                                    </span>
                                    <span className="min-w-0 flex-1 truncate text-sm text-slate-700">
                                      {lesson.title}
                                    </span>
                                    <span
                                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.className}`}
                                    >
                                      {meta.label}
                                    </span>
                                    <span className="hidden shrink-0 text-[11px] text-slate-400 sm:inline">
                                      {lesson.duration}′
                                    </span>
                                  </li>
                                );
                              })}
                            </ol>
                          ) : (
                            <p className="rounded-xl border border-dashed border-slate-200 p-3 text-xs text-slate-400">
                              Bài học đang được bổ sung.
                            </p>
                          )}
                        </div>
                      </div>
                    </article>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </section>

        {/* ── Skills ── */}
        {program.skills.length > 0 && (
          <section id="ky-nang" className="mt-16 scroll-mt-32">
            <h2 className="font-display text-2xl font-bold text-slate-900">Kỹ năng đạt được</h2>
            <p className="mt-2 text-sm text-slate-500">
              Những năng lực học viên xây dựng được khi hoàn thành chương trình.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {program.skills.map((skill) => (
                <div key={skill.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                      <i className="fa-solid fa-bolt text-sm"></i>
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900">{skill.title}</div>
                      {skill.description && (
                        <div className="mt-1 text-sm leading-6 text-slate-500">{skill.description}</div>
                      )}
                    </div>
                  </div>
                  {skill.children.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                      {skill.children.map((child) => (
                        <span
                          key={child.id}
                          className="rounded-full bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200"
                        >
                          {child.title}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── CTA (light) ── */}
        <section className="mt-16 overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-8 text-center sm:p-12">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-sm">
            <i className="fa-solid fa-graduation-cap"></i>
          </div>
          <h2 className="font-display text-2xl font-bold text-slate-900">Quan tâm đến chương trình này?</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
            Tạo tài khoản để bắt đầu, hoặc liên hệ giáo viên để được tư vấn và xếp lớp phù hợp với con.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link href="/register" className="btn btn-primary px-6 py-2.5 text-sm">
              <i className="fa-solid fa-rocket"></i>
              Đăng ký học
            </Link>
            <Link href="/login" className="btn btn-secondary px-6 py-2.5 text-sm">
              Đăng nhập
            </Link>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-100 bg-slate-50">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
              <i className="fa-solid fa-graduation-cap text-[10px] text-white"></i>
            </div>
            <span className="text-sm font-bold text-slate-900">Python LMS</span>
          </Link>
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} Python LMS · Nền tảng học Python có lộ trình.
          </p>
          <Link href="/giao-trinh" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
            Tất cả giáo trình →
          </Link>
        </div>
      </footer>
    </div>
  );
}
