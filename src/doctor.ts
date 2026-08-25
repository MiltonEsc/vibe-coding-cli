import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { STACK_SKILLS, STAGE_SKILLS } from "./constants.js";
import { auditSkillDirectory } from "./security.js";
import { exists, findProjectRoot, readJson } from "./paths.js";
import { STAGES, isKnownStack, type Stack, type VibeConfig, type WorkflowState } from "./types.js";
import { validateStacks } from "./scaffold.js";

export interface DoctorIssue {
  severity: "error" | "warning" | "info";
  path: string;
  message: string;
}

export interface DoctorReport {
  root: string;
  issues: DoctorIssue[];
  errors: number;
  warnings: number;
  passed: boolean;
}

const ROOT_FILES = [
  "AGENTS.md",
  "requirements.md",
  "architecture.md",
  "database.md",
  "backend.md",
  "design.md",
  "frontend.md",
  "testing.md",
  "review.md",
  "deployment.md",
  "SECURITY.md",
  ".vibe/config.json",
  ".vibe/workflow.json",
];

function expectedNestedAgents(stacks: Stack[]): string[] {
  const files = ["tests/AGENTS.md"];
  if (stacks.includes("nextjs") || stacks.includes("react")) files.push("apps/web/AGENTS.md");
  if (stacks.includes("fastapi") || stacks.includes("nestjs")) files.push("apps/api/AGENTS.md");
  if (stacks.includes("flutter")) files.push("apps/mobile/AGENTS.md");
  if (stacks.includes("supabase")) files.push("supabase/AGENTS.md");
  if (stacks.includes("github-actions")) files.push(".github/AGENTS.md");
  return files;
}

export async function runDoctor(start?: string): Promise<DoctorReport> {
  const root = await findProjectRoot(start);
  const issues: DoctorIssue[] = [];

  for (const relativePath of ROOT_FILES) {
    if (!(await exists(path.join(root, relativePath)))) {
      issues.push({ severity: "error", path: relativePath, message: "Required project file is missing." });
    }
  }

  let config: VibeConfig | undefined;
  try {
    const candidate = await readJson<VibeConfig>(path.join(root, ".vibe", "config.json"));
    if (!Array.isArray(candidate.stacks) || candidate.stacks.some((stack) => typeof stack !== "string")) {
      throw new Error("stacks must be an array of identifiers");
    }
    config = { ...candidate, stacks: validateStacks(candidate.stacks) };
    const customStacks = config.stacks.filter((stack) => !isKnownStack(stack));
    if (customStacks.length > 0) {
      issues.push({ severity: "info", path: ".vibe/config.json", message: `Custom stacks use general Skills: ${customStacks.join(", ")}` });
    }
    if (JSON.stringify(candidate.workflow.order) !== JSON.stringify(STAGES)) {
      issues.push({ severity: "error", path: ".vibe/config.json", message: "Configured workflow order is not the mandatory Vibe order." });
    }
  } catch (error) {
    issues.push({ severity: "error", path: ".vibe/config.json", message: `Cannot parse configuration: ${(error as Error).message}` });
  }

  try {
    const workflow = await readJson<WorkflowState>(path.join(root, ".vibe", "workflow.json"));
    if (JSON.stringify(workflow.order) !== JSON.stringify(STAGES)) {
      issues.push({ severity: "error", path: ".vibe/workflow.json", message: "Workflow order is invalid." });
    }
    let seenPending = false;
    for (const stage of STAGES) {
      const value = workflow.stages[stage];
      if (!value || (value.status !== "pending" && value.status !== "approved")) {
        issues.push({ severity: "error", path: ".vibe/workflow.json", message: `Invalid state for stage ${stage}.` });
        continue;
      }
      if (value.status === "pending") seenPending = true;
      if (seenPending && value.status === "approved") {
        issues.push({ severity: "error", path: ".vibe/workflow.json", message: `Stage ${stage} is approved after a pending prerequisite.` });
      }
    }
  } catch (error) {
    issues.push({ severity: "error", path: ".vibe/workflow.json", message: `Cannot parse workflow: ${(error as Error).message}` });
  }

  if (config) {
    for (const relativePath of expectedNestedAgents(config.stacks)) {
      if (!(await exists(path.join(root, relativePath)))) {
        issues.push({ severity: "error", path: relativePath, message: "Expected scoped AGENTS.md is missing." });
      }
    }

    const requiredSkills = new Set<string>(["full-stack-app-builder", ...Object.values(STAGE_SKILLS)]);
    for (const stack of config.stacks) {
      if (isKnownStack(stack)) requiredSkills.add(STACK_SKILLS[stack]);
    }
    if (config.stacks.includes("nextjs")) requiredSkills.add("react-component-builder");
    for (const skill of requiredSkills) {
      const skillRoot = path.join(root, ".agents", "skills", skill);
      if (!(await exists(skillRoot))) {
        issues.push({ severity: "error", path: `.agents/skills/${skill}`, message: "Required bundled Skill is missing." });
        continue;
      }
      const audit = await auditSkillDirectory(skillRoot);
      for (const finding of audit.findings) {
        issues.push({ severity: finding.severity, path: `.agents/skills/${skill}/${finding.path}`, message: finding.message });
      }
    }
  }

  for (const relativePath of ROOT_FILES.filter((file) => file.endsWith(".md"))) {
    const target = path.join(root, relativePath);
    if (!(await exists(target))) continue;
    const content = await readFile(target, "utf8");
    if (/VIBE:REQUIRED/i.test(content)) {
      issues.push({ severity: "warning", path: relativePath, message: "Contains unresolved VIBE:REQUIRED markers." });
    }
  }

  const skillsRoot = path.join(root, ".agents", "skills");
  if (await exists(skillsRoot)) {
    const entries = await readdir(skillsRoot, { withFileTypes: true });
    if (entries.some((entry: any) => entry.isSymbolicLink())) {
      issues.push({ severity: "error", path: ".agents/skills", message: "Symbolic links are not allowed in the Skill directory." });
    }
  }

  const errors = issues.filter((issue) => issue.severity === "error").length;
  const warnings = issues.filter((issue) => issue.severity === "warning").length;
  return { root, issues, errors, warnings, passed: errors === 0 };
}
