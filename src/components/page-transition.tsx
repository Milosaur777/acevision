"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Trigger fade-in on route change
    el.classList.remove("animate-fade-in");
    void el.offsetWidth; // Force reflow
    el.classList.add("animate-fade-in");
  }, [pathname]);

  return (
    <div ref={ref} className="animate-fade-in">
      {children}
    </div>
  );
}
