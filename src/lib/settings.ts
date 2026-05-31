import prisma from "@/lib/prisma";

export interface RecruitmentInfo {
  /** Short pitch shown to guests / not-yet-enrolled students on preview content. */
  message: string;
  /** Label of the contact button. */
  ctaLabel: string;
  /** Where the contact button points — e.g. https://zalo.me/…, https://m.me/…, tel:…, mailto:…. Empty = no button. */
  ctaUrl: string;
}

const RECRUITMENT_DEFAULTS: RecruitmentInfo = {
  message:
    "Đây là bài đọc thử miễn phí. Muốn học đầy đủ lộ trình và được chấm bài, hãy liên hệ với giáo viên để được thêm vào lớp học.",
  ctaLabel: "Liên hệ để học",
  ctaUrl: "",
};

/**
 * Contact / recruitment info shown on public preview lessons and the guest library.
 * Configured by the admin in Settings; falls back to sensible defaults (and to the
 * support email) so the CTA always renders something useful. Never throws.
 */
export async function getRecruitmentInfo(): Promise<RecruitmentInfo> {
  try {
    const rows = await prisma.setting.findMany({
      where: {
        key: {
          in: ["recruitment_message", "recruitment_cta_label", "recruitment_cta_url", "contact_email"],
        },
      },
      select: { key: true, value: true },
    });
    const map = new Map(rows.map((row) => [row.key, row.value]));

    const message = map.get("recruitment_message")?.trim() || RECRUITMENT_DEFAULTS.message;
    const ctaLabel = map.get("recruitment_cta_label")?.trim() || RECRUITMENT_DEFAULTS.ctaLabel;

    let ctaUrl = map.get("recruitment_cta_url")?.trim() || "";
    if (!ctaUrl) {
      // Fall back to the support email so the button still works out of the box.
      const email = map.get("contact_email")?.trim();
      if (email) ctaUrl = `mailto:${email}`;
    }

    return { message, ctaLabel, ctaUrl };
  } catch {
    return { ...RECRUITMENT_DEFAULTS };
  }
}
