const fs = require("fs");
const s = fs.readFileSync("src/convex/ai/provider.ts", "utf8");
let q = 0,
  b = 0;
for (let i = 0; i < s.length; i++) {
  const c = s[i];
  if (c === '"') q++;
  if (c === "`") b++;
}
console.log("double quotes:", q, "backticks:", b, "len:", s.length);
const lines = s.split("\n");
for (let i = 60; i < 77; i++) {
  console.log(i + 1, "|", JSON.stringify(lines[i]));
}
