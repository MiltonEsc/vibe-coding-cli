import { execFile } from "node:child_process";
import { appendFile, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { STAGE_ARTIFACTS } from "./constants.js";
import { sha256, sha256File } from "./hash.js";
import { exists, findProjectRoot, safeJoin } from "./paths.js";
import {
  STAGES,
  type ArtifactEvidence,
  type ArtifactIntegrity,
  type Stage,
  type WorkflowHistoryEvent,
  type WorkflowIntegrityIssue,
  type WorkflowStageVerification,
  type WorkflowState,
  type WorkflowVerificationReport,
} from "./types.js";

const execFileAsync = promisify(execFile);

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

export interface ApproveStageOptions {
  start?: string;
  approver: string;
  note?: string;
  beforePersist?: () => Promise<void>;
}

interface GitContext {
  approvedCommit?: string;
  approvedBranch?: string;
  workingTreeClean: boolean;
}

interface WorkflowSnapshot {
  root: string;
  state: WorkflowState;
  ledgerSha256: string;
}

export function isStage(value: string): value is Stage {
  return STAGES.includes(value as Stage);
}

function workflowPath(root: string): string {
  return path.join(root, ".vibe", "workflow.json");
}

async function readWorkflowSnapshot(start?: string): Promise<WorkflowSnapshot> {
  const root = await findProjectRoot(start);
  const raw = await readFile(workflowPath(root), "utf8");
  return { root, state: JSON.parse(raw) as WorkflowState, ledgerSha256: sha256(raw) };
}

export async function loadWorkflow(start?: string): Promise<WorkflowSnapshot> {
  const snapshot = await readWorkflowSnapshot(start);
  if (JSON.stringify(snapshot.state.order) !== JSON.stringify(STAGES)) {
    throw new Error(`Workflow order is invalid. Expected: ${STAGES.join(" -> ")}`);
  }
  return snapshot;
}

async function writeWorkflow(root: string, state: WorkflowState): Promise<void> {
  const target = workflowPath(root);
  const temporary = `${target}.tmp`;
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, { encoding: "utf8", mode: 0o644 });
  await rename(temporary, target);
}

async function appendHistoryEvent(root: string, event: WorkflowHistoryEvent): Promise<void> {
  const target = path.join(root, ".vibe", "workflow-history.jsonl");
  await appendFile(target, `${JSON.stringify(event)}\n`, { encoding: "utf8", mode: 0o644 });
}

async function gitOutput(root: string, args: string[]): Promise<string | undefined> {
  try {
    const { stdout } = await execFileAsync("git", ["-C", root, ...args], { encoding: "utf8", windowsHide: true });
    return stdout.trim();
  } catch {
    return undefined;
  }
}

async function readGitContext(root: string): Promise<GitContext | undefined> {
  if (await gitOutput(root, ["rev-parse", "--is-inside-work-tree"]) !== "true") return undefined;
  const [approvedCommit, approvedBranch, status] = await Promise.all([
    gitOutput(root, ["rev-parse", "HEAD"]),
    gitOutput(root, ["branch", "--show-current"]),
    gitOutput(root, ["status", "--porcelain"]),
  ]);
  return {
    approvedCommit: approvedCommit || undefined,
    approvedBranch: approvedBranch || undefined,
    workingTreeClean: status === "",
  };
}

async function readArtifact(target: string): Promise<{ content: string; sha256: string; bytes: number }> {
  const bytes = await readFile(target);
  return { content: bytes.toString("utf8"), sha256: sha256(bytes), bytes: bytes.byteLength };
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
    const artifact = await readArtifact(target);
    if (artifact.content.trim().length < 200) errors.push(`${relativePath} is too short to be meaningful.`);
    for (const unresolved of UNRESOLVED_PATTERNS) {
      if (unresolved.pattern.test(artifact.content)) errors.push(`${relativePath} still contains a ${unresolved.label}.`);
    }
    evidence.push({ path: relativePath, sha256: artifact.sha256, bytes: artifact.bytes });
  }
  return { valid: errors.length === 0, errors, evidence };
}

