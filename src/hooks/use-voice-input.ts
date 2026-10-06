import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Minimal structural types for the Web Speech API. Browsers ship it as
 * `webkitSpeechRecognition` on Safari/Chrome and it is not in lib.dom yet, so
 * the shapes we rely on are declared here instead.
 */
interface SpeechAlternativeLike {
  transcript: string;
  confidence: number;
}

interface SpeechResultLike {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechAlternativeLike;
}

interface SpeechResultListLike {
  readonly length: number;
  [index: number]: SpeechResultLike;
}

interface SpeechEventLike extends Event {
  resultIndex: number;
  results: SpeechResultListLike;
}

interface SpeechErrorEventLike extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechEventLike) => void) | null;
  onerror: ((event: SpeechErrorEventLike) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const FRIENDLY_ERRORS: Record<string, string> = {
  "not-allowed": "Microphone access was blocked. Allow it in your browser settings to dictate.",
  "service-not-allowed": "Microphone access was blocked. Allow it in your browser settings to dictate.",
  "no-speech": "I didn't catch that. Try again a little closer to the mic.",
  "audio-capture": "No microphone was found on this device.",
  network: "Voice dictation couldn't reach its speech service. Check your connection and try again.",
  aborted: null as unknown as string,
};

export interface VoiceInputOptions {
  /** Called with each finalised phrase, ready to append to the draft. */
  onFinal: (text: string) => void;
  /** BCP-47 tag. Defaults to the browser's language. */
  lang?: string;
}

export interface VoiceInput {
  /** False in browsers without the Web Speech API (Firefox, most of iOS). */
  supported: boolean;
  listening: boolean;
  /** Words heard so far in the current utterance, not yet finalised. */
  interim: string;
  error: string | null;
  start: () => void;
  stop: () => void;
  /** Abort and clear any error without emitting a final phrase. */
  cancel: () => void;
}

export function useVoiceInput({ onFinal, lang }: VoiceInputOptions): VoiceInput {
  const supported = getRecognitionCtor() !== null;

  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  // Held in a ref so re-renders never tear down a live recognition session.
  const onFinalRef = useRef(onFinal);
  useEffect(() => {
    onFinalRef.current = onFinal;
  }, [onFinal]);

  // Stop on unmount, otherwise the mic indicator stays on after navigating away.
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const cancel = useCallback(() => {
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    setListening(false);
    setInterim("");
    setError(null);
  }, []);

  const start = useCallback(() => {
    if (!supported || listening) return;
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setError("This browser can't do voice input. Try Chrome, Edge or Safari.");
      return;
    }

    setError(null);
    setInterim("");

    const recognition = new Ctor();
    recognition.lang = lang ?? navigator.language ?? "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    let finalText = "";

    recognition.onstart = () => setListening(true);

    recognition.onresult = (event) => {
      let pending = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const alternative = result[0];
        if (!alternative) continue;
        if (result.isFinal) {
          finalText += `${alternative.transcript} `;
        } else {
          pending += alternative.transcript;
        }
      }
      setInterim(pending);
      if (finalText.trim()) {
        onFinalRef.current(finalText.trim());
        finalText = "";
      }
    };

    recognition.onerror = (event) => {
      // `aborted` fires from our own cancel() — not something to report.
      if (event.error === "aborted") return;
      setError(
        FRIENDLY_ERRORS[event.error] ??
          `Voice input failed (${event.error}). Please try again.`,
      );
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setListening(false);
      setInterim("");
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      // Thrown when a previous session hasn't fully released the mic.
      recognitionRef.current = null;
      setListening(false);
      setError("The microphone is busy. Try again in a moment.");
    }
  }, [lang, listening, supported]);

  return { supported, listening, interim, error, start, stop, cancel };
}
