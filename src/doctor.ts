import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { STACK_SKILLS, STAGE_SKILLS } from "./constants.js";
import { auditSkillDirectory } from "./security.js";
import { exists, findProjectRoot, readJson } from "./paths.js";
import { STAGES, isKnownStack, type Stack, type VibeConfig, type WorkflowVerificationReport } from "./types.js";
import { validateStacks } from "./scaffold.js";
import { verifyWorkflow } from "./workflow.js";

export interface DoctorIssue {
  severity: "error" | "warning" | "info";
  path: string;
  message: string;
  code?: string;
  stage?: string;
  approvedBy?: string;
  approvedSha256?: string;
  currentSha256?: string;
  recommendedCommand?: string;
}

export interface DoctorReport {
  root: string;
  issues: DoctorIssue[];
  errors: number;
  warnings: number;
  passed: boolean;
  workflow?: WorkflowVerificationReport;
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
  let workflow: WorkflowVerificationReport | undefined;

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
    workflow = await verifyWorkflow(root);
    for (const issue of workflow.issues) {
      const hashDetails = issue.approvedSha256
        ? ` Approved SHA-256: ${issue.approvedSha256}.${issue.currentSha256 ? ` Current SHA-256: ${issue.currentSha256}.` : ""}`
        : "";
      const action = issue.recommendedCommand ? ` Recommended action: ${issue.recommendedCommand}` : "";
      issues.push({
        severity: "error",
        path: issue.path,
        message: `${issue.message}${hashDetails}${action}`,
        code: issue.code,
        stage: issue.stage,
        approvedBy: issue.approvedBy,
        approvedSha256: issue.approvedSha256,
        currentSha256: issue.currentSha256,
        recommendedCommand: issue.recommendedCommand,
      });
    }
  } catch (error) {
    issues.push({ severity: "error", path: ".vibe/workflow.json", message: `Cannot verify workflow: ${(error as Error).message}` });
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
  return { root, issues, errors, warnings, passed: errors === 0, workflow };
}
