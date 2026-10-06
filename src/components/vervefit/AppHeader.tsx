import { useSyncExternalStore } from "react";
import { CalendarDays, ChevronDown, Flame, Moon, Sun, UserPlus, LogOut } from "lucide-react";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useIsGuest } from "@/hooks/use-is-guest";
import { setGuestMigrationFlag } from "@/hooks/use-guest-migration";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router";

function ThemeToggleButton() {
  const { resolvedTheme, setTheme } = useTheme();
  // next-themes resolves the theme from the DOM, so we only trust it once the
  // client has mounted. useSyncExternalStore keeps this out of an effect.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}

export function AppHeader({ user }: { user: unknown }) {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const isGuest = useIsGuest();

  const name =
    typeof user === "object" && user !== null && "name" in user
      ? ((user as { name?: string }).name ?? null)
      : null;
  const email =
    typeof user === "object" && user !== null && "email" in user
      ? ((user as { email?: string }).email ?? null)
      : null;

  const initial = (name ?? email ?? "?").charAt(0).toUpperCase();
  const today = new Date();

  return (
    <header className="sticky top-0 z-40 flex h-[calc(4rem+env(safe-area-inset-top))] flex-shrink-0 items-center justify-between border-b border-border/60 bg-background/80 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="flex w-full max-w-lg items-center gap-2.5">
        <div className="flex size-9 items-center justify-center rounded-xl bg-brand-gradient text-primary-foreground shadow-glow">
          <Flame className="size-5" aria-hidden="true" />
        </div>
        <div className="flex flex-col">
          <h1 className="text-base font-semibold tracking-tight text-foreground">
            VerveFit
          </h1>
          <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            {today.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="hidden items-center gap-1.5 text-xs text-muted-foreground md:flex">
          <CalendarDays className="size-4" aria-hidden="true" />
          <time dateTime={today.toISOString()}>
            {today.toLocaleDateString(undefined, {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </time>
        </span>

        <div
          className={cn(
            "flex size-9 items-center justify-center rounded-full border-2 border-border/50",
            isGuest
              ? "border-accent/60 bg-accent/25 text-accent-foreground"
              : "border-primary/25 bg-primary/10 text-primary",
          )}
          aria-hidden="true"
        >
          <span className="text-xs font-semibold">{isGuest ? "👤" : initial}</span>
        </div>

        <div className="ml-1 flex items-center gap-1.5">
          <ThemeToggleButton />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full">
                <ChevronDown className="size-4 text-muted-foreground" />
                <span className="sr-only">Account menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-52" align="end" side="bottom">
              <div className="truncate rounded-lg px-2 py-1.5 text-xs text-muted-foreground">
                {isGuest ? "Guest session" : (email ?? "Signed in")}
              </div>

              {isGuest ? (
                <DropdownMenuItem
                  className="gap-2"
                  onClick={() => {
                    setGuestMigrationFlag();
                    navigate("/auth?returnTo=/dashboard");
                  }}
                >
                  <UserPlus className="size-4 text-accent-foreground/70" />
                  Create account
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  className="gap-2 text-red-600 focus:text-red-600"
                  onClick={() => {
                    void signOut();
                  }}
                >
                  <LogOut className="size-4" />
                  Sign out
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
