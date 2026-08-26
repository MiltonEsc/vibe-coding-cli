#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { DEFAULT_STACKS } from "./constants.js";
import { runDoctor } from "./doctor.js";
import { initializeProject, validateStacks } from "./scaffold.js";
import { addBundledSkill, auditInstalledSkills, installRemoteSkill, listBundledSkills, listInstalledSkills, loadCatalog } from "./skills.js";
import { approveStage, isStage, loadWorkflow, readWorkflowHistory, reopenStage, verifyWorkflow, workflowRows } from "./workflow.js";
import { STACKS, type PackageManager, type Stack } from "./types.js";

const VERSION = "0.3.0";
const PRESETS: Record<string, Stack[]> = {
  "full-stack": [...DEFAULT_STACKS],
  web: ["nextjs", "supabase", "github-actions"],
  api: ["fastapi", "supabase", "github-actions"],
  mobile: ["flutter", "supabase", "github-actions"],
  docs: [],
};

interface ParsedArgs {
  positional: string[];
  values: Record<string, string>;
  flags: Set<string>;
}

function parseArgs(tokens: string[], valueOptions: Record<string, string>, booleanOptions: Record<string, string>): ParsedArgs {
  const positional: string[] = [];
  const values: Record<string, string> = {};
  const flags = new Set<string>();
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token === "--") {
      positional.push(...tokens.slice(index + 1));
      break;
    }
    if (!token.startsWith("-")) {
      positional.push(token);
      continue;
    }
    const [rawName, inlineValue] = token.split("=", 2);
    const valueKey = valueOptions[rawName];
    if (valueKey) {
      const value = inlineValue ?? tokens[index + 1];
      if (value === undefined || (!inlineValue && value.startsWith("-"))) {
        throw new Error(`Option ${rawName} requires a value.`);
      }
      values[valueKey] = value;
      if (inlineValue === undefined) index += 1;
      continue;
    }
    const flagKey = booleanOptions[rawName];
    if (flagKey) {
      flags.add(flagKey);
      continue;
    }
    throw new Error(`Unknown option: ${rawName}`);
  }
  return { positional, values, flags };
}

function parsePackageManager(value: string): PackageManager {
  if (["pnpm", "npm", "yarn", "bun"].includes(value)) return value as PackageManager;
  throw new Error(`Unsupported package manager: ${value}. Use pnpm, npm, yarn, or bun.`);
}

function parseStackList(value: string): Stack[] {
  return validateStacks(value.split(",").map((item) => item.trim()).filter(Boolean));
}

function resolveStacks(preset?: string, explicit?: Stack[]): Stack[] {
  if (explicit) return explicit;
  if (!preset) return [];
  const stacks = PRESETS[preset];
  if (!stacks) throw new Error(`Unknown preset: ${preset}. Available: ${Object.keys(PRESETS).join(", ")}`);
  return [...stacks];
}

function printRows(rows: Array<Record<string, string>>): void {
  if (rows.length === 0) {
    console.log("No entries.");
    return;
  }
  const headers = Object.keys(rows[0]);
  const widths = Object.fromEntries(headers.map((header) => [header, Math.max(header.length, ...rows.map((row) => String(row[header] ?? "").length))])) as Record<string, number>;
  console.log(headers.map((header) => header.padEnd(widths[header])).join("  "));
  console.log(headers.map((header) => "-".repeat(widths[header])).join("  "));
  for (const row of rows) console.log(headers.map((header) => String(row[header] ?? "").padEnd(widths[header])).join("  "));
}

function printRootHelp(): void {
  console.log(`vibe ${VERSION}\n\nSecure scaffolding and gated workflows for agent-assisted software projects.\n\nUsage:\n  vibe init [directory] [options]\n  vibe doctor [directory] [--json]\n  vibe workflow status [directory] [--json]\n  vibe workflow verify [directory] [--json]\n  vibe workflow history [stage] [directory] [--json]\n  vibe workflow approve <stage> [directory] --approver <identity> [--note <text>]\n  vibe workflow reopen <stage> [directory] --reason <text> [--actor <identity>]\n  vibe skills list [directory]\n  vibe skills bundled\n  vibe skills add <name> [directory] [--force]\n  vibe skills audit [directory] [--json]\n  vibe skills catalog [--json]\n  vibe skills install <catalog-id> [directory] [--force]\n\nInit presets: ${Object.keys(PRESETS).join(", ")}\nKnown stacks: ${STACKS.join(", ")}\nCustom stack identifiers are also accepted.\n`);
}

