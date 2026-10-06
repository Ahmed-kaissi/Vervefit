import { motion } from "framer-motion";
import { ArrowRight, Flame, CheckCircle, Clock, Utensils, Moon, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { guestStore } from "@/lib/guest-store";
import { setGuestMigrationFlag } from "@/hooks/use-guest-migration";

const FEATURES = [
  {
    icon: <Utensils className="size-5" />,
    title: "Calorie counting",
    desc: "Log every meal and see exactly where your daily calories land, with a clean ring and numbers you can read at a glance.",
  },
  {
    icon: <TrendingUp className="size-5" />,
    title: "Macro targets",
    desc: "Set protein, carbs, and fat goals that fit how you actually eat. Track each one with its own progress bar.",
  },
  {
    icon: <Clock className="size-5" />,
    title: "Quick logging",
    desc: "Open the sheet from your phone, pick a food, choose a quantity, and you are done. No categories to wade through.",
  },
  {
    icon: <Moon className="size-5" />,
    title: "Dark & light mode",
    desc: "The app follows your preference. Light for daytime clarity, dark for late-night logging.",
  },
  {
    icon: <CheckCircle className="size-5" />,
    title: "Guest mode",
    desc: "No account required to start. Your meals stay in your browser until you decide to sign up.",
  },
  {
    icon: <Flame className="size-5" />,
    title: "Built for one thing",
    desc: "Know what you eat. Reach your goals. VerveFit keeps the experience focused instead of turning into a dashboard of everything.",
  },
];

export default function FeaturesInfo() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0B0B0B] text-[#E8E8E8] selection:bg-[#CEFF00]/30">
      {/* Header */}
      <header className="sticky top-0 z-50 flex h-[calc(4rem+env(safe-area-inset-top))] items-center justify-between border-b border-[#2A2A2E] bg-[#0B0B0B]/80 px-4 pt-[env(safe-area-inset-top)] backdrop-blur-md">
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
            Features
          </p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl text-[#E8E8E8]">
            Everything you need, nothing you don&apos;t
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-[#9A9A9A]/80">
            VerveFit is a calorie and meal tracker built around a simple idea:
            if tracking is easy, you will keep doing it.
          </p>
        </motion.div>
      </section>

      {/* Feature grid */}
      <section className="mt-12 px-4 pb-24">
        <div className="mx-auto grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.08 * i }}
              className="rounded-2xl border border-[#2A2A2E] bg-[#141414] p-5 shadow-card transition-shadow hover:shadow-card"
            >
              <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-[#CEFF00]/10 text-[#CEFF00]">
                {f.icon}
              </div>
              <h3 className="font-semibold text-[#E8E8E8]">{f.title}</h3>
              <p className="mt-1 text-sm text-[#9A9A9A]/80">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How to start */}
      <section className="px-4 pb-20">
        <div className="mx-auto max-w-3xl rounded-3xl bg-gradient-fresh px-8 py-12 text-center text-[#0B0B0B] shadow-lift sm:px-12">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-[#0B0B0B]">
            Ready to see what&apos;s on your plate?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-[#0B0B0B]/85">
            You do not need to commit to anything to start. Try the app as a
            guest and decide when — or if — you want to make an account.
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
                // Both flags first: otherwise the guard bounces to /auth and
                // the visitor's log never gets migrated.
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
