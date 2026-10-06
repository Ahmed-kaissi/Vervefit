import { motion } from "framer-motion";import { ArrowRight, Check, Dumbbell, Flame, LineChart, ListChecks, Salad, Sparkles, Timer, } from "lucide-react";
import React from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { guestStore } from "@/lib/guest-store";
import { setGuestMigrationFlag } from "@/hooks/use-guest-migration";
import { EXERCISES, PROGRAMS } from "@/lib/training-plans";

/** Hero headline, kept short for the small screens the mockups target. */
const HEADLINES = [
  "Train better.",
  "Eat cleaner.",
  "Stay consistent.",
];

const FEATURES = [
  {
    icon: <Dumbbell className="size-5" aria-hidden="true" />,
    title: "Training with a guide",
    body: "Follow a program session by session, with form demonstrations and an exercise swap for anything you can't do today.",
  },
  {
    icon: <Salad className="size-5" aria-hidden="true" />,
    title: "Know what to eat",
    body: "Log food in seconds, watch calories and macros fill up live, and see exactly how much protein is left.",
  },
  {
    icon: <Sparkles className="size-5" aria-hidden="true" />,
    title: "A coach in your pocket",
    body: "Ask about your calories, your streak or what to do next. Lookups are answered from your own log, instantly.",
  },
  {
    icon: <LineChart className="size-5" aria-hidden="true" />,
    title: "See it working",
    body: "Weight trend, calorie history and weekly training minutes in charts that are actually readable.",
  },
  {
    icon: <ListChecks className="size-5" aria-hidden="true" />,
    title: "Small daily wins",
    body: "Habits, water and a streak that keeps counting — built to survive a busy day, not punish one.",
  },
  {
    icon: <Flame className="size-5" aria-hidden="true" />,
    title: "Built for momentum",
    body: "Short on time? A 12-minute session counts just as much as a 60-minute one.",
  },
];

const WEEK_HIGHLIGHTS = [
  "Log meals in seconds and watch calories and macros fill up live.",
  "Follow a full session set by set, with form demos and exercise swaps.",
  "Build streaks on habits and water, then watch them in your progress charts.",
  "Light and dark, phone and desktop, all equally at home.",
];

const STATS = [
  { value: String(EXERCISES.length), label: "exercises with cues" },
  { value: String(PROGRAMS.length), label: "training programs" },
  { value: "0", label: "spreadsheets needed" },
];

const PROMISES = [
  {
    title: "Nothing is locked behind sign-up",
    body: "Try the whole app as a guest, then bring your meals, habits, water and workouts with you when you create an account.",
  },
  {
    title: "Your data stays yours",
    body: "Every record is scoped to your account. Nothing is shared, and nothing is written on your behalf.",
  },
  {
    title: "Editable by design",
    body: "Every target, program and habit is yours to change. The app suggests; you decide.",
  },
  {
    title: "Honest numbers",
    body: "Calculations come from your own log, and estimates are labelled as estimates.",
  },
];

function BrandMark() {
  return (
    <span
      className="flex size-9 items-center justify-center rounded-xl bg-gradient-fresh text-[#0B0B0B] shadow-glow"
      aria-hidden="true"
    >
      <Flame className="size-5" />
    </span>
  );
}

