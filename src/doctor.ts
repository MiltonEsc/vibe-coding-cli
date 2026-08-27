import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { ARTIFACT_FILES, STACK_SKILLS, STAGE_SKILLS } from "./constants.js";
import { artifactRelativePath, loadProjectContext, validateArtifactFilePath, type ProjectContext } from "./artifacts.js";
import { auditSkillDirectory } from "./security.js";
import { exists, findProjectRoot, safeJoin } from "./paths.js";
import { STAGES, isKnownStack, type VibeConfig, type WorkflowVerificationReport } from "./types.js";
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
  ".vibe/config.json",
  ".vibe/workflow.json",
  ".vibe/skills.lock.json",
];

export async function runDoctor(start?: string): Promise<DoctorReport> {
  const root = await findProjectRoot(start);
  const issues: DoctorIssue[] = [];
  let workflow: WorkflowVerificationReport | undefined;
  let context: ProjectContext | undefined;

  for (const relativePath of ROOT_FILES) {
    if (!(await exists(path.join(root, relativePath)))) {
      issues.push({ severity: "error", path: relativePath, message: "Required project file is missing." });
    }
  }

  let config: VibeConfig | undefined;
  try {
    context = await loadProjectContext(root);
    const candidate = context.config;
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
    issues.push({ severity: "error", path: ".vibe/config.json", message: `Cannot parse or validate configuration: ${(error as Error).message}` });
  }

  if (context) {
    for (const filename of ARTIFACT_FILES) {
      const relativePath = artifactRelativePath(context, filename);
      try {
        const target = await validateArtifactFilePath(root, relativePath);
        if (!(await exists(target))) issues.push({ severity: "error", path: relativePath, message: "Required workflow artifact is missing." });
      } catch (error) {
        issues.push({ severity: "error", path: relativePath, message: (error as Error).message });
      }
    }
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

  const artifactDocuments = new Set(context ? ARTIFACT_FILES.map((filename) => artifactRelativePath(context, filename)) : []);
  const documents = ["AGENTS.md", ...artifactDocuments];
  for (const relativePath of documents) {
    let target: string;
    try {
      target = artifactDocuments.has(relativePath)
        ? await validateArtifactFilePath(root, relativePath)
        : safeJoin(root, relativePath);
    } catch {
      continue;
    }
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