function evidenceMatches(left: ArtifactEvidence[], right: ArtifactEvidence[]): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function reopenCommand(stage: Stage): string {
  return `vibe workflow reopen ${stage} --reason "Describe why the ${stage} contract changed" --actor <identity>`;
}

function invalidStage(stage: Stage): WorkflowStageVerification {
  return { stage, status: "invalid", integrity: "invalid", artifacts: [] };
}

export async function verifyWorkflow(start?: string): Promise<WorkflowVerificationReport> {
  const root = await findProjectRoot(start);
  const issues: WorkflowIntegrityIssue[] = [];
  const stages: WorkflowStageVerification[] = [];
  let state: WorkflowState;

  try {
    const raw = await readFile(workflowPath(root), "utf8");
    state = JSON.parse(raw) as WorkflowState;
  } catch (error) {
    issues.push({ code: "ledger_invalid", path: ".vibe/workflow.json", message: `Cannot read workflow ledger: ${(error as Error).message}` });
    return { schemaVersion: 1, root, passed: false, issues, stages: STAGES.map(invalidStage) };
  }

  if (state.schemaVersion !== 1 || JSON.stringify(state.order) !== JSON.stringify(STAGES)) {
    issues.push({
      code: "ledger_invalid",
      path: ".vibe/workflow.json",
      message: `Workflow ledger schema or order is invalid. Expected: ${STAGES.join(" -> ")}`,
    });
  }

  let seenPending = false;
  for (const stage of STAGES) {
    const value = state.stages?.[stage];
    if (!value || (value.status !== "pending" && value.status !== "approved")) {
      issues.push({ code: "ledger_invalid", stage, path: ".vibe/workflow.json", message: `Stage ${stage} has an invalid state.` });
      stages.push(invalidStage(stage));
      continue;
    }
    if (value.status === "pending") {
      seenPending = true;
      const hasStaleApproval = Boolean(value.approvedAt || value.approvedBy || value.evidence);
      if (hasStaleApproval) {
        issues.push({
          code: "ledger_invalid",
          stage,
          path: ".vibe/workflow.json",
          message: `Pending stage ${stage} contains stale approval evidence.`,
        });
      }
      stages.push({ stage, status: "pending", integrity: hasStaleApproval ? "invalid" : null, artifacts: [] });
      continue;
    }
    if (seenPending) {
      issues.push({
        code: "stage_order_invalid",
        stage,
        path: ".vibe/workflow.json",
        message: `Stage ${stage} is approved after a pending prerequisite.`,
      });
    }

    const artifacts: ArtifactIntegrity[] = [];
    const evidence = Array.isArray(value.evidence) ? value.evidence : [];
    const expectedPaths = STAGE_ARTIFACTS[stage];
    const evidencePaths = evidence.map((item) => item?.path);
    const approvalMetadataInvalid = typeof value.approvedBy !== "string" || !value.approvedBy.trim()
      || typeof value.approvedAt !== "string" || !value.approvedAt.trim();
    const evidenceShapeInvalid = approvalMetadataInvalid
      || evidence.length !== expectedPaths.length
      || new Set(evidencePaths).size !== evidencePaths.length
      || evidencePaths.some((item) => !expectedPaths.includes(item));
    if (evidenceShapeInvalid) {
      issues.push({
        code: "approval_evidence_missing",
        stage,
        path: ".vibe/workflow.json",
        message: `Approval metadata or evidence for ${stage} does not match its required artifacts. Reopen and review the stage.`,
        approvedBy: value.approvedBy,
        recommendedCommand: reopenCommand(stage),
      });
    }

    let integrity: WorkflowStageVerification["integrity"] = evidenceShapeInvalid ? "invalid" : "verified";
    for (const relativePath of expectedPaths) {
      const approved = evidence.find((item) => item?.path === relativePath);
      if (!approved || typeof approved.sha256 !== "string" || typeof approved.bytes !== "number") {
        integrity = "invalid";
        artifacts.push({ path: relativePath, status: "invalid" });
        continue;
      }
      const target = safeJoin(root, relativePath);
      if (!(await exists(target))) {
        integrity = "drifted";
        artifacts.push({ path: relativePath, status: "missing", approvedSha256: approved.sha256, approvedBytes: approved.bytes });
        issues.push({
          code: "approved_artifact_missing",
          stage,
          path: relativePath,
          message: `${relativePath} was removed after ${stage} was approved by ${value.approvedBy ?? "an accountable reviewer"}.`,
          approvedBy: value.approvedBy,
          approvedSha256: approved.sha256,
          recommendedCommand: reopenCommand(stage),
        });
        continue;
      }
      let current: Awaited<ReturnType<typeof readArtifact>>;
      try {
        current = await readArtifact(target);
      } catch (error) {
        integrity = "drifted";
        artifacts.push({ path: relativePath, status: "missing", approvedSha256: approved.sha256, approvedBytes: approved.bytes });
        issues.push({
          code: "approved_artifact_missing",
          stage,
          path: relativePath,
          message: `${relativePath} cannot be read after ${stage} was approved: ${(error as Error).message}`,
          approvedBy: value.approvedBy,
          approvedSha256: approved.sha256,
          recommendedCommand: reopenCommand(stage),
        });
        continue;
      }
      const drifted = current.sha256 !== approved.sha256 || current.bytes !== approved.bytes;
      if (drifted) integrity = "drifted";
      artifacts.push({
        path: relativePath,
        status: drifted ? "drifted" : "verified",
        approvedSha256: approved.sha256,
        currentSha256: current.sha256,
        approvedBytes: approved.bytes,
        currentBytes: current.bytes,
      });
      if (drifted) {
        issues.push({
          code: "approval_drift",
          stage,
          path: relativePath,
          message: `${relativePath} changed after ${stage} was approved by ${value.approvedBy ?? "an accountable reviewer"}. The approval no longer represents the current contract.`,
          approvedBy: value.approvedBy,
          approvedSha256: approved.sha256,
          currentSha256: current.sha256,
          recommendedCommand: reopenCommand(stage),
        });
      }
    }
    stages.push({
      stage,
      status: "approved",
      integrity,
      approvedBy: value.approvedBy,
      approvedAt: value.approvedAt,
      artifacts,
    });
  }

  return { schemaVersion: 1, root, passed: issues.length === 0, issues, stages };
}

