#!/usr/bin/env node
// Show every run whose place label differs between a git ref and the working
// tree, so a relabel is reviewed before it ships.
//
// Usage: node scripts/geo-diff.mjs [ref]   (default: origin/main)
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ref = process.argv[2] ?? "origin/main";

function atRef() {
  try {
    return JSON.parse(execFileSync("git", ["show", `${ref}:data/geo.json`], { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28, stdio: ["ignore", "pipe", "ignore"] }));
  } catch {
    return {};
  }
}

const before = atRef();
const path = join(ROOT, "data", "geo.json");
const after = existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {};
const fmt = (l) => (l ? [l.city, l.county, l.stateCode ?? l.state, l.countryCode].filter(Boolean).join(", ") : "—");

const rows = [];
for (const id of [...new Set([...Object.keys(before), ...Object.keys(after)])].sort()) {
  const a = before[id]?.label, b = after[id]?.label;
  if (JSON.stringify(a ?? null) !== JSON.stringify(b ?? null)) rows.push(`| ${id} | ${a === undefined && !before[id] ? "(new)" : fmt(a)} | ${fmt(b)} |`);
}
console.log(`### Run place labels vs \`${ref}\`\n`);
if (!rows.length) console.log("No label changes.");
else console.log(["| Run | Before | After |", "|---|---|---|", ...rows].join("\n") + `\n\n${rows.length} run(s) changed.`);
