import { readdir, readFile, access } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const errors = [];
const walk = async (dir) => {
  let entries = [];
  try { entries = await readdir(dir, { withFileTypes: true }); }
  catch { return []; }
  const found = [];
  for (const entry of entries) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...await walk(full));
    else found.push(full);
  }
  return found;
};
const files = await walk(root);
const jsFiles = files.filter(file => file.endsWith(".js") && !file.endsWith("supabase-config.js"));
for (const file of jsFiles) {
  const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (result.status !== 0) errors.push(`JavaScript syntax: ${path.relative(root, file)}\n${result.stderr || result.stdout}`);
}

const htmlFiles = files.filter(file => file.endsWith(".html"));
const localRef = async (owner, raw, label) => {
  if (!raw || /^(?:https?:|mailto:|tel:|data:|blob:|javascript:|#)/i.test(raw)) return;
  const clean = decodeURIComponent(raw.split(/[?#]/, 1)[0]);
  if (!clean || clean === "/" || clean === "./") return;
  if (clean === "supabase-config.js") return; // generated dynamically by the Worker
  const target = clean.startsWith("/") ? path.join(root, clean.slice(1)) : path.resolve(path.dirname(owner), clean);
  try { await access(target); }
  catch { errors.push(`Missing local ${label}: ${path.relative(root, owner)} -> ${raw}`); }
};
for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  for (const match of html.matchAll(/\b(?:src|href)=["']([^"']+)["']/gi)) {
    await localRef(file, match[1], "asset/link");
  }
}
for (const file of files.filter(file => file.endsWith(".css"))) {
  const css = await readFile(file, "utf8");
  for (const match of css.matchAll(/url\(\s*["']?([^"'\)]+)["']?\s*\)/gi)) {
    await localRef(file, match[1].trim(), "CSS asset");
  }
}
if (errors.length) {
  console.error(errors.join("\n\n"));
  console.error(`\nSite checks failed: ${errors.length} issue(s).`);
  process.exit(1);
}
console.log(`Site checks passed: ${jsFiles.length} JavaScript files, ${htmlFiles.length} HTML pages, local assets verified.`);