function requirePositional(values: string[], index: number, label: string): string {
  const value = values[index];
  if (!value) throw new Error(`Missing required argument: ${label}`);
  return value;
}

async function runInit(tokens: string[]): Promise<void> {
  const parsed = parseArgs(tokens,
    { "--preset": "preset", "-p": "preset", "--stack": "stack", "-s": "stack", "--package-manager": "packageManager", "--prompt": "prompt", "--prompt-file": "promptFile" },
    { "--force": "force", "--dry-run": "dryRun", "--help": "help", "-h": "help" },
  );
  if (parsed.flags.has("help")) {
    console.log("Usage: vibe init [directory] [--preset full-stack|web|api|mobile|docs] [--stack a,b] [--package-manager pnpm|npm|yarn|bun] [--prompt text|--prompt-file path] [--force] [--dry-run]");
    return;
  }
  if (parsed.positional.length > 1) throw new Error("init accepts at most one directory argument.");
  const directory = parsed.positional[0] ?? ".";
  if (parsed.values.prompt && parsed.values.promptFile) throw new Error("Use --prompt or --prompt-file, not both.");
  const stacks = resolveStacks(parsed.values.preset, parsed.values.stack ? parseStackList(parsed.values.stack) : undefined);
  const prompt = parsed.values.promptFile ? await readFile(parsed.values.promptFile, "utf8") : parsed.values.prompt;
  if (prompt && Buffer.byteLength(prompt, "utf8") > 1024 * 1024) throw new Error("Prompt exceeds the 1 MiB limit.");
  if (prompt?.includes("\0")) throw new Error("Prompt contains unsupported null bytes.");
  const result = await initializeProject(directory, {
    stacks,
    packageManager: parsePackageManager(parsed.values.packageManager ?? "pnpm"),
    prompt,
    force: parsed.flags.has("force"),
    dryRun: parsed.flags.has("dryRun"),
  });
  console.log(`${result.dryRun ? "Planned" : "Created"} Vibe project: ${result.root}`);
  console.log(`Stacks: ${result.stacks.length > 0 ? result.stacks.join(", ") : "not selected"}`);
  console.log(`Skills: ${result.skills.length}`);
  console.log(`Files: ${result.files.length}`);
  if (!result.dryRun) console.log("Next: complete requirements.md, run 'vibe doctor', then request requirements approval.");
}

async function runDoctorCommand(tokens: string[]): Promise<void> {
  const parsed = parseArgs(tokens, {}, { "--json": "json", "--help": "help", "-h": "help" });
  if (parsed.flags.has("help")) {
    console.log("Usage: vibe doctor [directory] [--json]");
    return;
  }
  if (parsed.positional.length > 1) throw new Error("doctor accepts at most one directory argument.");
  const report = await runDoctor(parsed.positional[0] ?? ".");
  if (parsed.flags.has("json")) console.log(JSON.stringify(report, null, 2));
  else {
    console.log(`Project: ${report.root}`);
    for (const issue of report.issues) console.log(`${issue.severity.toUpperCase()} ${issue.path}: ${issue.message}`);
    console.log(`Doctor: ${report.errors} error(s), ${report.warnings} warning(s).`);
  }
  if (!report.passed) process.exitCode = 1;
}

