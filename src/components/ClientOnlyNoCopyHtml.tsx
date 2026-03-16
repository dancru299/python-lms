"use client";

import { useEffect, useState } from "react";
import NoCopyHtml from "@/components/NoCopyHtml";

interface Props {
  html: string;
}

export default function ClientOnlyNoCopyHtml({ html }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="min-h-[70vh]" suppressHydrationWarning />;
  }

  return <NoCopyHtml html={html} />;
}