export default function Landing() {
  const navigate = useNavigate();

  const toSignUp = () => navigate("/auth?returnTo=/dashboard", { replace: true });

  const handleGuest = () => {
    // Dev verification hook: proves the handler reached this point.
    if (typeof window !== "undefined") {
      const dev = ((window as unknown as { __vervefitDev?: Record<string, string> } ).__vervefitDev ??= {});
      dev.lastGuestClick = new Date().toISOString();
      dev.lastGuestAction = "markGuestSession";
      const g = document.createElement("div");
      g.id = "vervefit-dev-guest";
      g.style.cssText = "position:fixed;right:8px;top:8px;z-index:99999;background:#000;color:#0f0;font:12px monospace;padding:4px 8px;border-radius:6px;pointer-events:none";
      g.textContent = `guest:${dev.lastGuestClick}`;
      const old = document.getElementById("vervefit-dev-guest");
      if (old) old.replaceWith(g); else document.body.appendChild(g);
    }
    guestStore.markGuestSession();
    setGuestMigrationFlag();
    navigate("/dashboard", { replace: true });
  };

  const handleGuestTraining = () => {
    guestStore.markGuestSession();
    setGuestMigrationFlag();
    navigate("/train", { replace: true });
  };

  return (
    <div className="min-h-dvh bg-[#0B0B0B] text-[#E8E8E8] selection:bg-[#CEFF00]/30">
      {/* ---------- Navigation ---------- */}
      <header className="sticky top-0 z-50 flex h-[calc(4rem+env(safe-area-inset-top))] items-center justify-between border-b border-[#2A2A2E] bg-[#0B0B0B]/80 px-4 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <BrandMark />
          <span className="text-lg font-extrabold tracking-tight text-[#E8E8E8]">
            VerveFit
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className="hidden rounded-full px-3 py-1.5 text-sm font-medium text-[#9A9A9A] transition-colors hover:bg-[#2A2A2E] hover:text-[#E8E8E8] sm:block"
            onClick={() => navigate("/info/features", { replace: true })}
          >
            Features
          </button>
          <button
            type="button"
            className="hidden rounded-full px-3 py-1.5 text-sm font-medium text-[#9A9A9A] transition-colors hover:bg-[#2A2A2E] hover:text-[#E8E8E8] sm:block"
            onClick={() => navigate("/info/how-it-works", { replace: true })}
          >
            How it works
          </button>
          <Button
            variant="ghost"
            className="rounded-full text-[#9A9A9A] hover:bg-[#2A2A2E] hover:text-[#E8E8E8]"
            onClick={toSignUp}
          >
            Sign in
          </Button>
          <Button
            size="lg"
            className="rounded-full bg-[#CEFF00] text-[#0B0B0B] shadow-glow"
            onClick={toSignUp}
          >
            Start free
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </header>

      {/* ---------- Hero ---------- */}
      <section className="relative overflow-hidden px-4 pb-20 pt-16 md:pt-24">
        <div className="absolute inset-0 bg-[#0B0B0B]" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0B0B0B] via-[#0B0B0B]/60 to-[#0B0B0B]" />
        <div
          className="absolute -top-16 right-0 size-72 rounded-full bg-[#00C853]/10 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="absolute bottom-0 left-1/4 size-64 rounded-full bg-[#CEFF00]/5 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative mx-auto max-w-5xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-[#2A2A2E] bg-[#141414] px-4 py-1.5 text-sm font-semibold text-[#CEFF00]"
          >
            <span className="size-1.5 rounded-full bg-[#CEFF00]" aria-hidden="true" />
            Nutrition + training, finally in one place
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.06 }}
            className="mt-6 text-5xl font-extrabold leading-[1.05] tracking-tight text-[#E8E8E8] sm:text-6xl md:text-7xl"
          >
            {HEADLINES.map((line, i) => (
              <React.Fragment key={line}>
                {i > 0 && <span className="block">{line}</span>}
              </React.Fragment>
            ))}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.14 }}
            className="mx-auto mt-6 max-w-2xl text-lg text-[#9A9A9A]"
          >
            VerveFit answers the four questions that actually matter every day:
            what should I eat, what should I do, how am I doing, and what&apos;s
            next?
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.22 }}
            className="mt-9 flex flex-wrap justify-center gap-3"
          >
            <Button
              size="xl"
              className="rounded-full bg-[#CEFF00] text-[#0B0B0B] shadow-glow"
              onClick={toSignUp}
            >
              Build my plan
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
            <Button
              size="xl"
              variant="outline"
              className="border-[#2A2A2E] bg-[#141414] text-[#E8E8E8] hover:bg-[#2A2A2E]"
              onClick={handleGuestTraining}
            >
              <Dumbbell className="size-4" aria-hidden="true" />
              Browse exercises
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-7 flex flex-wrap items-center justify-center gap-2"
          >            {STATS.map((stat) => (
              <div
                key={stat.label}
                className="rounded-full bg-[#141414] px-4 py-1.5 text-xs text-[#9A9A9A]"
              >
                <span className="font-bold text-[#E8E8E8]">{stat.value}</span> {" "}
                {stat.label}
              </div>
            ))}
          </motion.div>
        </div>

        {/* A labelled illustration of the dashboard, not a claimed user's data. */}
        <p className="mx-auto mt-16 max-w-xl text-center text-xs font-medium text-[#9A9A9A]">
          This is what a logged day looks like in VerveFit. Your own numbers
          replace these the moment you start logging.
        </p>
        <div className="relative mx-auto mt-4 grid max-w-4xl gap-3 sm:grid-cols-3">
          {[
            { label: "Today's calories", value: "1,740", sub: "480 kcal left" },
            { label: "Water", value: "1.5 L", sub: "of 2.0 L target" },
            { label: "Daily streak", value: "14 days", sub: "3 habits done" },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-[#2A2A2E] bg-[#141414] p-5 text-center shadow-card"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-[#9A9A9A]">
                {card.label}
              </p>
              <p className="mt-1 text-3xl font-extrabold tracking-tight text-[#E8E8E8]">
                {card.value}
              </p>
              <p className="text-xs text-[#9A9A9A]">{card.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Features ---------- */}
      <section className="px-4 pb-20">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-[#E8E8E8]">
              Everything you need for the day ahead
            </h2>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature, i) => (
              <motion.article
                key={feature.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.4, delay: (i % 3) * 0.06 }}
                className="rounded-2xl border border-[#2A2A2E] bg-[#141414] p-5 shadow-card transition-shadow hover:shadow-card"
              >
                <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-[#CEFF00]/10 text-[#CEFF00]">
                  {feature.icon}
                </div>
                <h3 className="text-base font-bold text-[#E8E8E8]">
                  {feature.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[#9A9A9A]">
                  {feature.body}
                </p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Built for real weeks ---------- */}
      <section className="px-4 pb-20">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl border border-[#2A2A2E] bg-[#141414] shadow-card">
          <div className="grid lg:grid-cols-2">
            <div className="p-8 sm:p-10">
              <h2 className="text-3xl font-extrabold tracking-tight text-[#E8E8E8]">
                Built for real weeks
              </h2>
              <p className="mt-2 font-semibold text-[#CEFF00]">
                Momentum beats motivation. VerveFit makes momentum easy.
              </p>
              <ul className="mt-6 space-y-3">
                {WEEK_HIGHLIGHTS.map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#CEFF00]/10 text-[#CEFF00]">
                      <Check className="size-3" aria-hidden="true" />
                    </span>
                    <span className="text-sm text-[#9A9A9A]">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Phone mockup — the flat, dark view from the reference images. */}
            <div className="relative flex items-center justify-center bg-[#141414] p-8">
              <div className="w-[280px] rounded-[2.2rem] border border-[#2A2A2E] bg-[#141414] p-4 shadow-card">
                <div className="mb-3 flex items-center gap-2.5">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-fresh text-[#0B0B0B]">
                    <Flame className="size-4" aria-hidden="true" />
                  </span>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-[#E8E8E8]">Today</p>
                    <p className="text-[11px] text-[#9A9A9A]">480 kcal left</p>
                  </div>
                  <span className="text-lg" aria-hidden="true">
                    🌙
                  </span>
                </div>

                <div className="mb-3 rounded-xl bg-gradient-to-br from-[#CEFF00] to-[#00C853] p-4 text-center text-[#0B0B0B] shadow-glow">
                  <p className="text-[11px] font-medium text-[#0B0B0B]/70">
                    Calories left
                  </p>
                  <p className="text-2xl font-extrabold text-[#0B0B0B]">480</p>
                </div>

                <div className="mb-3 space-y-2">
                  {[
                    ["💪", "Protein", "112g / 150g"],
                    ["🌾", "Carbs", "168g / 220g"],
                    ["🧴", "Fat", "44g / 65g"],
                  ].map(([icon, label, value]) => (
                    <div key={label}>
                      <div className="mb-1 flex items-center justify-between text-[11px]">
                        <span className="font-medium text-[#9A9A9A]">
                          <span className="mr-1" aria-hidden="true">
                            {icon}
                          </span>
                          {label}
                        </span>
                        <span className="text-[#9A9A9A]">{value}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-[#2A2A2E]">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: "72%",
                            backgroundColor: "#CEFF00",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-1.5 border-t border-[#2A2A2E] pt-3">
                  {[
                    ["🥗", "Lunch", "520 kcal"],
                    ["🍎", "Snack", "120 kcal"],
                    ["💧", "Water", "1.5 L"],
                  ].map(([icon, label, value]) => (
                    <div
                      key={label}
                      className="flex items-center gap-2 rounded-lg bg-[#1A1A1C] px-2.5 py-2"
                    >
                      <span aria-hidden="true">{icon}</span>
                      <span className="text-xs text-[#9A9A9A]">{label}</span>
                      <span className="ml-auto text-xs font-bold text-[#E8E8E8]">
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- What you get ---------- */}
      <section className="px-4 pb-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-extrabold tracking-tight text-[#E8E8E8]">
            Built to be trusted with your training
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-sm text-[#9A9A9A]">
            No invented users, no invented results — just what the app does with
            the numbers you log.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PROMISES.map((promise, i) => (
              <motion.div
                key={promise.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.4, delay: (i % 4) * 0.06 }}
                className="flex flex-col rounded-2xl border border-[#2A2A2E] bg-[#141414] p-5 shadow-card"
              >
                <span className="flex size-9 items-center justify-center rounded-xl bg-[#CEFF00]/10 text-[#CEFF00]">
                  <Check className="size-4" aria-hidden="true" />
                </span>
                <h3 className="mt-3 text-sm font-bold text-[#E8E8E8]">
                  {promise.title}
                </h3>
                <p className="mt-1 flex-1 text-xs leading-relaxed text-[#9A9A9A]">
                  {promise.body}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section className="px-4 pb-20">
        <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl bg-gradient-fresh px-8 py-12 text-center shadow-lift sm:px-12">
          <div
            className="absolute inset-0 opacity-15"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 50%, white 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
            aria-hidden="true"
          />
          <h2 className="text-3xl font-extrabold tracking-tight text-[#0B0B0B] sm:text-4xl">
            Your best week starts with one meal
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-[#0B0B0B]/85">
            Answer a few quick questions and VerveFit builds your calorie
            targets, meal plan and training week around you.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button
              size="xl"
              className="rounded-full bg-[#0B0B0B] text-[#CEFF00] hover:bg-[#1A1A1C]"
              onClick={toSignUp}
            >
              Create my plan — it&apos;s free
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
            <Button
              size="xl"
              variant="outline"
              className="border-[#0B0B0B] text-[#0B0B0B] hover:bg-[#0B0B0B]/10"
              onClick={handleGuest}
            >
              <Timer className="size-4" aria-hidden="true" />
              Try it as a guest
            </Button>
          </div>
        </div>
      </section>

      {/* ---------- Footer ---------- */}
      <footer className="border-t border-[#2A2A2E] px-4 py-8 pb-[calc(2rem+env(safe-area-inset-bottom))] text-center text-xs text-[#9A9A9A]">
        <p className="font-semibold text-[#E8E8E8]">VerveFit</p>
        <p className="mt-1">
          Nutrition and training, finally in one place. Privacy first — your
          data stays on your device until you sign up.
        </p>
      </footer>
    </div>
  );
}
