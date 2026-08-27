export const STAGES = [
  "requirements",
  "architecture",
  "database",
  "backend",
  "frontend",
  "testing",
  "review",
  "deployment",
] as const;

export type Stage = (typeof STAGES)[number];

export const STACKS = [
  "nextjs",
  "react",
  "fastapi",
  "nestjs",
  "supabase",
  "flutter",
  "github-actions",
] as const;

export type KnownStack = (typeof STACKS)[number];
export type Stack = string;

export function isKnownStack(value: string): value is KnownStack {
  return (STACKS as readonly string[]).includes(value);
}
export type PackageManager = "pnpm" | "npm" | "yarn" | "bun";

interface VibeConfigBase {
  projectName: string;
  createdAt: string;
  packageManager: PackageManager;
  stacks: Stack[];
  skillsDirectory: ".agents/skills";
  workflow: {
    order: Stage[];
    requireExplicitApproval: true;
  };
  security: {
    remoteSkillsOptIn: true;
    requireChecksums: true;
    allowExecutableFiles: false;
  };
}

export interface VibeConfigV1 extends VibeConfigBase {
  schemaVersion: 1;
  artifactsDirectory?: never;
}

export interface VibeConfigV2 extends VibeConfigBase {
  schemaVersion: 2;
  artifactsDirectory: string;
}

export type VibeConfig = VibeConfigV1 | VibeConfigV2;

export interface ArtifactEvidence {
  path: string;
  sha256: string;
  bytes: number;
}

export interface WorkflowStageState {
  status: "pending" | "approved";
  approvedAt?: string;
  approvedBy?: string;
  note?: string;
  evidence?: ArtifactEvidence[];
  approvedCommit?: string;
  approvedBranch?: string;
  workingTreeClean?: boolean;
}

export interface WorkflowState {
  schemaVersion: 1;
  order: Stage[];
  stages: Record<Stage, WorkflowStageState>;
}

export type WorkflowIntegrity = "verified" | "drifted" | "invalid" | null;

export interface ArtifactIntegrity {
  path: string;
  status: "verified" | "drifted" | "missing" | "invalid";
  approvedSha256?: string;
  currentSha256?: string;
  approvedBytes?: number;
  currentBytes?: number;
}

export interface WorkflowIntegrityIssue {
  code: "ledger_invalid" | "stage_order_invalid" | "approval_evidence_missing" | "approved_artifact_missing" | "approval_drift";
  stage?: Stage;
  path: string;
  message: string;
  approvedBy?: string;
  approvedSha256?: string;
  currentSha256?: string;
  recommendedCommand?: string;
}

export interface WorkflowStageVerification {
  stage: Stage;
  status: "pending" | "approved" | "invalid";
  integrity: WorkflowIntegrity;
  approvedBy?: string;
  approvedAt?: string;
  artifacts: ArtifactIntegrity[];
}

export interface WorkflowVerificationReport {
  schemaVersion: 1;
  root: string;
  passed: boolean;
  progress: {
    approved: number;
    total: number;
    complete: boolean;
  };
  issues: WorkflowIntegrityIssue[];
  stages: WorkflowStageVerification[];
}

export interface WorkflowHistoryEvent {
  type: string;
  stage?: Stage;
  actor?: string;
  at?: string;
  [key: string]: unknown;
}

export interface RemoteCatalogFile {
  path: string;
  url: string;
  sha256: string;
  maxBytes: number;
}

export interface RemoteCatalogEntry {
  id: string;
  name: string;
  displayName: string;
  description: string;
  publisher: string;
  repository: string;
  revisionPolicy: string;
  reviewedAt: string;
  files: RemoteCatalogFile[];
}

export interface RemoteCatalog {
  schemaVersion: 1;
  policy: {
    allowedHosts: string[];
    maxSkillBytes: number;
    executableFilesAllowed: false;
  };
  entries: RemoteCatalogEntry[];
}

export interface AuditFinding {
  severity: "error" | "warning" | "info";
  path: string;
  message: string;
}

export interface AuditReport {
  skillName: string;
  files: number;
  bytes: number;
  findings: AuditFinding[];
  passed: boolean;
}
