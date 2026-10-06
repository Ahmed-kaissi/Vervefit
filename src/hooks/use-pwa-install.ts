import { useEffect, useState } from "react";

const DISMISS_KEY = "vervefit-install-dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true;
}

function isIosDevice(): boolean {
  if (typeof window === "undefined") return false;
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export type InstallKind = "android" | "ios" | "hidden";

export function usePwaInstall() {
  const [kind, setKind] = useState<InstallKind>(() => {
    if (typeof window === "undefined") return "hidden";
    if (isStandaloneDisplay()) return "hidden";
    if (window.sessionStorage.getItem(DISMISS_KEY) === "1") return "hidden";
    if (isIosDevice()) return "ios";
    // Android Chrome: the install prompt fires once later, so assume the
    // installable web app state and attach the listener at mount.
    return "android";
  });
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (kind !== "android") return;
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, [kind]);

  const dismiss = () => {
    window.sessionStorage.setItem(DISMISS_KEY, "1");
    setKind("hidden");
    setDeferred(null);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    setDeferred(null);
    if (choice.outcome === "accepted") {
      setKind("hidden");
      return;
    }
    dismiss();
  };

  return { kind, install, dismiss };
}
