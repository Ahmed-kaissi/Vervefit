"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const PKGBASE = path.resolve(ROOT, "package.json");
const RESEND_PKG = "resend";
const PROBE_MARKER = path.resolve(ROOT, ".resend-ready");

function alreadyReady() {
  try {
    return fs.existsSync(PROBE_MARKER);
  } catch {
    return false;
  }
}

function resendResolvable() {
  try {
    require.resolve(RESEND_PKG);
    return true;
  } catch {
    return false;
  }
}

function markReady() {
  fs.writeFileSync(PROBE_MARKER, String(Date.now()), "utf8");
}

function main() {
  if (alreadyReady()) {
    console.log("[ensure-resend] already marked ready; doing nothing");
    return 0;
  }

  if (!resendResolvable()) {
    console.log("[ensure-resend] resend not resolvable; attempting local install");
    try {
      const { execFileSync } = require("child_process");
      const npm = process.execPath.replace(/^node$/, "npm");
      execFileSync(npm, ["install", "--save", RESEND_PKG], {
        cwd: ROOT,
        stdio: "inherit",
        env: process.env,
      });
    } catch (err) {
      console.error("[ensure-resend] failed to install resend:", err?.message || err);
      return 2;
    }
    if (!resendResolvable()) {
      console.error("[ensure-resend] resend still not resolvable after install");
      return 2;
    }
  }

  markReady();
  console.log("[ensure-resend] ready; resend resolvable, marker written");
  return 0;
}

process.exit(main());
