"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Home, Users, BarChart3, Settings, Upload, Search, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

const navSections = [
  {
    label: "DASHBOARDS",
    items: [
      { href: "/", label: "Overview", icon: Home },
      { href: "/players", label: "Players", icon: Users },
      { href: "/analysis", label: "Analysis", icon: BarChart3 },
    ],
  },
  {
    label: "MANAGEMENT",
    items: [
      { href: "/admin", label: "Admin", icon: Settings },
      { href: "/import", label: "Import Data", icon: Upload },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/players?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-[260px] flex-col glass-sidebar z-40">
        {/* Logo */}
        <div className="px-5 py-5 flex items-center gap-3">
          <img src="/logo.avif" alt="AV" className="w-16 h-16 rounded-xl object-contain shrink-0" />
          <div>
            <span className="font-bold text-[15px] text-foreground tracking-tight">AceVision</span>
            <p className="text-[10px] text-muted-foreground tracking-widest uppercase">AI Tennis Intelligence</p>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 py-2">
          <form onSubmit={handleSearch} className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.04] text-muted-foreground text-sm transition-colors focus-within:border-primary/20 focus-within:bg-white/[0.05]">
            <Search className="h-4 w-4 shrink-0" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent outline-none flex-1 text-sm placeholder:text-muted-foreground/60"
            />
            <kbd className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-muted-foreground/50 font-mono">⌘K</kbd>
          </form>
        </div>

        {/* Nav sections */}
        <nav className="flex-1 px-3 py-3 space-y-5 overflow-y-auto">
          {navSections.map((section) => (
            <div key={section.label}>
              <p className="px-3 mb-2 text-[10px] font-semibold tracking-[0.15em] text-muted-foreground/40 uppercase">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                        active
                          ? "nav-active"
                          : "text-muted-foreground hover:text-foreground hover:bg-white/[0.03]"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-white/[0.04]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/15 flex items-center justify-center text-xs font-bold text-primary">
              T
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate text-foreground">Tennis Fan</p>
              <p className="text-[10px] text-muted-foreground/60 truncate">acevision.app</p>
            </div>
            <button className="p-1.5 rounded-lg hover:bg-white/[0.04] text-muted-foreground/40 hover:text-muted-foreground transition-colors">
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.04]" style={{ background: "rgba(5, 8, 5, 0.92)", backdropFilter: "blur(40px) saturate(1.4)", WebkitBackdropFilter: "blur(40px) saturate(1.4)" }}>
        <div className="flex items-center justify-around py-2 px-2">
          {navSections.flatMap((s) => s.items).map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-[10px] font-medium transition-all min-w-[52px]",
                  active ? "text-primary bg-primary/10" : "text-muted-foreground/50"
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
