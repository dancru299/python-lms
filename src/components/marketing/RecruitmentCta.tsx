import type { RecruitmentInfo } from "@/lib/settings";

/**
 * Contact-to-enroll call-to-action shown on public preview lessons and the guest library.
 * Uses a plain <a> because the link can be external or a mailto:/tel: scheme.
 */
export default function RecruitmentCta({
  info,
  title,
  className = "",
}: {
  info: RecruitmentInfo;
  title?: string;
  className?: string;
}) {
  const isHttp = /^https?:\/\//i.test(info.ctaUrl);

  return (
    <div
      className={`rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-6 text-center ${className}`}
    >
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
        <i className="fa-solid fa-graduation-cap text-lg"></i>
      </div>
      {title && <h3 className="text-lg font-bold text-slate-900">{title}</h3>}
      <p className="mx-auto mt-1.5 max-w-xl text-sm leading-6 text-slate-600">{info.message}</p>
      {info.ctaUrl && (
        <div className="mt-4">
          <a
            href={info.ctaUrl}
            target={isHttp ? "_blank" : undefined}
            rel={isHttp ? "noopener noreferrer" : undefined}
            className="btn btn-primary"
          >
            <i className="fa-solid fa-paper-plane"></i>
            {info.ctaLabel}
          </a>
        </div>
      )}
    </div>
  );
}