async function runWorkflow(tokens: string[]): Promise<void> {
  const subcommand = tokens.shift();
  if (!subcommand || subcommand === "help" || subcommand === "--help" || subcommand === "-h") {
    console.log("Usage: vibe workflow status|verify|history|approve|reopen ...");
    return;
  }
  if (subcommand === "status") {
    const parsed = parseArgs(tokens, {}, { "--json": "json" });
    if (parsed.positional.length > 1) throw new Error("workflow status accepts at most one directory.");
    const { root, state } = await loadWorkflow(parsed.positional[0] ?? ".");
    const verification = await verifyWorkflow(root);
    if (parsed.flags.has("json")) console.log(JSON.stringify({ root, ...state, integrity: verification }, null, 2));
    else {
      console.log(`Project: ${root}`);
      printRows(workflowRows(state, verification));
    }
    return;
  }
  if (subcommand === "verify") {
    const parsed = parseArgs(tokens, {}, { "--json": "json", "--help": "help", "-h": "help" });
    if (parsed.flags.has("help")) {
      console.log("Usage: vibe workflow verify [directory] [--json]");
      return;
    }
    if (parsed.positional.length > 1) throw new Error("workflow verify accepts at most one directory.");
    const report = await verifyWorkflow(parsed.positional[0] ?? ".");
    if (parsed.flags.has("json")) console.log(JSON.stringify(report, null, 2));
    else {
      console.log("Vibe Workflow Integrity");
      console.log(`Project: ${report.root}`);
      printRows(report.stages.map((item) => ({ stage: item.stage, status: item.status, integrity: item.integrity ?? "-" })));
      for (const issue of report.issues) {
        console.log(`ERROR ${issue.path}: ${issue.message}`);
        if (issue.approvedSha256) console.log(`  Approved SHA-256: ${issue.approvedSha256}`);
        if (issue.currentSha256) console.log(`  Current SHA-256:  ${issue.currentSha256}`);
        if (issue.recommendedCommand) console.log(`  Recommended action: ${issue.recommendedCommand}`);
      }
      console.log(`Workflow integrity: ${report.passed ? "verified" : "failed"}.`);
    }
    if (!report.passed) process.exitCode = 1;
    return;
  }
  if (subcommand === "history") {
    const parsed = parseArgs(tokens, {}, { "--json": "json", "--help": "help", "-h": "help" });
    if (parsed.flags.has("help")) {
      console.log("Usage: vibe workflow history [stage] [directory] [--json]");
      return;
    }
    if (parsed.positional.length > 2) throw new Error("workflow history accepts an optional stage and directory.");
    const first = parsed.positional[0];
    const stage = first && isStage(first) ? first : undefined;
    const directory = stage ? parsed.positional[1] ?? "." : first ?? ".";
    const history = await readWorkflowHistory(directory);
    const events = stage ? history.events.filter((event) => event.stage === stage) : history.events;
    if (parsed.flags.has("json")) console.log(JSON.stringify({ schemaVersion: 1, root: history.root, stage, events }, null, 2));
    else {
      console.log(`Project: ${history.root}`);
      printRows(events.map((event) => ({
        type: String(event.type ?? "-"),
        stage: String(event.stage ?? "-"),
        actor: String(event.actor ?? "-"),
        at: String(event.at ?? "-"),
        commit: String(event.commit ?? "-"),
        reason: String(event.reason ?? "-"),
      })));
    }
    return;
  }
  if (subcommand === "approve") {
    const parsed = parseArgs(tokens, { "--approver": "approver", "--note": "note" }, {});
    const stageValue = requirePositional(parsed.positional, 0, "stage");
    if (!isStage(stageValue)) throw new Error(`Unknown stage: ${stageValue}`);
    if (!parsed.values.approver) throw new Error("Option --approver is required.");
    if (parsed.positional.length > 2) throw new Error("workflow approve accepts only stage and optional directory.");
    const state = await approveStage(stageValue, { start: parsed.positional[1] ?? ".", approver: parsed.values.approver, note: parsed.values.note });
    const approved = state.stages[stageValue];
    console.log(`Approved ${stageValue} by ${approved.approvedBy} at ${approved.approvedAt}.`);
    if (approved.workingTreeClean === false) console.log("WARNING Approval was recorded with uncommitted Git changes. Commit or review the exact approved evidence before merge.");
    return;
  }
  if (subcommand === "reopen") {
    const parsed = parseArgs(tokens, { "--reason": "reason", "--actor": "actor" }, {});
    const stageValue = requirePositional(parsed.positional, 0, "stage");
    if (!isStage(stageValue)) throw new Error(`Unknown stage: ${stageValue}`);
    if (!parsed.values.reason) throw new Error("Option --reason is required.");
    if (parsed.positional.length > 2) throw new Error("workflow reopen accepts only stage and optional directory.");
    const result = await reopenStage(stageValue, { start: parsed.positional[1] ?? ".", reason: parsed.values.reason, actor: parsed.values.actor });
    console.log(`Reopened ${stageValue}. Invalidated approvals: ${result.reopened.length > 0 ? result.reopened.join(", ") : "none"}.`);
    return;
  }
  throw new Error(`Unknown workflow command: ${subcommand}`);
}

