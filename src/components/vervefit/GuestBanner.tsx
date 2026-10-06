import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useNavigate } from "react-router";
import { setGuestMigrationFlag } from "@/hooks/use-guest-migration";
import { useState } from "react";

export function GuestBanner() {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className="pointer-events-none relative flex items-center justify-center gap-3 rounded-b-2xl border-b border-[#2A2A2E] bg-[#141414]/60 px-4 py-3 text-sm text-[#CEFF00] md:px-6 md:py-4">
      <div className="pointer-events-auto flex items-start gap-3">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#CEFF00]/20 text-[#CEFF00]">
          <span role="img" aria-label="Guest">🧁</span>
        </div>
        <div>
          <p className="font-medium leading-tight">
            You&apos;re using VerveFit as a guest — sign up free to save your
            progress permanently.
          </p>
          <p className="mt-0.5 text-xs text-[#CEFF00]/70">
            Everything you log stays in this browser until you create an account.
          </p>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="pointer-events-auto ml-3 h-8 rounded-full border-[#2A2A2E] bg-[#141414] text-[#CEFF00] hover:bg-[#2A2A2E]"
        onClick={() => {
          setGuestMigrationFlag();
          navigate("/auth?returnTo=/dashboard", { replace: true });
        }}
      >
        Create Account
      </Button>
      <button
        type="button"
        className="pointer-events-auto ml-1 rounded-full p-1 text-[#CEFF00]/60 hover:text-[#CEFF00]"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss banner"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
