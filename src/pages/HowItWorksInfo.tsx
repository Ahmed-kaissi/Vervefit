import { motion } from "framer-motion";
import { ArrowRight, CheckCircle, Flame, Utensils } from "lucide-react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { guestStore } from "@/lib/guest-store";
import { setGuestMigrationFlag } from "@/hooks/use-guest-migration";

const STEPS = [
  {
    icon: <Utensils className="size-6" />,
    title: "Set your targets",
    desc: "Choose a daily calorie target and macro split that feel realistic for you. You can change it any time from your profile.",
  },
  {
    icon: <Utensils className="size-6" />,
    title: "Log your meals",
    desc: "Open the sheet from the dashboard, search your food database, pick a quantity, and you are done. Breakfast, lunch, dinner, and snacks all live in the same place.",
  },
  {
    icon: <Flame className="size-6" />,
    title: "See where you stand",
    desc: "The dashboard shows your calories for the day, your macro progress, and a quick look at the last 7 days so you can spot patterns without doing the math yourself.",
  },
  {
    icon: <CheckCircle className="size-6" />,
    title: "Start as a guest, join when you are ready",
    desc: "You can try everything first. If you sign up later, your guest meals come with you into your account.",
  },
];

export default function HowItWorksInfo() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0B0B0B] text-[#E8E8E8] selection:bg-[#CEFF00]/30">
      {/* Header */}
      <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-[#2A2A2E] bg-[#0B0B0B]/80 px-4 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-xl bg-gradient-fresh text-[#0B0B0B] shadow-glow">
            <Flame className="size-[18px]" aria-hidden="true" />
          </div>
          <span className="text-lg font-bold tracking-tight text-[#E8E8E8]">VerveFit</span>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            className="rounded-full px-4 py-2 text-sm font-semibold text-[#9A9A9A] transition-colors hover:bg-[#2A2A2E] hover:text-[#E8E8E8]"
            onClick={() => navigate("/")}
          >
            Home
          </button>
        </div>
      </header>

      {/* Intro */}
      <section className="mt-14 px-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-3xl text-center"
        >
          <p className="text-sm font-semibold uppercase tracking-widest text-[#CEFF00]">
            How it works
          </p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl text-[#E8E8E8]">
            Simple food tracking, step by step
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-[#9A9A9A]/80">
            No complicated setup. No endless categories to click through. Just
            set your targets, log your meals, and see how the day is going.
          </p>
        </motion.div>
      </section>

      {/* Steps */}
      <section className="mt-12 px-4 pb-24">
        <div className="mx-auto grid gap-6 sm:grid-cols-2">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.08 * i }}
              className="rounded-2xl border border-[#2A2A2E] bg-[#141414] p-5 shadow-card transition-shadow hover:shadow-card"
            >
              <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-[#CEFF00]/10 text-[#CEFF00]">
                {step.icon}
              </div>
              <h3 className="font-semibold text-[#E8E8E8]">{step.title}</h3>
              <p className="mt-1 text-sm text-[#9A9A9A]/80">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* What you get */}
      <section className="px-4 pb-24">
        <div className="mx-auto max-w-3xl rounded-2xl border border-[#2A2A2E] bg-[#141414] p-5 shadow-card">
          <h2 className="text-lg font-semibold text-[#E8E8E8]">What you will use every day</h2>
          <ul className="mt-4 space-y-3 text-sm text-[#9A9A9A]">
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#CEFF00]/10 text-[#CEFF00]">
                <CheckCircle className="size-3.5" />
              </span>
              A 7-day calorie chart that shows your last week at a glance.
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#CEFF00]/10 text-[#CEFF00]">
                <CheckCircle className="size-3.5" />
              </span>
              A calorie ring with macros underneath, so you can see one number and the
              breakdown in the same place.
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#CEFF00]/10 text-[#CEFF00]">
                <CheckCircle className="size-3.5" />
              </span>
              A food database you can search, with categories you can filter by.
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#CEFF00]/10 text-[#CEFF00]">
                <CheckCircle className="size-3.5" />
              </span>
              Custom foods when a packaged label or home recipe is not in the database.
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#CEFF00]/10 text-[#CEFF00]">
                <CheckCircle className="size-3.5" />
              </span>
              Your choice of light or dark mode, kept that way between sessions.
            </li>
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 pb-20">
        <div className="mx-auto max-w-3xl rounded-3xl bg-gradient-fresh px-8 py-12 text-center text-[#0B0B0B] shadow-lift sm:px-12">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-[#0B0B0B]">
            Ready to start tracking?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-[#0B0B0B]/85">
            The fastest way in is to try it as a guest. If you like it, sign up
            and your meals come with you.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button
              size="lg"
              className="rounded-full bg-[#0B0B0B] text-[#CEFF00] hover:bg-[#1A1A1C]"
              onClick={() => navigate("/auth?returnTo=/dashboard")}
            >
              <span aria-hidden="true">🚀</span> Start tracking free
              <ArrowRight className="size-4 ml-2" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="border-[#0B0B0B] text-[#0B0B0B] hover:bg-[#0B0B0B]/10"
              onClick={() => {
                guestStore.markGuestSession();
                setGuestMigrationFlag();
                navigate("/dashboard");
              }}
            >
              <span aria-hidden="true">🧁</span> Try as guest
            </Button>
          </div>
        </div>
      </section>

      <footer className="px-4 pb-8 text-center text-xs text-[#9A9A9A]">
        <p>VerveFit — calorie &amp; meal tracking.</p>
      </footer>
    </div>
  );
}
