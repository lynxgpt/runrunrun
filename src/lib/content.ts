import { readFileSync } from "node:fs";
import { join } from "node:path";
import yaml from "js-yaml";

export interface FooterLine {
  text: string;
  url?: string;
  linkText?: string;
}

export interface SiteContent {
  header: {
    name: string;
  };
  foreword: string[];
  footer: FooterLine[];
}

const CONTENT_PATH = join(process.cwd(), "content", "site.yaml");

function loadContent(): SiteContent {
  const raw = readFileSync(CONTENT_PATH, "utf8");
  const parsed = yaml.load(raw);
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("content/site.yaml must be a YAML object");
  }
  return parsed as SiteContent;
}

// Read at module evaluation time — Next.js server components import this
// module once per build, so the file is read exactly once.
export const siteContent: SiteContent = loadContent();
