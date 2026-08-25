import { lstat, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { MAX_LOCAL_SKILL_BYTES, MAX_LOCAL_SKILL_FILES, REQUIRED_SKILL_HEADINGS } from "./constants.js";
import type { AuditFinding, AuditReport } from "./types.js";

const NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TEXT_EXTENSIONS = new Set([".md", ".yaml", ".yml", ".json", ".txt"]);
const EXECUTABLE_EXTENSIONS = new Set([".bat", ".cmd", ".com", ".exe", ".msi", ".ps1", ".scr"]);
const SUSPICIOUS_PATTERNS: Array<{ pattern: RegExp; message: string }> = [
  { pattern: /curl\s+[^\n|]+\|\s*(?:sh|bash)/i, message: "Pipes a remote response directly into a shell." },
  { pattern: /wget\s+[^\n|]+\|\s*(?:sh|bash)/i, message: "Pipes a remote response directly into a shell." },
  { pattern: /rm\s+-rf\s+\/(?:\s|$)/i, message: "Contains a destructive root deletion command." },
  { pattern: /(?:^|\s)sudo(?:\s|$)/i, message: "Requests elevated privileges." },
  { pattern: /\/etc\/(?:shadow|passwd)/i, message: "References sensitive operating-system account files." },
  { pattern: /~\/\.(?:ssh|aws|gnupg)/i, message: "References a sensitive user credential directory." },
  { pattern: /ignore\s+(?:all\s+)?previous\s+instructions/i, message: "Contains a prompt-injection override phrase." },
  { pattern: /exfiltrat(?:e|ion)/i, message: "Contains possible data-exfiltration instructions." },
  { pattern: /base64\s+(?:--decode|-d)[^\n|]*\|\s*(?:sh|bash)/i, message: "Decodes content into a shell." },
  { pattern: /(?:^|\s)nc\s+-[a-z]*[elp]/im, message: "Contains a netcat listener or remote-shell pattern." },
];

interface Frontmatter {
  name?: string;
  description?: string;
  extraKeys: string[];
}

export function parseSkillFrontmatter(content: string): Frontmatter {
  const normalized = content.replace(/\r\n/g, "\n");
  const match = normalized.match(/^---\n([\s\S]*?)\n---(?:\n|$)/);
  if (!match) {
    return { extraKeys: [] };
  }
  const values: Record<string, string> = {};
  const extraKeys: string[] = [];
  for (const line of match[1].split("\n")) {
    if (!line.trim() || line.trimStart().startsWith("#")) {
      continue;
    }
    const separator = line.indexOf(":");
    if (separator < 1) {
      continue;
    }
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "");
    values[key] = value;
    if (key !== "name" && key !== "description") {
      extraKeys.push(key);
    }
  }
  return { name: values.name, description: values.description, extraKeys };
}

async function walk(root: string): Promise<string[]> {
  const output: string[] = [];
  async function visit(current: string): Promise<void> {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const absolute = path.join(current, entry.name);
      output.push(absolute);
      if (entry.isDirectory()) {
        await visit(absolute);
      }
    }
  }
  await visit(root);
  return output;
}

export async function auditSkillDirectory(skillRoot: string): Promise<AuditReport> {
  const skillName = path.basename(path.resolve(skillRoot));
  const findings: AuditFinding[] = [];
  const entries = await walk(skillRoot);
  const filePaths: string[] = [];
  let bytes = 0;

  if (entries.length > MAX_LOCAL_SKILL_FILES) {
    findings.push({ severity: "error", path: ".", message: `Skill has too many entries (${entries.length}; max ${MAX_LOCAL_SKILL_FILES}).` });
  }

  for (const absolute of entries) {
    const relative = path.relative(skillRoot, absolute) || ".";
    const info = await lstat(absolute);
    if (info.isSymbolicLink()) {
      findings.push({ severity: "error", path: relative, message: "Symbolic links are not allowed in Skills." });
      continue;
    }
    if (!info.isFile()) {
      continue;
    }
    filePaths.push(absolute);
    bytes += info.size;
    const extension = path.extname(absolute).toLowerCase();
    if ((info.mode & 0o111) !== 0 || EXECUTABLE_EXTENSIONS.has(extension)) {
      findings.push({ severity: "error", path: relative, message: "Executable files are not allowed." });
    }
    if (!TEXT_EXTENSIONS.has(extension)) {
      findings.push({ severity: "error", path: relative, message: `Unsupported or binary-prone file type: ${extension || "no extension"}.` });
      continue;
    }
    const content = await readFile(absolute);
    if (content.includes(0)) {
      findings.push({ severity: "error", path: relative, message: "Binary content is not allowed." });
      continue;
    }
    let text: string;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(content);
    } catch {
      findings.push({ severity: "error", path: relative, message: "File is not valid UTF-8 text." });
      continue;
    }
    for (const check of SUSPICIOUS_PATTERNS) {
      if (check.pattern.test(text)) {
        findings.push({ severity: "error", path: relative, message: check.message });
      }
    }
  }

  if (bytes > MAX_LOCAL_SKILL_BYTES) {
    findings.push({ severity: "error", path: ".", message: `Skill is too large (${bytes} bytes; max ${MAX_LOCAL_SKILL_BYTES}).` });
  }

  const skillMd = path.join(skillRoot, "SKILL.md");
  if (!filePaths.includes(skillMd)) {
    findings.push({ severity: "error", path: "SKILL.md", message: "Required SKILL.md is missing." });
  } else {
    const content = await readFile(skillMd, "utf8");
    const metadata = parseSkillFrontmatter(content);
    if (!metadata.name || !NAME_PATTERN.test(metadata.name)) {
      findings.push({ severity: "error", path: "SKILL.md", message: "Frontmatter name must be lowercase kebab-case." });
    } else if (metadata.name !== skillName) {
      findings.push({ severity: "error", path: "SKILL.md", message: `Frontmatter name ${metadata.name} does not match directory ${skillName}.` });
    }
    if (!metadata.description || metadata.description.length < 40) {
      findings.push({ severity: "error", path: "SKILL.md", message: "Frontmatter description is missing or too vague." });
    }
    if (metadata.extraKeys.length > 0) {
      findings.push({ severity: "warning", path: "SKILL.md", message: `Additional frontmatter keys require manual review: ${metadata.extraKeys.join(", ")}.` });
    }
    const headings = [...content.matchAll(/^#{1,6}\s+(.+)$/gm)].map((match) => match[1].trim().toLowerCase());
    for (const requiredHeading of REQUIRED_SKILL_HEADINGS) {
      if (!headings.some((heading) => heading.includes(requiredHeading))) {
        findings.push({ severity: "warning", path: "SKILL.md", message: `Recommended section is missing: ${requiredHeading}.` });
      }
    }
  }

  const errors = findings.filter((finding) => finding.severity === "error");
  return { skillName, files: filePaths.length, bytes, findings, passed: errors.length === 0 };
}
