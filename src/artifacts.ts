import { lstat } from "node:fs/promises";
import path from "node:path";
import { STAGE_ARTIFACT_FILES } from "./constants.js";
import { exists, findProjectRoot, readJson, safeJoin } from "./paths.js";
import type { Stage, VibeConfig } from "./types.js";

export const DEFAULT_ARTIFACTS_DIRECTORY = ".vibe/artifacts";

export interface ProjectContext {
  root: string;
  config: VibeConfig;
  artifactsDirectory: string;
}

function portablePath(value: string): string {
  return value.split(path.sep).join("/");
}

export function configuredArtifactsDirectory(config: VibeConfig): string {
  if (config.schemaVersion === 1) return "";
  if (config.schemaVersion !== 2) throw new Error(`Unsupported Vibe project schema: ${(config as { schemaVersion?: unknown }).schemaVersion}`);
  if (typeof config.artifactsDirectory !== "string" || !config.artifactsDirectory.trim()) {
    throw new Error("schema v2 requires a non-empty artifactsDirectory");
  }
  if (config.artifactsDirectory.includes("\0")) throw new Error("artifactsDirectory contains a null byte");
  return config.artifactsDirectory;
}

export async function validateArtifactsDirectory(root: string, relativeDirectory: string): Promise<string> {
  if (!relativeDirectory) return root;
  const target = safeJoin(root, relativeDirectory);
  const relative = path.relative(root, target);
  if (!relative || relative === ".") throw new Error("artifactsDirectory must not resolve to the project root");

  let current = root;
  for (const segment of relative.split(path.sep)) {
    current = path.join(current, segment);
    if (!(await exists(current))) continue;
    const info = await lstat(current);
    if (info.isSymbolicLink()) throw new Error(`Artifact path contains a symbolic link: ${portablePath(path.relative(root, current))}`);
    if (current !== target && !info.isDirectory()) {
      throw new Error(`Artifact path parent is not a directory: ${portablePath(path.relative(root, current))}`);
    }
  }
  return target;
}

export async function validateArtifactFilePath(root: string, relativePath: string): Promise<string> {
  const target = safeJoin(root, relativePath);
  let current = root;
  for (const segment of path.relative(root, target).split(path.sep)) {
    current = path.join(current, segment);
    if (!(await exists(current))) continue;
    const info = await lstat(current);
    const displayPath = portablePath(path.relative(root, current));
    if (info.isSymbolicLink()) throw new Error(`Artifact path contains a symbolic link: ${displayPath}`);
    if (current !== target && !info.isDirectory()) throw new Error(`Artifact path parent is not a directory: ${displayPath}`);
    if (current === target && !info.isFile()) throw new Error(`Artifact is not a regular file: ${displayPath}`);
  }
  return target;
}

export async function loadProjectContext(start?: string): Promise<ProjectContext> {
  const root = await findProjectRoot(start);
  const config = await readJson<VibeConfig>(path.join(root, ".vibe", "config.json"));
  if (config.schemaVersion !== 1 && config.schemaVersion !== 2) {
    throw new Error(`Unsupported Vibe project schema: ${(config as { schemaVersion?: unknown }).schemaVersion}`);
  }
  const artifactsDirectory = configuredArtifactsDirectory(config);
  await validateArtifactsDirectory(root, artifactsDirectory);
  return { root, config, artifactsDirectory };
}

export function artifactRelativePath(context: Pick<ProjectContext, "artifactsDirectory">, filename: string): string {
  return context.artifactsDirectory
    ? path.posix.join(portablePath(context.artifactsDirectory), filename)
    : filename;
}

export function stageArtifactPaths(context: Pick<ProjectContext, "artifactsDirectory">, stage: Stage): string[] {
  return STAGE_ARTIFACT_FILES[stage].map((filename) => artifactRelativePath(context, filename));
}
