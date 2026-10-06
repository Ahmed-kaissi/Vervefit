"use strict";
const fs = require("fs");
const path = require("path");
const fsPromise = require("fs/promises");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const MARKER = path.resolve(ROOT, ".resend-ready");

function resolvable() {
  try {
    require.resolve("resend");
    return true;
  } catch {
    return false;
  }
}

async function installResendFallback() {
  const dest = path.resolve(ROOT, "node_modules", "resend");
  try {
    await fsPromise.access(dest);
    return true;
  } catch {
    // fall through
  }

  console.log("[postinstall-guard] direct node_modules install of resend");
  execFileSync("npm", [
    "install",
    "resend",
    "--no-save",
    "--prefer-offline",
    "--no-audit",
    "--no-fund",
  ], {
    cwd: ROOT,
    stdio: "inherit",
    env: process.env,
  });
  return resolvable();
}

function main() {
  if (resolvable()) {
    fs.writeFileSync(MARKER, String(Date.now()), "utf8");
    console.log("[postinstall-guard] resend already available; nothing to do");
    return 0;
  }

  console.log("[postinstall-guard] resend missing; attempting direct install");
  try {
    const ok = installResendFallback();
    if (!ok) {
      console.error("[postinstall-guard] direct resend install failed");
      return 2;
    }
  } catch (err) {
    console.error("[postinstall-guard] resend install failed:", err?.message || err);
    return 2;
  }

  fs.writeFileSync(MARKER, String(Date.now()), "utf8");
  console.log("[postinstall-guard] resend installed and marked ready");
  return 0;
}

process.exit(main());
