"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, Home, LineChart, MessageCircle, Settings } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { UserAvatar } from "@/components/UserAvatar";
import { MainCanvas } from "@/components/scene/MainCanvas";
import { pageBackdropForPath } from "@/lib/pageBackdrop";
import { cn } from "@/lib/utils";

const links = [
  { href: "/home", label: "Dashboard", icon: Home },
  { href: "/plan", label: "Plan", icon: Calendar },
  { href: "/training", label: "Analytics", icon: LineChart },
  { href: "/coach", label: "Coach", icon: MessageCircle },
  { href: "/settings", label: "Settings", icon: Settings },
];

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-8 h-8 rounded-lg bg-[var(--signal)] text-white flex items-center justify-center headline text-base shrink-0">
        Z2
      </span>
      {!compact && (
        <span className="headline text-[26px] leading-none">
          zone<span className="serif-accent font-normal text-[var(--signal)] ml-0.5">two</span>
        </span>
      )}
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const avatarLabel = user?.display_name || user?.email || "?";
  const isCoach = pathname === "/coach";
  const isActivityDetail = pathname.startsWith("/activities/");
  const backdrop = pageBackdropForPath(pathname);
  const isActive = (href: string) => pathname === href || (href === "/home" && isActivityDetail);

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-[var(--bg-base)]">
      {/* Sidebar: icon rail on tablets, full on laptops+ */}
      <aside className="hidden md:flex w-[72px] lg:w-[220px] shrink-0 flex-col bg-[var(--ink)] text-white z-20 transition-[width]">
        <div className="px-5 pt-6 pb-8 flex justify-center lg:justify-start">
          <span className="lg:hidden">
            <Logo compact />
          </span>
          <span className="hidden lg:block">
            <Logo />
          </span>
        </div>

        <nav className="flex-1 px-3 space-y-0.5">
          {links.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                title={label}
                className={cn(
                  "relative flex items-center justify-center lg:justify-start gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  active ? "bg-white/10 text-white" : "text-white/55 hover:text-white hover:bg-white/5"
                )}
              >
                {active && (
                  <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-[var(--signal)]" />
                )}
                <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={active ? 2.25 : 1.9} />
                <span className="hidden lg:inline">{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/10">
          <Link
            href="/settings"
            title="Profile"
            className="flex items-center justify-center lg:justify-start gap-2.5 px-1 lg:px-2 py-2 rounded-lg hover:bg-white/5 transition-colors"
          >
            <UserAvatar photoUrl={user?.profile_photo_url} label={avatarLabel} />
            <div className="min-w-0 hidden lg:block">
              <p className="text-xs font-semibold truncate">{user?.display_name || user?.email}</p>
              <p className="text-[10px] text-white/50">
                {user?.strava_connected ? "Strava connected" : "Connect Strava"}
              </p>
            </div>
          </Link>
          <button
            onClick={logout}
            className="mt-1 w-full text-center lg:text-left px-1 lg:px-3 py-2 text-xs text-white/50 hover:text-white"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        {/* Mobile top bar */}
        <header className="md:hidden shrink-0 flex items-center justify-between px-4 h-14 bg-[var(--ink)] text-white">
          <Logo />
          <Link href="/settings" aria-label="Profile">
            <UserAvatar photoUrl={user?.profile_photo_url} label={avatarLabel} />
          </Link>
        </header>

        <main
          className={cn(
            "flex-1 flex flex-col min-h-0 min-w-0",
            isCoach ? "overflow-hidden pb-16 md:pb-0" : "overflow-y-auto pb-16 md:pb-0"
          )}
        >
          <MainCanvas
            variant={backdrop.variant}
            imageUrl={backdrop.imageUrl}
            ambientImageUrl={backdrop.ambientImageUrl}
            className={isCoach ? "min-h-0 h-full" : undefined}
          >
            {children}
          </MainCanvas>
        </main>
      </div>

      {/* Mobile bottom tabs */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 flex bg-[var(--ink)] px-1 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
        {links.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex-1 flex flex-col items-center py-2 text-[10px] font-semibold",
                active ? "text-[var(--signal)]" : "text-white/55"
              )}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
