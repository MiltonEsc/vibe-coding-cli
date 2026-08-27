import { readFile } from "node:fs/promises";
import { stageArtifactPaths, validateArtifactFilePath } from "./artifacts.js";
import { STAGE_SKILLS } from "./constants.js";
import { exists } from "./paths.js";
import { STAGES, type Stage } from "./types.js";
import { loadWorkflow, verifyWorkflow } from "./workflow.js";

export interface NextBlocker {
  code: "missing" | "too_short" | "unresolved_marker" | "integrity";
  path: string;
  message: string;
  count?: number;
}

export interface NextStepReport {
  schemaVersion: 1;
  root: string;
  complete: boolean;
  currentStage?: Stage;
  artifacts: string[];
  recommendedSkill?: string;
  skillPath?: string;
  blockers: NextBlocker[];
  blockerCount: number;
  readyForReview: boolean;
  nextCommand?: string;
  approvalGuidance?: string;
  prompt?: string;
}

const MARKERS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /VIBE:REQUIRED/gi, label: "VIBE:REQUIRED" },
  { pattern: /\[TODO\]/gi, label: "TODO" },
  { pattern: /\bTBD\b/gi, label: "TBD" },
  { pattern: /REPLACE_ME/gi, label: "REPLACE_ME" },
];

function approvalGuidance(stage: Stage): string {
  return `After review, a different accountable human should run: vibe workflow approve ${stage} --approver <identity>. CI may approve only when your team explicitly configures it as the accountable gate.`;
}

export async function getNextStep(start = "."): Promise<NextStepReport> {
  const snapshot = await loadWorkflow(start);
  const verification = await verifyWorkflow(snapshot.root);
  const current = verification.stages.find((item) => item.status !== "approved" || item.integrity !== "verified");
  if (!current) {
    return {
      schemaVersion: 1,
      root: snapshot.root,
      complete: true,
      artifacts: [],
      blockers: [],
      blockerCount: 0,
      readyForReview: false,
      nextCommand: "vibe workflow verify",
    };
  }

  const stage = current.stage;
  const artifacts = stageArtifactPaths(snapshot, stage);
  const recommendedSkill = STAGE_SKILLS[stage];
  if (current.status === "approved" && current.integrity !== "verified") {
    const blockers = verification.issues
      .filter((issue) => issue.stage === stage)
      .map((issue) => ({ code: "integrity" as const, path: issue.path, message: issue.message }));
    return {
      schemaVersion: 1,
      root: snapshot.root,
      complete: false,
      currentStage: stage,
      artifacts,
      recommendedSkill,
      skillPath: `.agents/skills/${recommendedSkill}/SKILL.md`,
      blockers,
      blockerCount: blockers.length,
      readyForReview: false,
      nextCommand: `vibe workflow reopen ${stage} --reason "Describe why the ${stage} contract changed" --actor <identity>`,
      approvalGuidance: approvalGuidance(stage),
    };
  }

  const blockers: NextBlocker[] = [];
  for (const relativePath of artifacts) {
    const target = await validateArtifactFilePath(snapshot.root, relativePath);
    if (!(await exists(target))) {
      blockers.push({ code: "missing", path: relativePath, message: "Artifact is missing." });
      continue;
    }
    const content = await readFile(target, "utf8") as string;
    if (content.trim().length < 200) blockers.push({ code: "too_short", path: relativePath, message: "Artifact is too short to be meaningful." });
    for (const marker of MARKERS) {
      const count = [...content.matchAll(marker.pattern)].length;
      if (count > 0) blockers.push({
        code: "unresolved_marker",
        path: relativePath,
        message: `${count} unresolved ${marker.label} marker(s).`,
        count,
      });
    }
  }

  const blockerCount = blockers.reduce((total, blocker) => total + (blocker.count ?? 1), 0);
  const readyForReview = blockerCount === 0;
  const artifactList = artifacts.map((artifact) => `\`${artifact}\``).join(" and ");
  return {
    schemaVersion: 1,
    root: snapshot.root,
    complete: false,
    currentStage: stage,
    artifacts,
    recommendedSkill,
    skillPath: `.agents/skills/${recommendedSkill}/SKILL.md`,
    blockers,
    blockerCount,
    readyForReview,
    nextCommand: "vibe doctor",
    approvalGuidance: approvalGuidance(stage),
    prompt: readyForReview
      ? `Review ${artifactList} against AGENTS.md and the approved upstream contracts. Report gaps and do not approve the stage yourself.`
      : `Use $${recommendedSkill} to complete ${artifactList}. Read AGENTS.md and approved upstream contracts first, replace every scaffold marker with project-specific evidence, and do not approve the stage yourself.`,
  };
}
