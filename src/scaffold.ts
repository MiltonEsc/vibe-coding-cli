import { cp, mkdir, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { DEFAULT_STACKS, STACK_SKILLS, STAGE_SKILLS } from "./constants.js";
import { BUNDLED_SKILLS_ROOT, exists, safeJoin } from "./paths.js";
import { projectTextFiles } from "./templates.js";
import { STACKS, STAGES, type PackageManager, type Stack, type VibeConfig, type WorkflowState } from "./types.js";

export interface InitOptions {
  stacks?: Stack[];
  packageManager: PackageManager;
  force?: boolean;
  dryRun?: boolean;
}

export interface InitResult {
  root: string;
  files: string[];
  skills: string[];
  stacks: Stack[];
  dryRun: boolean;
}

export function validateStacks(input: readonly string[]): Stack[] {
  const unique = [...new Set(input)];
  const invalid = unique.filter((value) => !STACKS.includes(value as Stack));
  if (invalid.length > 0) {
    throw new Error(`Unknown stack(s): ${invalid.join(", ")}. Supported: ${STACKS.join(", ")}`);
  }
  const stacks = unique as Stack[];
  if (stacks.includes("fastapi") && stacks.includes("nestjs")) {
    throw new Error("Select only one primary backend: fastapi or nestjs.");
  }
  if (stacks.includes("nextjs") && stacks.includes("react")) {
    throw new Error("Select nextjs for a Next.js app or react for a standalone React app, not both.");
  }
  return stacks;
}

function selectedSkills(stacks: Stack[]): string[] {
  const skills = new Set<string>(["full-stack-app-builder", ...Object.values(STAGE_SKILLS)]);
  for (const stack of stacks) {
    skills.add(STACK_SKILLS[stack]);
  }
  if (stacks.includes("nextjs")) {
    skills.add("react-component-builder");
  }
  return [...skills].sort();
}

function initialWorkflow(): WorkflowState {
  return {
    schemaVersion: 1,
    order: [...STAGES],
    stages: Object.fromEntries(STAGES.map((stage) => [stage, { status: "pending" }])) as WorkflowState["stages"],
  };
}

async function assertWritableTarget(root: string, force: boolean): Promise<void> {
  if (!(await exists(root))) {
    return;
  }
  const info = await stat(root);
  if (!info.isDirectory()) {
    throw new Error(`Target exists and is not a directory: ${root}`);
  }
  const entries = await readdir(root);
  if (entries.length > 0 && !force) {
    throw new Error(`Target directory is not empty: ${root}. Use --force to merge and overwrite Vibe-managed files.`);
  }
}

export async function initializeProject(target: string, options: InitOptions): Promise<InitResult> {
  const root = path.resolve(target);
  const projectName = path.basename(root);
  const stacks = validateStacks(options.stacks === undefined ? DEFAULT_STACKS : options.stacks);
  const skills = selectedSkills(stacks);
  const createdAt = new Date().toISOString();
  const ctx = { projectName, packageManager: options.packageManager, stacks, createdAt };
  const textFiles = projectTextFiles(ctx);

  const config: VibeConfig = {
    schemaVersion: 1,
    projectName,
    createdAt,
    packageManager: options.packageManager,
    stacks,
    skillsDirectory: ".agents/skills",
    workflow: { order: [...STAGES], requireExplicitApproval: true },
    security: { remoteSkillsOptIn: true, requireChecksums: true, allowExecutableFiles: false },
  };

  textFiles[".vibe/config.json"] = `${JSON.stringify(config, null, 2)}\n`;
  textFiles[".vibe/workflow.json"] = `${JSON.stringify(initialWorkflow(), null, 2)}\n`;
  textFiles[".vibe/skills.lock.json"] = `${JSON.stringify({ schemaVersion: 1, installed: [] }, null, 2)}\n`;
  textFiles[".vibe/provenance/.gitkeep"] = "";
  textFiles[".gitignore"] = [
    "node_modules/",
    ".next/",
    "dist/",
    "build/",
    "coverage/",
    ".dart_tool/",
    ".flutter-plugins*",
    ".venv/",
    "__pycache__/",
    ".env",
    ".env.*",
    "!.env.example",
    ".vibe/tmp/",
    "",
  ].join("\n");

  const plannedFiles = [...Object.keys(textFiles), ...skills.flatMap((skill) => [
    `.agents/skills/${skill}/SKILL.md`,
    `.agents/skills/${skill}/agents/openai.yaml`,
  ])].sort();

  if (options.dryRun) {
    return { root, files: plannedFiles, skills, stacks, dryRun: true };
  }

  await assertWritableTarget(root, options.force ?? false);
  await mkdir(root, { recursive: true });

  for (const [relativePath, content] of Object.entries(textFiles)) {
    const destination = safeJoin(root, relativePath);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, content, { encoding: "utf8", mode: 0o644 });
  }

  for (const skill of skills) {
    const source = safeJoin(BUNDLED_SKILLS_ROOT, skill);
    if (!(await exists(source))) {
      throw new Error(`Bundled Skill is missing: ${skill}`);
    }
    const destination = safeJoin(root, path.join(".agents", "skills", skill));
    await mkdir(path.dirname(destination), { recursive: true });
    await cp(source, destination, { recursive: true, force: true, errorOnExist: false, verbatimSymlinks: false });
  }

  return { root, files: plannedFiles, skills, stacks, dryRun: false };
}
