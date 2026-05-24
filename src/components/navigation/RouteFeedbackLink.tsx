"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type MouseEvent, type ReactNode } from "react";

export type RoutePrefetchMode = "viewport" | "intent" | false;

interface RouteFeedbackLinkProps {
  href: string;
  className: string;
  pendingClassName?: string;
  children: ReactNode;
  onClick?: () => void;
  spinnerClassName?: string;
  prefetch?: RoutePrefetchMode;
}

function isModifiedEvent(event: MouseEvent<HTMLAnchorElement>) {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
}

export default function RouteFeedbackLink({
  href,
  className,
  pendingClassName = "",
  children,
  onClick,
  spinnerClassName = "text-current/70",
  prefetch = "intent",
}: RouteFeedbackLinkProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, setIsPending] = useState(false);
  const isHashLink = href.startsWith("#");
  const shouldPrefetchOnIntent = prefetch !== false && !isHashLink;
  const shouldPrefetchInViewport = prefetch === "viewport" && !isHashLink;

  useEffect(() => {
    if (pathname === href) {
      setIsPending(false);
    }
  }, [href, pathname]);

  const prefetchRoute = () => {
    if (shouldPrefetchOnIntent) {
      router.prefetch(href);
    }
  };

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.();

    if (event.defaultPrevented || isHashLink || pathname === href || isModifiedEvent(event)) {
      return;
    }

    prefetchRoute();
    setIsPending(true);
  };

  return (
    <Link
      href={href}
      prefetch={shouldPrefetchInViewport}
      onClick={handleClick}
      onMouseEnter={prefetchRoute}
      onFocus={prefetchRoute}
      aria-busy={isPending}
      className={`${className} ${isPending ? pendingClassName : ""}`}
    >
      {children}
      {isPending ? (
        <span className={`inline-flex items-center ${spinnerClassName}`} aria-hidden="true">
          <i className="fa-solid fa-spinner fa-spin text-xs"></i>
        </span>
      ) : null}
    </Link>
  );
}
