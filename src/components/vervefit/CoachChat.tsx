import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router";
import {
  AlertTriangle,
  ArrowUp,
  Calculator,
  Gauge,
  Mic,
  MicOff,
  RotateCcw,
  Sparkles,
  Square,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { setGuestMigrationFlag } from "@/hooks/use-guest-migration";
import { useVoiceInput } from "@/hooks/use-voice-input";
import { cn } from "@/lib/utils";
import type { CoachStatus, CoachTier, CoachTurn } from "@/hooks/use-coach";

interface CoachChatProps {
  isGuest: boolean;
  messages: CoachTurn[];
  sending: boolean;
  sendingText: string | null;
  error: string | null;
  status: CoachStatus | null;
  checking: boolean;
  suggestions: string[];
  tier: CoachTier;
  onTierChange: (tier: CoachTier) => void;
  onSend: (question: string) => void | Promise<void>;
  onReset: () => void | Promise<void>;
}

function timeOf(ts: number) {
  return new Date(ts).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Human-readable provenance for an answer, derived from stored metadata. */
export function provenanceOf(turn: CoachTurn): {
  label: string;
  title: string;
  icon: typeof Calculator;
} | null {
  if (turn.role !== "assistant") return null;
  switch (turn.provider) {
    case "deterministic":
      return {
        label: "Calculated from your log",
        title: "Answered by the app: no AI model was called.",
        icon: Calculator,
      };
    case "free":
      return {
        label: "Fast model",
        title: turn.model ? `Answered by ${turn.model} (free tier).` : "Fast model",
        icon: Zap,
      };
    case "deepseek":
      return {
        label: "DeepSeek",
        title: turn.model ? `Answered by ${turn.model}.` : "DeepSeek",
        icon: Sparkles,
      };
    default:
      return null;
  }
}

function AnswerBadge({ turn }: { turn: CoachTurn }) {
  const provenance = provenanceOf(turn);
  if (!provenance) return null;
  const Icon = provenance.icon;
  return (
    <span
      title={provenance.title}
      className="inline-flex items-center gap-1 rounded-full bg-[#2A2A2E] px-2 py-0.5 text-[10px] font-semibold text-[#9A9A9A]"
    >
      <Icon className="size-3" aria-hidden="true" />
      {provenance.label}
    </span>
  );
}

function UnconfiguredNotice({ status }: { status?: CoachStatus }) {
  const missing =
    (status?.missing ?? []).length > 0
      ? status!.missing
      : ["DEEPSEEK_API_KEY", "FREE_AI_API_KEY + FREE_AI_BASE_URL"];
  return (
    <div className="rounded-2xl border border-[#2A2A2E] bg-[#141414] p-5 shadow-card">
      <span className="flex size-9 items-center justify-center rounded-xl bg-[#CEFF00]/10 text-[#CEFF00]">
        <Sparkles className="size-4" aria-hidden="true" />
      </span>
      <h3 className="mt-3 text-sm font-bold text-[#E8E8E8]">
        The coach needs a model key
      </h3>
      <p className="mt-1 text-xs leading-relaxed text-[#9A9A9A]">
        Answers that come straight from your log still work without a key. For
        conversational answers an administrator needs to set{" "}
        <code className="rounded bg-[#2A2A2E] px-1 py-0.5 text-[11px] text-[#E8E8E8]">
          {missing.join(", ")}
        </code>{" "}
        in the Convex environment. Keys stay on the server and are never sent to
        the browser.
      </p>
    </div>
  );
}

function SignInRequired() {
  const navigate = useNavigate();
  return (
    <div className="rounded-2xl border border-[#2A2A2E] bg-[#141414] p-5 text-center shadow-card">
      <span className="mx-auto flex size-11 items-center justify-center rounded-2xl bg-[#CEFF00]/10 text-[#CEFF00]">
        <Sparkles className="size-5" aria-hidden="true" />
      </span>
      <h3 className="mt-3 text-sm font-bold text-[#E8E8E8]">
        The coach lives in your account
      </h3>
      <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-[#9A9A9A]">
        Sign in so your conversations stay with you and the coach can see your
        logged meals, habits and training.
      </p>
      <Button
        className="mt-4"
        onClick={() => {
          setGuestMigrationFlag();
          navigate("/auth?returnTo=/coach", { replace: true });
        }}
      >
        Sign in to chat
      </Button>
    </div>
  );
}

function ThinkingBubble() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex max-w-[85%] items-center gap-2 rounded-2xl rounded-bl-md border border-[#2A2A2E] bg-[#141414] px-4 py-3 shadow-card"
    >
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="size-1.5 rounded-full bg-[#CEFF00]/70"
          animate={{ opacity: [0.25, 1, 0.25], y: [0, -3, 0] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
      <span className="sr-only">Coach is typing</span>
    </motion.div>
  );
}

function Bubble({ turn }: { turn: CoachTurn }) {
  const mine = turn.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-col gap-1 ${mine ? "items-end" : "items-start"}`}
    >
      <div
        className={
          mine
            ? "max-w-[85%] rounded-2xl rounded-br-md bg-[#CEFF00] px-4 py-2.5 text-sm leading-relaxed font-medium text-[#0B0B0B] shadow-glow"
            : "max-w-[85%] rounded-2xl rounded-bl-md border border-[#2A2A2E] bg-[#141414] px-4 py-2.5 text-sm leading-relaxed whitespace-pre-line text-[#E8E8E8] shadow-card"
        }
      >
        {turn.content}
      </div>
      <div className="flex items-center gap-1.5 px-1">
        <AnswerBadge turn={turn} />
        <time className="text-[10px] font-medium text-[#9A9A9A]">
          {timeOf(turn.at ?? 0)}
        </time>
      </div>
    </motion.div>
  );
}

const TIERS: Array<{ id: CoachTier; label: string; hint: string }> = [
  {
    id: "auto",
    label: "Auto",
    hint: "Instant answers where possible, then the cheapest model that fits",
  },
  { id: "fast", label: "Fast", hint: "Always answer with the free lightweight model" },
  { id: "deep", label: "Deep", hint: "Always answer with the strong reasoning model" },
];

function TierPicker({
  tier,
  onChange,
  status,
}: {
  tier: CoachTier;
  onChange: (tier: CoachTier) => void;
  status: CoachStatus | null;
}) {
  const fastModel = status?.lightweight?.model ?? null;
  const deepModel = status?.reasoning?.model ?? null;

  return (
    <div className="flex items-center gap-2">
      <Gauge className="size-3.5 shrink-0 text-[#9A9A9A]" aria-hidden="true" />
      <div
        role="group"
        aria-label="How the coach should answer"
        className="flex flex-1 gap-1 rounded-full border border-[#2A2A2E] bg-[#141414] p-0.5"
      >
        {TIERS.map((option) => {
          const active = tier === option.id;
          const detail =
            option.id === "fast"
              ? fastModel
              : option.id === "deep"
                ? deepModel
                : "router";
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              aria-pressed={active}
              title={`${option.hint}${detail ? ` (${detail})` : ""}`}
              className={cn(
                "flex-1 rounded-full px-3 py-1 text-[11px] font-semibold transition-colors",
                active
                  ? "bg-[#CEFF00] text-[#0B0B0B]"
                  : "text-[#9A9A9A] hover:bg-[#2A2A2E]",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Pulsing ring shown while the mic is hot — the only motion that reads as "recording". */
function ListeningPulse({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <motion.span
      aria-hidden="true"
      className="absolute inset-0 rounded-xl bg-destructive/25"
      animate={{ opacity: [0.7, 0, 0.7], scale: [1, 1.35, 1] }}
      transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
    />
  );
}

export function CoachChat(props: CoachChatProps) {
  const {
    isGuest,
    messages,
    sending,
    sendingText,
    error,
    status,
    checking,
    suggestions,
    tier,
    onTierChange,
    onSend,
    onReset,
  } = props;

  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  // Dictation appends to whatever is already typed, so a half-written
  // question survives starting the mic mid-sentence.
  const appendDictation = useCallback((text: string) => {
    setDraft((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text));
  }, []);
  const voice = useVoiceInput({ onFinal: appendDictation });

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, sending]);

  const submit = () => {
    const text = draft.trim();
    if (!text || sending) return;
    voice.cancel();
    setDraft("");
    void onSend(text);
  };

  const showSetup = !isGuest && !checking && status?.configured === false;
  const empty = messages.length === 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        {isGuest && <SignInRequired />}

        {!isGuest && empty && !showSetup && (
          <div className="space-y-3">
            <div className="rounded-2xl border border-[#2A2A2E] bg-[#141414] p-5 shadow-card">
              <span className="flex size-9 items-center justify-center rounded-xl bg-[#CEFF00]/10 text-[#CEFF00]">
                <Sparkles className="size-4" aria-hidden="true" />
              </span>
              <h3 className="mt-3 text-sm font-bold text-[#E8E8E8]">
                Ask me anything about your week
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-[#9A9A9A]">
                I can see what you&apos;ve eaten, your streak, weight trend and
                training, so I can give advice that fits your actual numbers.
                Numbers I can work out myself are answered instantly.
              </p>
            </div>
            <div className="grid gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void onSend(s)}
                  className="group flex items-center justify-between gap-3 rounded-2xl border border-[#2A2A2E] bg-[#141414] px-4 py-3 text-left text-sm font-medium text-[#E8E8E8] shadow-card transition-colors hover:border-[#CEFF00]/40 hover:bg-[#1A1A1C]"
                >
                  <span>{s}</span>
                  <ArrowUp className="size-4 shrink-0 rotate-45 text-[#9A9A9A] transition-colors group-hover:text-[#CEFF00]" />
                </button>
              ))}
            </div>
          </div>
        )}

        {showSetup && status && <UnconfiguredNotice status={status} />}

        {!isGuest && !empty && (
          <div className="flex flex-col gap-3">
            {messages.map((turn) => (
              <Bubble key={turn.id} turn={turn} />
            ))}
            {sending && <ThinkingBubble />}
          </div>
        )}

        <div ref={endRef} />
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-2xl border border-[#FF453A]/30 bg-[#FF453A]/10 px-4 py-3 text-xs font-medium text-[#FF453A]">
          <AlertTriangle className="mt-px size-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {!isGuest && !showSetup && (
        <>
          <TierPicker tier={tier} onChange={onTierChange} status={status} />

          {!empty && (
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-[11px] font-medium text-[#9A9A9A]">
                <TrendingUp className="size-3.5 text-[#CEFF00]" aria-hidden="true" />
                Answers use your logged data
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 rounded-full px-2.5 text-xs text-[#9A9A9A]"
                onClick={() => void onReset()}
              >
                <RotateCcw className="size-3.5" aria-hidden="true" />
                New chat
              </Button>
            </div>
          )}

          <div className="sticky bottom-20 rounded-2xl border border-[#2A2A2E] bg-[#141414] p-2 shadow-lift">
            {voice.listening && (
              <div className="flex items-center gap-2 px-2 pb-1.5 text-[11px] font-medium text-[#FF453A]">
                <span className="flex items-end gap-0.5" aria-hidden="true">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="w-0.5 rounded-full bg-[#FF453A]"
                      animate={{ height: [4, 12, 4] }}
                      transition={{
                        duration: 0.8,
                        repeat: Infinity,
                        delay: i * 0.15,
                      }}
                    />
                  ))}
                </span>
                {voice.interim
                  ? `“${voice.interim.trim()}”`
                  : "Listening… say your question"}
              </div>
            )}

            <div className="flex items-end gap-2">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submit();
                  }
                }}
                rows={1}
                maxLength={2000}
                placeholder={voice.listening ? "Listening…" : "Ask your coach…"}
                aria-label="Message your coach"
                className="max-h-32 min-h-10 flex-1 resize-none border-0 bg-transparent px-2 py-2 shadow-none focus-visible:ring-0 text-[#E8E8E8]"
              />

              {voice.supported && (
                <Button
                  type="button"
                  size="icon"
                  variant={voice.listening ? "destructive" : "secondary"}
                  onClick={() => (voice.listening ? voice.stop() : voice.start())}
                  aria-label={
                    voice.listening ? "Stop dictating" : "Dictate your message"
                  }
                  aria-pressed={voice.listening}
                  className={cn(
                    "relative rounded-xl",
                    voice.listening && "overflow-visible",
                  )}
                >
                  <ListeningPulse active={voice.listening} />
                  <span className="relative">
                    {voice.listening ? (
                      <MicOff className="size-4" aria-hidden="true" />
                    ) : (
                      <Mic className="size-4" aria-hidden="true" />
                    )}
                  </span>
                </Button>
              )}

              <Button
                size="icon"
                onClick={submit}
                disabled={!draft.trim() || sending}
                aria-label="Send message"
                className="rounded-xl"
              >
                {sending ? (
                  <Square className="size-4 fill-current" aria-hidden="true" />
                ) : (
                  <ArrowUp className="size-4" aria-hidden="true" />
                )}
              </Button>
            </div>
          </div>

          {(!voice.supported || voice.error || (sending && sendingText)) && (
            <div className="-mt-2 space-y-1 px-1 text-[11px]">
              {!voice.supported && (
                <p className="flex items-center gap-1.5 text-[#9A9A9A]">
                  <Mic className="size-3.5" aria-hidden="true" />
                  Voice input needs Chrome, Edge or Safari.
                </p>
              )}
              {voice.error && (
                <p className="font-medium text-[#FF453A]">{voice.error}</p>
              )}
              {sending && sendingText && (
                <p className="truncate text-[#9A9A9A]">
                  You asked: {sendingText}
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
