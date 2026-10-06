import { useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { useFoodLog } from "@/hooks/use-food-log";
import {
  clearGuestMigrationFlag,
  peekGuestMigrationFlag,
} from "@/hooks/use-guest-migration";
import {
  snapshotForMigration as guestSnapshot,
  clearAll as guestClearAll,
} from "@/lib/guest-activity";
import {
  clearBatchKey,
  getOrCreateBatchKey,
  migrateGuestActivityData,
} from "@/lib/migration";
import { todayStr } from "@/lib/nutrition";
import { toast } from "sonner";

/**
 * Moves guest (sessionStorage) meals and activity into the cloud exactly once,
 * right after the visitor signs in.
 *
 * Ordering is the whole point: snapshot → upload → confirm → clear. Nothing is
 * removed from the guest store until the corresponding mutation resolves, and
 * the pending flag is only cleared when both imports succeed, so a failure
 * leaves the data intact and retryable instead of silently deleting it.
 */
export function GuestMigrator() {
  const { isLoading, isAuthenticated } = useAuth();
  const { migrateGuestData } = useFoodLog(todayStr());
  const migrateActivity = useMutation(api.activity.migrateGuestActivity);
  const [retryToken, setRetryToken] = useState(0);
  // React StrictMode double-invokes effects in dev; a ref keeps one sign-in
  // from kicking off two competing migrations.
  const running = useRef(false);

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    if (running.current) return;
    if (!peekGuestMigrationFlag()) return;
    running.current = true;

    void (async () => {
      let mealsOk = false;
      let activityOk = false;

      try {
        const result = await migrateGuestData();
        mealsOk = true;
        if (result.count > 0) {
          toast.success(
            `Moved ${result.count} logged ${
              result.count === 1 ? "meal" : "meals"
            } to your account.`,
          );
        }
      } catch (err) {
        console.error("[GuestMigrator] meal migration failed:", err);
        toast.error(
          "Couldn't move your guest meals yet — they're still saved in this tab. We'll retry when you reload.",
          { action: { label: "Retry now", onClick: () => setRetryToken((t) => t + 1) } },
        );
      }

      try {
        const batchKey = getOrCreateBatchKey("activity");
        const result = await migrateGuestActivityData({
          readActivity: () => guestSnapshot(),
          migrateActivity: async (payload, key) => {
            await migrateActivity({ data: payload, batchKey: key });
          },
          clearActivity: () => guestClearAll(),
          batchKey,
        });
        if (result.cleared) clearBatchKey("activity");
        activityOk = true;
        if (result.attempted > 0) {
          toast.success("Your habits, water and training came along too.");
        }
      } catch (err) {
        console.error("[GuestMigrator] activity migration failed:", err);
        activityOk = false;
        toast.error(
          "Couldn't move your habits and training yet — they're still in this tab.",
        );
      }

      // Only stand down once everything landed. Otherwise the flag stays so
      // the next load (or the retry button) picks the import back up.
      if (mealsOk && activityOk) clearGuestMigrationFlag();
      running.current = false;
    })();
  }, [isLoading, isAuthenticated, migrateGuestData, migrateActivity, retryToken]);

  return null;
}
