import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart as RechartsLineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format } from "date-fns";
import { Scale, TrendingDown, TrendingUp } from "lucide-react";
import { useWeightLog, useWorkouts } from "@/hooks/use-body";
import type { DateTotals } from "@/hooks/use-food-log";
import {
  compareIsoDates,
  isIsoDate,
  shortDate,
  startOfWeek,
} from "@/lib/nutrition";
import { cn } from "@/lib/utils";

const AXIS = {
  fontSize: 10,
  fill: "var(--muted-foreground)",
} as const;

function parseDay(k: string): Date | null {
  if (!k) return null;
  const d = new Date(`${k}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

const TICK = (dateKey: string) => {
  const d = parseDay(dateKey);
  return d ? format(d, "d MMM") : "";
};

/**
 * Body-weight trend with a 7-point moving average. The raw series is kept
 * visible but faint, because daily weight is noisy and the average is the
 * signal worth reading.
 */
export function WeightChart() {
  const { points, changeKg } = useWeightLog(30);

  const data = points.map((p) => ({ date: p.date, kg: p.kg, avg: null }));
  // Trailing 7-point mean, emitted in place so recharts can join the lines.
  const withAvg: { date: string; kg: number; avg: number | null }[] = [];
  for (let i = 0; i < data.length; i++) {
    const window = data.slice(Math.max(0, i - 6), i + 1);
    const mean = window.reduce((acc, d) => acc + d.kg, 0) / window.length;
    withAvg.push({ ...data[i], avg: Math.round(mean * 10) / 10 });
  }

  if (points.length === 0) {
    return (
      <EmptyState
        title="No weigh-ins yet"
        body="Log your weight to see the trend line build over time."
      />
    );
  }

  const trending = changeKg < 0;
  return (
    <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-card">
      <header className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Scale className="size-4" aria-hidden="true" />
          </span>
          Weight trend
        </h2>
        <span
          className={cn(
            "flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold",
            trending
              ? "bg-primary/12 text-primary"
              : changeKg > 0
                ? "bg-accent/20 text-accent-foreground"
                : "bg-muted text-muted-foreground",
          )}
        >
          {trending ? (
            <TrendingDown className="size-3" aria-hidden="true" />
          ) : (
            <TrendingUp className="size-3" aria-hidden="true" />
          )}
          {changeKg > 0 ? "+" : ""}
          {changeKg} kg
        </span>
      </header>

      <ResponsiveContainer width="100%" height={170}>
        <RechartsLineChart
          data={withAvg}
          margin={{ top: 6, right: 8, left: -18, bottom: 0 }}
        >
          <CartesianGrid
            vertical={false}
            stroke="var(--border)"
            strokeDasharray="3 3"
          />
          <XAxis
            dataKey="date"
            tickFormatter={TICK}
            tick={AXIS}
            tickLine={false}
            axisLine={false}
            minTickGap={28}
          />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} width={44} />
          <Tooltip
            cursor={{ stroke: "var(--border)" }}
            content={({ active, payload }) => {
              const point = payload?.[0]?.payload as
                | { date: string; kg: number; avg: number | null }
                | undefined;
              if (!active || !point) return null;
              return (
                <div className="rounded-xl border border-border/60 bg-popover px-3 py-2 shadow-lg">
                  <p className="text-xs font-semibold text-foreground">
                    {shortDate(point.date)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {point.kg} kg
                    {point.avg !== null && ` · avg ${point.avg} kg`}
                  </p>
                </div>
              );
            }}
          />
          <Line
            type="monotone"
            dataKey="kg"
            stroke="var(--muted-foreground)"
            strokeWidth={1.5}
            strokeDasharray="3 3"
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="avg"
            stroke="var(--primary)"
            strokeWidth={2.5}
            dot={false}
            isAnimationActive={false}
          />
        </RechartsLineChart>
      </ResponsiveContainer>
    </section>
  );
}

/** Calories logged per day against the user's target line. */
export function CalorieHistory({
  weekTotals,
  targets,
}: {
  weekTotals: Record<string, DateTotals>;
  targets: { dailyCalorieTarget: number };
}) {
  const data = Object.entries(weekTotals)
    .filter(([date]) => parseDay(date) !== null)
    .map(([date, t]) => ({ date, kcal: t.calories }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const hasData = data.some((d) => d.kcal > 0);

  return (
    <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-card">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">
          Calorie history
        </h2>
        <span className="text-xs text-muted-foreground">
          {targets.dailyCalorieTarget.toLocaleString()} kcal target
        </span>
      </header>

      <ResponsiveContainer width="100%" height={150}>
        <BarChart
          data={data}
          margin={{ top: 6, right: 8, left: -20, bottom: 0 }}
        >
          <CartesianGrid
            vertical={false}
            stroke="var(--border)"
            strokeDasharray="3 3"
          />
          <XAxis
            dataKey="date"
            tickFormatter={TICK}
            tick={AXIS}
            tickLine={false}
            axisLine={false}
            minTickGap={24}
          />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} width={44} />
          <Tooltip
            cursor={{ fill: "var(--muted)", strokeWidth: 0 }}
            content={({ active, payload }) => {
              const point = payload?.[0]?.payload as
                | { date: string; kcal: number }
                | undefined;
              if (!active || !point) return null;
              return (
                <div className="rounded-xl border border-border/60 bg-popover px-3 py-2 shadow-lg">
                  <p className="text-xs font-semibold text-foreground">
                    {shortDate(point.date)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {Math.round(point.kcal).toLocaleString()} kcal
                  </p>
                </div>
              );
            }}
          />
          <ReferenceLine
            y={targets.dailyCalorieTarget}
            stroke="var(--muted-foreground)"
            strokeDasharray="4 4"
            strokeWidth={1}
            opacity={0.4}
          />
          <Bar
            dataKey="kcal"
            radius={[5, 5, 0, 0]}
            maxBarSize={26}
            isAnimationActive={false}
          >
            {data.map((d) => (
              <Cell
                key={d.date}
                fill={
                  d.kcal > 0
                    ? Math.abs(d.kcal / targets.dailyCalorieTarget - 1) <= 0.15
                      ? "var(--success)"
                      : d.kcal > targets.dailyCalorieTarget
                        ? "var(--warning)"
                        : "var(--primary)"
                    : "var(--muted)"
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {!hasData && (
        <div className="mt-2 rounded-xl bg-muted/40 px-4 py-3 text-center">
          <p className="text-xs font-medium text-muted-foreground">
            No meals logged this week yet.
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground/70">
            Tap the + button or any meal section above to log your first meal and watch this chart fill in.
          </p>
        </div>
      )}
    </section>
  );
}

/** Where the day's macros actually came from, as a share of total grams. */
export function MacroSplit({
  totals,
}: {
  totals: { proteinG: number; carbsG: number; fatG: number };
}) {
  const series = [
    { key: "proteinG", label: "Protein", value: totals.proteinG, color: "var(--protein)" },
    { key: "carbsG", label: "Carbs", value: totals.carbsG, color: "var(--carbs)" },
    { key: "fatG", label: "Fat", value: totals.fatG, color: "var(--fat)" },
  ];
  const total = series.reduce((acc, s) => acc + s.value, 0);

  if (total <= 0) {
    return (
      <EmptyState
        title="No macros yet"
        body="Your protein, carb and fat split appears here once you log food."
      />
    );
  }

  return (
    <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-card">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Macro split</h2>
        <span className="text-xs text-muted-foreground">
          {Math.round(total)}g total
        </span>
      </header>

      <div className="mb-4 flex h-3 gap-1 overflow-hidden rounded-full">
        {series.map((s) => (
          <div
            key={s.key}
            style={{
              width: `${(s.value / total) * 100}%`,
              backgroundColor: s.color,
            }}
            className="h-full first:rounded-l-full last:rounded-r-full"
          />
        ))}
      </div>

      <ul className="grid grid-cols-3 gap-2">
        {series.map((s) => (
          <li key={s.key} className="rounded-xl bg-muted/50 p-2.5">
            <p className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              {s.label}
            </p>
            <p className="text-lg font-extrabold tracking-tight text-foreground">
              {Math.round(s.value)}
              <span className="ml-0.5 text-[11px] font-semibold text-muted-foreground">
                g
              </span>
            </p>
            <p className="text-[10px] text-muted-foreground">
              {Math.round((s.value / total) * 100)}%
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Training minutes accumulated over the last four weeks. */
export function TrainingMinutesChart() {
  const { sessions } = useWorkouts(28);

  // Bucket sessions by the ISO date of the Monday that starts their week, and
  // order on that real date. Sorting formatted labels ("24 Aug" vs "14 Sep")
  // only looked correct by accident and broke across month/year boundaries.
  const buckets = new Map<string, number>();
  for (const s of sessions) {
    if (!isIsoDate(s.date)) continue;
    const key = startOfWeek(s.date);
    buckets.set(key, (buckets.get(key) ?? 0) + s.minutes);
  }
  const data = [...buckets.entries()]
    .sort((a, b) => compareIsoDates(a[0], b[0]))
    .map(([weekStartIso, minutes]) => ({
      week: shortDate(weekStartIso),
      minutes,
    }));

  if (data.length === 0) {
    return (
      <EmptyState
        title="No training logged"
        body="Finish a session and your weekly training minutes show up here."
      />
    );
  }

  return (
    <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-card">
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">
          Training minutes
        </h2>
        <span className="text-xs text-muted-foreground">Last 4 weeks</span>
      </header>

      <ResponsiveContainer width="100%" height={140}>
        <AreaChart
          data={data}
          margin={{ top: 6, right: 8, left: -22, bottom: 0 }}
        >
          <defs>
            <linearGradient id="minutes-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.45} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="week"
            tick={AXIS}
            tickLine={false}
            axisLine={false}
          />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} width={44} />
          <Tooltip
            cursor={{ stroke: "var(--border)" }}
            content={({ active, payload }) => {
              const point = payload?.[0]?.payload as
                | { week: string; minutes: number }
                | undefined;
              if (!active || !point) return null;
              return (
                <div className="rounded-xl border border-border/60 bg-popover px-3 py-2 shadow-lg">
                  <p className="text-xs font-semibold text-foreground">
                    Week of {point.week}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {point.minutes} minutes
                  </p>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="minutes"
            stroke="var(--primary)"
            strokeWidth={2}
            fill="url(#minutes-fill)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </section>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <section className="rounded-2xl border border-dashed border-border bg-card/50 p-5">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <p className="mt-1 text-xs text-muted-foreground">{body}</p>
    </section>
  );
}
