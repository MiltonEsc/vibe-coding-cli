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

export type Stack = (typeof STACKS)[number];
export type PackageManager = "pnpm" | "npm" | "yarn" | "bun";

export interface VibeConfig {
  schemaVersion: 1;
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
}

export interface WorkflowState {
  schemaVersion: 1;
  order: Stage[];
  stages: Record<Stage, WorkflowStageState>;
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
