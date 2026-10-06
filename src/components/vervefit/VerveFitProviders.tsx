import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { InstallAppBanner } from "@/components/vervefit/InstallAppBanner";
import type { ReactNode } from "react";

export function VerveFitProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      // Must match the key the pre-paint script in index.html reads, or the
      // first paint shows the wrong theme.
      storageKey="vervefit-theme"
    >
      <Toaster
        position="top-center"
        richColors
        closeButton
        duration={2500}
        offset={{ top: "calc(0.75rem + env(safe-area-inset-top))" }}
      />
      {children}
      <InstallAppBanner />
    </ThemeProvider>
  );
}
