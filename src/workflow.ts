import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { STAGE_ARTIFACTS } from "./constants.js";
import { sha256File } from "./hash.js";
import { exists, findProjectRoot, readJson, safeJoin } from "./paths.js";
import { STAGES, type ArtifactEvidence, type Stage, type WorkflowState } from "./types.js";

const UNRESOLVED_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /VIBE:REQUIRED/i, label: "VIBE:REQUIRED marker" },
  { pattern: /\[TODO\]/i, label: "TODO marker" },
  { pattern: /\bTBD\b/i, label: "TBD marker" },
  { pattern: /REPLACE_ME/i, label: "REPLACE_ME marker" },
];

export interface ArtifactValidation {
  valid: boolean;
  errors: string[];
  evidence: ArtifactEvidence[];
}

export function isStage(value: string): value is Stage {
  return STAGES.includes(value as Stage);
}

export async function loadWorkflow(start?: string): Promise<{ root: string; state: WorkflowState }> {
  const root = await findProjectRoot(start);
  const state = await readJson<WorkflowState>(path.join(root, ".vibe", "workflow.json"));
  if (JSON.stringify(state.order) !== JSON.stringify(STAGES)) {
    throw new Error(`Workflow order is invalid. Expected: ${STAGES.join(" -> ")}`);
  }
  return { root, state };
}

async function writeWorkflow(root: string, state: WorkflowState): Promise<void> {
  const target = path.join(root, ".vibe", "workflow.json");
  const temporary = `${target}.tmp`;
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, { encoding: "utf8", mode: 0o644 });
  await rename(temporary, target);
}

export async function validateStageArtifacts(root: string, stage: Stage): Promise<ArtifactValidation> {
  const errors: string[] = [];
  const evidence: ArtifactEvidence[] = [];
  for (const relativePath of STAGE_ARTIFACTS[stage]) {
    const target = safeJoin(root, relativePath);
    if (!(await exists(target))) {
      errors.push(`${relativePath} is missing.`);
      continue;
    }
    const content = await readFile(target, "utf8");
    if (content.trim().length < 200) {
      errors.push(`${relativePath} is too short to be meaningful.`);
    }
    for (const unresolved of UNRESOLVED_PATTERNS) {
      if (unresolved.pattern.test(content)) {
        errors.push(`${relativePath} still contains a ${unresolved.label}.`);
      }
    }
    evidence.push({
      path: relativePath,
      sha256: await sha256File(target),
      bytes: Buffer.byteLength(content, "utf8"),
    });
  }
  return { valid: errors.length === 0, errors, evidence };
}

export async function approveStage(
  stage: Stage,
  options: { start?: string; approver: string; note?: string },
): Promise<WorkflowState> {
  const approver = options.approver.trim();
  if (!approver) {
    throw new Error("An accountable approver identity is required.");
  }
  const { root, state } = await loadWorkflow(options.start);
  const index = STAGES.indexOf(stage);
  const previous = STAGES.slice(0, index);
  const blocked = previous.filter((candidate) => state.stages[candidate].status !== "approved");
  if (blocked.length > 0) {
    throw new Error(`Cannot approve ${stage}; prerequisite stages are pending: ${blocked.join(", ")}`);
  }
  if (state.stages[stage].status === "approved") {
    throw new Error(`${stage} is already approved. Reopen it first to replace the approval evidence.`);
  }
  const validation = await validateStageArtifacts(root, stage);
  if (!validation.valid) {
    throw new Error(`Cannot approve ${stage}:\n- ${validation.errors.join("\n- ")}`);
  }
  state.stages[stage] = {
    status: "approved",
    approvedAt: new Date().toISOString(),
    approvedBy: approver,
    note: options.note?.trim() || undefined,
    evidence: validation.evidence,
  };
  await writeWorkflow(root, state);
  return state;
}

export async function reopenStage(
  stage: Stage,
  options: { start?: string; reason: string },
): Promise<{ state: WorkflowState; reopened: Stage[] }> {
  const reason = options.reason.trim();
  if (!reason) {
    throw new Error("A reason is required to reopen a stage.");
  }
  const { root, state } = await loadWorkflow(options.start);
  const index = STAGES.indexOf(stage);
  const reopened = STAGES.slice(index).filter((candidate) => state.stages[candidate].status === "approved");
  for (const candidate of STAGES.slice(index)) {
    state.stages[candidate] = { status: "pending" };
  }
  const logPath = path.join(root, ".vibe", "workflow-history.jsonl");
  const event = {
    type: "reopen",
    stage,
    invalidated: reopened,
    reason,
    at: new Date().toISOString(),
  };
  const prior = (await exists(logPath)) ? await readFile(logPath, "utf8") : "";
  await writeFile(logPath, `${prior}${JSON.stringify(event)}\n`, { encoding: "utf8", mode: 0o644 });
  await writeWorkflow(root, state);
  return { state, reopened };
}

export function workflowRows(state: WorkflowState): Array<Record<string, string>> {
  return STAGES.map((stage, index) => {
    const value = state.stages[stage];
    const prerequisite = index === 0 ? "-" : STAGES[index - 1];
    return {
      stage,
      status: value.status,
      prerequisite,
      approvedBy: value.approvedBy ?? "-",
      approvedAt: value.approvedAt ?? "-",
    };
  });
}
