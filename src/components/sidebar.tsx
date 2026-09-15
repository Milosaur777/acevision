"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, BarChart3, Settings, Upload, Search } from "lucide-react";
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

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 flex-col bg-sidebar border-r border-sidebar-border z-40">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-sidebar-border">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-sm font-bold text-primary-foreground">AV</span>
            </div>
            <span className="font-bold text-lg text-sidebar-foreground">AceVision</span>
          </Link>
        </div>

        {/* Search */}
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-sidebar-accent text-muted-foreground text-sm">
            <Search className="h-4 w-4" />
            <span>Search...</span>
            <kbd className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-background/50 border border-sidebar-border">⌘K</kbd>
          </div>
        </div>

        {/* Nav sections */}
        <nav className="flex-1 px-3 py-2 space-y-5 overflow-y-auto">
          {navSections.map((section) => (
            <div key={section.label}>
              <p className="px-3 mb-2 text-[11px] font-semibold tracking-wider text-muted-foreground/60">
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
                          ? "bg-primary text-primary-foreground shadow-[0_0_20px_rgba(163,230,53,0.15)]"
                          : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent"
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
        <div className="px-4 py-4 border-t border-sidebar-border">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
              T
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">Tennis Fan</p>
              <p className="text-[10px] text-muted-foreground truncate">acevision.app</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-sidebar/95 backdrop-blur-md border-t border-sidebar-border">
        <div className="flex items-center justify-around py-2">
          {navSections.flatMap((s) => s.items).map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors min-w-[56px]",
                  active ? "text-primary" : "text-muted-foreground"
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
