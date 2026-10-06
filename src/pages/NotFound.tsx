import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Flame, Home } from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#0B0B0B] px-6 text-center text-[#E8E8E8]">
      <div className="flex flex-col items-center gap-3">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-gradient-fresh text-[#0B0B0B] shadow-glow">
          <Flame className="size-7" aria-hidden="true" />
        </span>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#CEFF00]">
          Error 404
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight text-[#E8E8E8]">
          This page took a rest day.
        </h1>
        <p className="max-w-sm text-sm text-[#9A9A9A]">
          The page you&apos;re looking for doesn&apos;t exist or has moved. Your
          logged meals are still right where you left them.
        </p>
      </div>

      <Button asChild size="lg" className="rounded-full bg-[#CEFF00] text-[#0B0B0B] shadow-glow">
        <Link to="/">
          <Home className="size-4" aria-hidden="true" />
          Back to home
        </Link>
      </Button>
    </main>
  );
}
