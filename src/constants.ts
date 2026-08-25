import type { KnownStack, Stack, Stage } from "./types.js";

export const DEFAULT_STACKS: Stack[] = [
  "nextjs",
  "fastapi",
  "supabase",
  "github-actions",
];

export const STAGE_SKILLS: Record<Stage, string> = {
  requirements: "requirements-analyst",
  architecture: "software-architect",
  database: "database-designer",
  backend: "backend-builder",
  frontend: "frontend-builder",
  testing: "test-engineer",
  review: "code-reviewer",
  deployment: "deployment-engineer",
};

export const STACK_SKILLS: Record<KnownStack, string> = {
  nextjs: "nextjs-app-builder",
  react: "react-component-builder",
  fastapi: "fastapi-api-builder",
  nestjs: "nestjs-backend-builder",
  supabase: "supabase-database-builder",
  flutter: "flutter-mobile-builder",
  "github-actions": "github-actions-deployer",
};

export const STAGE_ARTIFACTS: Record<Stage, string[]> = {
  requirements: ["requirements.md"],
  architecture: ["architecture.md"],
  database: ["database.md"],
  backend: ["backend.md"],
  frontend: ["design.md", "frontend.md"],
  testing: ["testing.md"],
  review: ["review.md"],
  deployment: ["deployment.md"],
};

export const REQUIRED_SKILL_HEADINGS = [
  "expected input",
  "required result",
  "project conventions",
  "commands",
  "validation criteria",
];

export const MAX_LOCAL_SKILL_BYTES = 1024 * 1024;
export const MAX_LOCAL_SKILL_FILES = 100;
