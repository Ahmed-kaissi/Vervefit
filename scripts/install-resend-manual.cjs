"use strict";
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const RESEND_TGZ = path.resolve(ROOT, "resend-6.32.0.tgz");
const DEST = path.resolve(ROOT, "node_modules", "resend");
const MARKER = path.resolve(ROOT, ".resend-ready");

function has(cmd) {
  try {
    execSync(cmd + " --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function main() {
  if (fs.existsSync(DEST) && fs.existsSync(path.join(DEST, "package.json"))) {
    fs.writeFileSync(MARKER, String(Date.now()), "utf8");
    console.log("[install-resend-manual] resend already installed; nothing to do");
    return 0;
  }

  if (!fs.existsSync(RESEND_TGZ)) {
    console.error("[install-resend-manual] resend-6.32.0.tgz not found next to package.json");
    return 2;
  }

  console.log("[install-resend-manual] extracting resend-6.32.0.tgz into node_modules/resend");
  try {
    fs.mkdirSync(DEST, { recursive: true });
  } catch {}

  let ok = false;
  if (has("tar")) {
    try {
      execSync("tar xf \"%s\" -C \"%s\"".replace(/%s/g, '"'), {
        cwd: ROOT,
        stdio: "ignore",
        env: Object.assign({}, process.env, { PATH: process.env.PATH }),
      });
      ok = fs.existsSync(path.join(DEST, "package.json"));
      if (!ok) {
        // tar may have created a nested folder; move contents up
        const entries = fs.readdirSync(DEST);
        if (entries.length === 1) {
          const single = path.join(DEST, entries[0]);
          if (fs.statSync(single).isDirectory()) {
            for (const e of fs.readdirSync(single)) {
              fs.renameSync(path.join(single, e), path.join(DEST, e));
            }
            fs.rmdirSync(single);
            ok = fs.existsSync(path.join(DEST, "package.json"));
          }
        }
      }
    } catch {}
  }

  if (!ok) {
    console.error("[install-resend-manual] tar extraction did not produce node_modules/resend/package.json");
    try { fs.rmdirSync(DEST, { recursive: true }); } catch {}
    return 2;
  }

  fs.writeFileSync(MARKER, String(Date.now()), "utf8");
  console.log("[install-resend-manual] resend installed and marked ready");
  return 0;
}

process.exit(main());
