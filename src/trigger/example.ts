import { logger, task } from "@trigger.dev/sdk";

export const healthCheckTask = task({
  id: "health-check",
  maxDuration: 300,
  run: async (payload: { userId: string }) => {
    logger.log("Running health check", { userId: payload.userId });

    return {
      ok: true,
      checkedAt: new Date().toISOString(),
      userId: payload.userId,
    };
  },
});