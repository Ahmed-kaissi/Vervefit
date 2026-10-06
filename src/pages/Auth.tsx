import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import logo from "@/assets/logo.svg";
import { UserX, Loader2, Mail, Lock } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { setGuestMigrationFlag } from "@/hooks/use-guest-migration";
import { guestStore } from "@/lib/guest-store";

interface AuthProps {
  redirectAfterAuth?: string;
}

function resolveRedirectAfterAuth(
  returnTo: string | null,
  fallback = "/dashboard",
) {
  if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) {
    return returnTo;
  }
  return fallback;
}

function Auth({ redirectAfterAuth }: AuthProps = {}) {
  const { isLoading: authLoading, isAuthenticated, signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = resolveRedirectAfterAuth(
    searchParams.get("returnTo"),
    redirectAfterAuth,
  );
  const [step, setStep] = useState<"signup" | "signin">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate(redirect);
    }
  }, [authLoading, isAuthenticated, navigate, redirect]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      // Tell the Password provider which flow to use.
      formData.set("flow", step === "signup" ? "signUp" : "signIn");
      await signIn("password", formData);
      navigate(redirect);
    } catch (err) {
      console.error("Sign-in error:", err);
      const message = err instanceof Error ? err.message : "Something went wrong.";
      // If signing in failed because the account doesn't exist, switch to sign-up.
      if (/invalid credentials/i.test(message) && step === "signin") {
        setStep("signup");
        setError("No account found. Create one instead?");
        setIsLoading(false);
        return;
      }
      setError(message);
      setIsLoading(false);
    }
  };

  const handleGuestLogin = () => {
    guestStore.markGuestSession();
    setGuestMigrationFlag();
    navigate(redirect, { replace: true });
  };

  return (
    <div className="flex min-h-dvh flex-col bg-[#0B0B0B] text-[#E8E8E8] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="flex w-full max-w-md flex-col items-center">
          <Card className="w-full border-[#2A2A2E] pb-0 shadow-lift">
            <CardHeader className="text-center">
              <div className="flex justify-center">
                <img
                  src={logo}
                  alt="VerveFit"
                  width={48}
                  height={48}
                  className="rounded-lg bg-[#141414] p-1.5"
                />
              </div>
              <CardTitle className="text-xl text-[#E8E8E8]">
                {step === "signup" ? "Create your account" : "Welcome back"}
              </CardTitle>
              <CardDescription className="text-[#9A9A9A]">
                {step === "signup"
                  ? "Pick a password and you're in"
                  : "Enter your password to sign in"}
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent>
                {error && (
                  <p className="mt-2 text-sm text-[#FF453A]">{error}</p>
                )}

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-[#9A9A9A]" />
                      <Input
                        name="email"
                        placeholder="you@example.com"
                        type="email"
                        className="pl-9 bg-[#141414] border-[#2A2A2E] text-[#E8E8E8] placeholder:text-[#9A9A9A]"
                        disabled={isLoading}
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  {step === "signup" && (
                    <div className="space-y-1.5">
                      <div className="relative">
                        <Input
                          name="name"
                          placeholder="Your name (optional)"
                          className="bg-[#141414] border-[#2A2A2E] text-[#E8E8E8] placeholder:text-[#9A9A9A]"
                          disabled={isLoading}
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-[#9A9A9A]" />
                      <Input
                        name="password"
                        placeholder="Password"
                        type="password"
                        className="pl-9 bg-[#141414] border-[#2A2A2E] text-[#E8E8E8] placeholder:text-[#9A9A9A]"
                        disabled={isLoading}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex justify-center">
                  <Button
                    type="button"
                    variant="link"
                    className="p-0 h-auto text-[#CEFF00]"
                    onClick={() => {
                      setStep(step === "signup" ? "signin" : "signup");
                      setError(null);
                    }}
                    disabled={isLoading}
                  >
                    {step === "signup"
                      ? "Already have an account? Sign in"
                      : "Need an account? Create one"}
                  </Button>
                </div>

                <div className="mt-5">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-[#2A2A2E]" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-[#141414] px-2 text-[#9A9A9A]">
                        Or
                      </span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full mt-4 bg-[#141414] border-[#2A2A2E] text-[#E8E8E8] hover:bg-[#2A2A2E]"
                    onClick={handleGuestLogin}
                    disabled={isLoading}
                  >
                    <UserX className="mr-2 h-4 w-4" />
                    Continue as guest
                  </Button>
                </div>
              </CardContent>
            </form>
            <CardFooter className="flex-col gap-2 border-t border-[#2A2A2E] pt-4">
              <Button
                type="submit"
                className="w-full bg-[#CEFF00] text-[#0B0B0B] shadow-glow"
                disabled={isLoading || password.length < 6}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {step === "signup" ? "Creating account..." : "Signing in..."}
                  </>
                ) : (
                  <>
                    {step === "signup" ? "Create account" : "Sign in"}
                    <Mail className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}

import { Suspense } from "react";

export default function AuthPage(props: AuthProps) {
  return (
    <Suspense>
      <Auth {...props} />
    </Suspense>
  );
}
