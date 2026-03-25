"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type MouseEvent, type ReactNode } from "react";

interface RouteFeedbackLinkProps {
  href: string;
  className: string;
  pendingClassName?: string;
  children: ReactNode;
  onClick?: () => void;
  spinnerClassName?: string;
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
}: RouteFeedbackLinkProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, setIsPending] = useState(false);
  const isHashLink = href.startsWith("#");

  useEffect(() => {
    if (!isHashLink) {
      router.prefetch(href);
    }
  }, [href, isHashLink, router]);

  useEffect(() => {
    if (pathname === href) {
      setIsPending(false);
    }
  }, [href, pathname]);

  const prefetchRoute = () => {
    if (!isHashLink) {
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
      prefetch={!isHashLink}
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