export async function approveStage(stage: Stage, options: ApproveStageOptions): Promise<WorkflowState> {
  const approver = options.approver.trim();
  if (!approver) throw new Error("An accountable approver identity is required.");

  const snapshot = await loadWorkflow(options.start);
  const { root, state } = snapshot;
  const index = STAGES.indexOf(stage);
  const verification = await verifyWorkflow(root);
  const blocked = verification.stages
    .slice(0, index)
    .filter((candidate) => candidate.status !== "approved" || candidate.integrity !== "verified")
    .map((candidate) => candidate.stage);
  if (blocked.length > 0) {
    throw new Error(`Cannot approve ${stage}; prerequisite stages are pending, invalid, or drifted: ${blocked.join(", ")}`);
  }
  if (state.stages[stage].status === "approved") {
    throw new Error(`${stage} is already approved. Reopen it first to replace the approval evidence.`);
  }

  const validation = await validateStageArtifacts(root, stage);
  if (!validation.valid) throw new Error(`Cannot approve ${stage}:\n- ${validation.errors.join("\n- ")}`);
  const priorHistory = await readWorkflowHistory(root);
  const previousApproval = [...priorHistory.events].reverse().find((event) =>
    event.stage === stage && (event.type === "stage_approved" || event.type === "approval_replaced")
  );
  await options.beforePersist?.();

  const finalValidation = await validateStageArtifacts(root, stage);
  if (!finalValidation.valid || !evidenceMatches(validation.evidence, finalValidation.evidence)) {
    throw new Error(`Cannot approve ${stage}; its artifacts changed during approval. Review the current files and approve again.`);
  }
  if (await sha256File(workflowPath(root)) !== snapshot.ledgerSha256) {
    throw new Error("Cannot approve because the workflow ledger changed concurrently. Reload workflow status and try again.");
  }
  const finalWorkflowVerification = await verifyWorkflow(root);
  const finalBlocked = finalWorkflowVerification.stages
    .slice(0, index)
    .filter((candidate) => candidate.status !== "approved" || candidate.integrity !== "verified")
    .map((candidate) => candidate.stage);
  if (finalBlocked.length > 0) {
    throw new Error(`Cannot approve ${stage}; prerequisite contracts changed during approval: ${finalBlocked.join(", ")}`);
  }
  const gitContext = await readGitContext(root);

  const approvedAt = new Date().toISOString();
  state.stages[stage] = {
    status: "approved",
    approvedAt,
    approvedBy: approver,
    note: options.note?.trim() || undefined,
    evidence: finalValidation.evidence,
    ...gitContext,
  };
  await writeWorkflow(root, state);
  await appendHistoryEvent(root, {
    type: previousApproval ? "approval_replaced" : "stage_approved",
    stage,
    actor: approver,
    at: approvedAt,
    note: options.note?.trim() || undefined,
    commit: gitContext?.approvedCommit,
    branch: gitContext?.approvedBranch,
    workingTreeClean: gitContext?.workingTreeClean,
    artifacts: finalValidation.evidence,
    previousApprovalAt: previousApproval?.at,
    previousApprovalActor: previousApproval?.actor,
  });
  return state;
}