async function runSkills(tokens: string[]): Promise<void> {
  const subcommand = tokens.shift();
  if (!subcommand || subcommand === "help" || subcommand === "--help" || subcommand === "-h") {
    console.log("Usage: vibe skills list|bundled|add|audit|catalog|install ...");
    return;
  }
  if (subcommand === "bundled") {
    if (tokens.length > 0) throw new Error("skills bundled accepts no arguments.");
    for (const name of await listBundledSkills()) console.log(name);
    return;
  }
  if (subcommand === "list") {
    const parsed = parseArgs(tokens, {}, {});
    if (parsed.positional.length > 1) throw new Error("skills list accepts at most one directory.");
    const installed = await listInstalledSkills(parsed.positional[0] ?? ".");
    printRows(installed.map(({ name, audit }) => ({ name, status: audit.passed ? "pass" : "fail", files: String(audit.files), bytes: String(audit.bytes), findings: String(audit.findings.length) })));
    return;
  }
  if (subcommand === "add") {
    const parsed = parseArgs(tokens, {}, { "--force": "force" });
    const name = requirePositional(parsed.positional, 0, "name");
    if (parsed.positional.length > 2) throw new Error("skills add accepts name and optional directory.");
    const destination = await addBundledSkill(name, { start: parsed.positional[1] ?? ".", force: parsed.flags.has("force") });
    console.log(`Installed bundled Skill at ${destination}`);
    return;
  }
  if (subcommand === "audit") {
    const parsed = parseArgs(tokens, {}, { "--json": "json" });
    if (parsed.positional.length > 1) throw new Error("skills audit accepts at most one directory.");
    const reports = await auditInstalledSkills(parsed.positional[0] ?? ".");
    if (parsed.flags.has("json")) console.log(JSON.stringify(reports, null, 2));
    else {
      for (const report of reports) {
        console.log(`${report.passed ? "PASS" : "FAIL"} ${report.skillName} (${report.files} files, ${report.bytes} bytes)`);
        for (const finding of report.findings) console.log(`  ${finding.severity.toUpperCase()} ${finding.path}: ${finding.message}`);
      }
    }
    if (reports.some((report) => !report.passed)) process.exitCode = 1;
    return;
  }
  if (subcommand === "catalog") {
    const parsed = parseArgs(tokens, {}, { "--json": "json" });
    if (parsed.positional.length > 0) throw new Error("skills catalog accepts no positional arguments.");
    const catalog = await loadCatalog();
    if (parsed.flags.has("json")) console.log(JSON.stringify(catalog, null, 2));
    else {
      printRows(catalog.entries.map((entry) => ({ id: entry.id, publisher: entry.publisher, reviewedAt: entry.reviewedAt, files: String(entry.files.length) })));
      console.log("Remote installation is opt-in. URLs, redirects, file paths, sizes, checksums, executability, and content are validated before atomic installation.");
    }
    return;
  }
  if (subcommand === "install") {
    const parsed = parseArgs(tokens, {}, { "--force": "force" });
    const catalogId = requirePositional(parsed.positional, 0, "catalog-id");
    if (parsed.positional.length > 2) throw new Error("skills install accepts catalog-id and optional directory.");
    const result = await installRemoteSkill(catalogId, { start: parsed.positional[1] ?? ".", force: parsed.flags.has("force") });
    console.log(`Installed ${result.entry.id} at ${result.destination}`);
    console.log(`Audit: ${result.audit.passed ? "pass" : "fail"}; ${result.audit.findings.length} finding(s).`);
    return;
  }
  throw new Error(`Unknown skills command: ${subcommand}`);
}

async function main(): Promise<void> {
  const tokens = process.argv.slice(2);
  const command = tokens.shift();
  if (!command || command === "help" || command === "--help" || command === "-h") {
    printRootHelp();
    return;
  }
  if (command === "--version" || command === "-V" || command === "version") {
    console.log(VERSION);
    return;
  }
  if (command === "init") return runInit(tokens);
  if (command === "doctor") return runDoctorCommand(tokens);
  if (command === "workflow") return runWorkflow(tokens);
  if (command === "skills") return runSkills(tokens);
  throw new Error(`Unknown command: ${command}. Run 'vibe --help'.`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${message}`);
  process.exit(1);
});
