import { Download, Share, X } from "lucide-react";
import { useLocation } from "react-router";
import { Button } from "@/components/ui/button";
import { usePwaInstall, type InstallKind } from "@/hooks/use-pwa-install";
import { cn } from "@/lib/utils";

const TAB_BAR_PATHS = new Set([
  "/dashboard",
  "/progress",
  "/train",
  "/habits",
  "/coach",
]);

function bannerCopy(kind: Exclude<InstallKind, "hidden">) {
  switch (kind) {
    case "ios":
      return (
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
          Tap{" "}
          <Share className="inline size-3 align-[-2px]" aria-hidden="true" />{" "}
          Share, then <span className="font-semibold">Add to Home Screen</span>{" "}
          for a full-screen phone app.
        </p>
      );
    case "android":
      return (
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
          Add it to your home screen and open it like a native app.
        </p>
      );
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

/** Offers a home-screen install path on phones. */
export function InstallAppBanner() {
  const { kind, install, dismiss } = usePwaInstall();
  const { pathname } = useLocation();
  const aboveTabBar = TAB_BAR_PATHS.has(pathname);

  if (kind === "hidden") return null;

  return (
    <div
      className={cn(
        "fixed inset-x-0 z-50 px-3",
        aboveTabBar
          ? "bottom-[calc(4.5rem+env(safe-area-inset-bottom))]"
          : "bottom-[calc(0.75rem+env(safe-area-inset-bottom))]",
      )}
    >
      <div className="mx-auto flex max-w-md items-start gap-3 rounded-2xl border border-[#2A2A2E] bg-[#141414]/95 p-3 shadow-lift backdrop-blur-xl">
        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-fresh text-[#0B0B0B]">
          <Download className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#E8E8E8]">
            Install VerveFit
          </p>
          {bannerCopy(kind)}
          {kind === "android" ? (
            <Button size="sm" className="mt-2" onClick={() => void install()}>
              Add to home screen
            </Button>
          ) : null}
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="rounded-full p-1 text-[#9A9A9A] hover:bg-[#2A2A2E] hover:text-[#E8E8E8]"
          aria-label="Dismiss install prompt"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