export async function reopenStage(
  stage: Stage,
  options: { start?: string; reason: string; actor?: string },
): Promise<{ state: WorkflowState; reopened: Stage[] }> {
  const reason = options.reason.trim();
  if (!reason) throw new Error("A reason is required to reopen a stage.");
  const actor = options.actor?.trim() || "unspecified";
  const { root, state } = await loadWorkflow(options.start);
  const verification = await verifyWorkflow(root);
  const drifted = verification.stages.filter((item) => item.integrity === "drifted").map((item) => item.stage);
  const index = STAGES.indexOf(stage);
  const reopened = STAGES.slice(index).filter((candidate) => state.stages[candidate].status === "approved");
  for (const candidate of STAGES.slice(index)) state.stages[candidate] = { status: "pending" };

  const gitContext = await readGitContext(root);
  const at = new Date().toISOString();
  await writeWorkflow(root, state);
  for (const driftedStage of verification.stages.filter((item) => item.integrity === "drifted")) {
    await appendHistoryEvent(root, {
      type: "approval_drift_detected",
      stage: driftedStage.stage,
      actor,
      at,
      artifacts: driftedStage.artifacts.filter((artifact) => artifact.status !== "verified"),
    });
  }
  await appendHistoryEvent(root, {
    type: "stage_reopened",
    stage,
    actor,
    reason,
    invalidated: reopened,
    driftedBeforeReopen: drifted,
    at,
    commit: gitContext?.approvedCommit,
    branch: gitContext?.approvedBranch,
  });
  return { state, reopened };
}

export async function readWorkflowHistory(start?: string): Promise<{ root: string; events: WorkflowHistoryEvent[] }> {
  const root = await findProjectRoot(start);
  const target = path.join(root, ".vibe", "workflow-history.jsonl");
  if (!(await exists(target))) return { root, events: [] };
  const raw = await readFile(target, "utf8") as string;
  const lines: string[] = raw.split(/\r?\n/).filter(Boolean);
  const events = lines.map((line, index) => {
    try {
      return JSON.parse(line) as WorkflowHistoryEvent;
    } catch {
      throw new Error(`Workflow history contains invalid JSON at line ${index + 1}.`);
    }
  });
  return { root, events };
}

export function workflowRows(state: WorkflowState, verification?: WorkflowVerificationReport): Array<Record<string, string>> {
  const integrity = new Map(verification?.stages.map((item) => [item.stage, item.integrity ?? "-"]));
  return STAGES.map((stage, index) => {
    const value = state.stages[stage];
    return {
      stage,
      status: value.status,
      integrity: integrity.get(stage) ?? (value.status === "approved" ? "unknown" : "-"),
      prerequisite: index === 0 ? "-" : STAGES[index - 1],
      approvedBy: value.approvedBy ?? "-",
      approvedAt: value.approvedAt ?? "-",
    };
  });
}
