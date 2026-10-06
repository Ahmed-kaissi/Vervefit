import { NavLink } from "react-router";
import {
  Activity,
  Dumbbell,
  Home,
  LineChart,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Tab {
  to: string;
  label: string;
  icon: LucideIcon;
}

const TABS: Tab[] = [
  { to: "/dashboard", label: "Today", icon: Home },
  { to: "/progress", label: "Progress", icon: LineChart },
  { to: "/train", label: "Train", icon: Dumbbell },
  { to: "/habits", label: "Habits", icon: Activity },
  { to: "/coach", label: "Coach", icon: Sparkles },
];

/**
 * Mobile-first bottom tab bar. Fixed to the viewport so the primary
 * destinations stay one thumb-tap away on any screen.
 */
export function BottomNav() {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl supports-[backdrop-filter]:bg-background/75"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around px-2">
        {TABS.map((tab) => (
          <li key={tab.to} className="flex-1">
            <NavLink
              to={tab.to}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-1 rounded-xl px-1 py-2.5 text-[10px] font-semibold transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      "flex size-8 items-center justify-center rounded-xl transition-colors",
                      isActive && "bg-primary/10",
                    )}
                  >
                    <tab.icon className="size-[18px]" aria-hidden="true" />
                  </span>
                  {tab.label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
