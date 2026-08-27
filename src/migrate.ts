import { randomUUID } from "node:crypto";
import { lstat, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { ARTIFACT_FILES, STAGE_ARTIFACT_FILES } from "./constants.js";
import { DEFAULT_ARTIFACTS_DIRECTORY, artifactRelativePath, loadProjectContext, validateArtifactsDirectory } from "./artifacts.js";
import { exists, findProjectRoot, readJson, safeJoin } from "./paths.js";
import { STAGES, type VibeConfig, type VibeConfigV2, type WorkflowState } from "./types.js";

export interface MigrationMove {
  from: string;
  to: string;
}

export interface MigrationResult {
  root: string;
  status: "planned" | "migrated" | "already-v2";
  dryRun: boolean;
  moves: MigrationMove[];
}

function workflowPath(root: string): string {
  return path.join(root, ".vibe", "workflow.json");
}

function configPath(root: string): string {
  return path.join(root, ".vibe", "config.json");
}

function transformWorkflowEvidence(state: WorkflowState): WorkflowState {
  const transformed = structuredClone(state);
  if (transformed.schemaVersion !== 1 || JSON.stringify(transformed.order) !== JSON.stringify(STAGES)) {
    throw new Error("Cannot migrate an invalid workflow ledger schema or stage order.");
  }

  for (const stage of STAGES) {
    const value = transformed.stages?.[stage];
    if (!value || (value.status !== "pending" && value.status !== "approved")) {
      throw new Error(`Cannot migrate invalid workflow state for stage ${stage}.`);
    }
    if (value.status === "pending") {
      if (value.evidence || value.approvedAt || value.approvedBy) {
        throw new Error(`Cannot migrate pending stage ${stage} with stale approval metadata.`);
      }
      continue;
    }

    const evidence = Array.isArray(value.evidence) ? value.evidence : [];
    const expected = STAGE_ARTIFACT_FILES[stage];
    const evidencePaths = evidence.map((item) => item?.path);
    if (evidence.length !== expected.length
      || new Set(evidencePaths).size !== evidencePaths.length
      || evidencePaths.some((item) => !expected.includes(item))
      || evidence.some((item) => typeof item?.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(item.sha256)
        || typeof item?.bytes !== "number" || !Number.isSafeInteger(item.bytes) || item.bytes < 0)) {
      throw new Error(`Cannot safely transform approval evidence for ${stage}. Reopen or repair the legacy project first.`);
    }
    value.evidence = evidence.map((item) => ({
      ...item,
      path: artifactRelativePath({ artifactsDirectory: DEFAULT_ARTIFACTS_DIRECTORY }, item.path),
    }));
  }
  return transformed;
}

async function preflightMoves(root: string): Promise<MigrationMove[]> {
  await validateArtifactsDirectory(root, DEFAULT_ARTIFACTS_DIRECTORY);
  const moves: MigrationMove[] = [];
  for (const filename of ARTIFACT_FILES) {
    const from = filename;
    const to = artifactRelativePath({ artifactsDirectory: DEFAULT_ARTIFACTS_DIRECTORY }, filename);
    const source = safeJoin(root, from);
    const destination = safeJoin(root, to);
    if (!(await exists(source))) throw new Error(`Cannot migrate; managed artifact is missing: ${from}`);
    const sourceInfo = await lstat(source);
    if (sourceInfo.isSymbolicLink() || !sourceInfo.isFile()) {
      throw new Error(`Cannot migrate non-regular managed artifact: ${from}`);
    }
    if (await exists(destination)) throw new Error(`Cannot migrate; destination already exists: ${to}`);
    moves.push({ from, to });
  }
  return moves;
}

export async function migrateProject(start = ".", options: { dryRun?: boolean } = {}): Promise<MigrationResult> {
  const root = await findProjectRoot(start);
  const config = await readJson<VibeConfig>(configPath(root));
  if (config.schemaVersion === 2) {
    await loadProjectContext(root);
    return { root, status: "already-v2", dryRun: Boolean(options.dryRun), moves: [] };
  }
  if (config.schemaVersion !== 1) {
    throw new Error(`Cannot migrate unsupported Vibe project schema: ${(config as { schemaVersion?: unknown }).schemaVersion}`);
  }

  const moves = await preflightMoves(root);
  const rawWorkflow = await readFile(workflowPath(root), "utf8") as string;
  let workflow: WorkflowState;
  try {
    workflow = JSON.parse(rawWorkflow) as WorkflowState;
  } catch (error) {
    throw new Error(`Cannot migrate invalid workflow JSON: ${(error as Error).message}`);
  }
  const migratedWorkflow = transformWorkflowEvidence(workflow);
  const migratedConfig: VibeConfigV2 = {
    ...config,
    schemaVersion: 2,
    artifactsDirectory: DEFAULT_ARTIFACTS_DIRECTORY,
  };

  if (options.dryRun) return { root, status: "planned", dryRun: true, moves };

  const token = randomUUID();
  const configTarget = configPath(root);
  const workflowTarget = workflowPath(root);
  const configTemporary = `${configTarget}.migrate-${token}.tmp`;
  const workflowTemporary = `${workflowTarget}.migrate-${token}.tmp`;
  const configBackup = `${configTarget}.migrate-${token}.bak`;
  const workflowBackup = `${workflowTarget}.migrate-${token}.bak`;
  const completed: MigrationMove[] = [];
  let configBackedUp = false;
  let workflowBackedUp = false;
  let configInstalled = false;
  let workflowInstalled = false;

  try {
    await mkdir(safeJoin(root, DEFAULT_ARTIFACTS_DIRECTORY), { recursive: true });
    await writeFile(configTemporary, `${JSON.stringify(migratedConfig, null, 2)}\n`, { encoding: "utf8", mode: 0o644 });
    await writeFile(workflowTemporary, `${JSON.stringify(migratedWorkflow, null, 2)}\n`, { encoding: "utf8", mode: 0o644 });
    for (const move of moves) {
      await rename(safeJoin(root, move.from), safeJoin(root, move.to));
      completed.push(move);
    }
    await rename(configTarget, configBackup);
    configBackedUp = true;
    await rename(workflowTarget, workflowBackup);
    workflowBackedUp = true;
    await rename(workflowTemporary, workflowTarget);
    workflowInstalled = true;
    await rename(configTemporary, configTarget);
    configInstalled = true;
  } catch (error) {
    if (configInstalled && await exists(configTarget)) await rm(configTarget, { force: true });
    if (workflowInstalled && await exists(workflowTarget)) await rm(workflowTarget, { force: true });
    if (configBackedUp && await exists(configBackup)) await rename(configBackup, configTarget);
    if (workflowBackedUp && await exists(workflowBackup)) await rename(workflowBackup, workflowTarget);
    for (const move of [...completed].reverse()) {
      const source = safeJoin(root, move.to);
      if (await exists(source) && !(await exists(safeJoin(root, move.from)))) {
        await rename(source, safeJoin(root, move.from));
      }
    }
    await rm(configTemporary, { force: true });
    await rm(workflowTemporary, { force: true });
    throw new Error(`Migration failed without intentionally overwriting project data: ${(error as Error).message}`);
  }

  await rm(configBackup, { force: true }).catch(() => undefined);
  await rm(workflowBackup, { force: true }).catch(() => undefined);

  return { root, status: "migrated", dryRun: false, moves };
}
