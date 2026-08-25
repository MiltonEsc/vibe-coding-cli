import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const BUNDLED_SKILLS_ROOT = path.join(PACKAGE_ROOT, "templates", "skills");
export const CATALOG_PATH = path.join(PACKAGE_ROOT, "registry", "skills.json");

export async function exists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

export async function findProjectRoot(start = process.cwd()): Promise<string> {
  let current = path.resolve(start);
  while (true) {
    if (await exists(path.join(current, ".vibe", "config.json"))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      throw new Error(`No Vibe project found from ${start}. Run \"vibe init\" first.`);
    }
    current = parent;
  }
}

export async function readJson<T>(target: string): Promise<T> {
  const raw = await readFile(target, "utf8");
  return JSON.parse(raw) as T;
}

export function safeJoin(root: string, relativePath: string): string {
  if (path.isAbsolute(relativePath)) {
    throw new Error(`Absolute paths are not allowed: ${relativePath}`);
  }
  const normalized = path.normalize(relativePath);
  if (normalized === ".." || normalized.startsWith(`..${path.sep}`)) {
    throw new Error(`Path traversal is not allowed: ${relativePath}`);
  }
  const target = path.resolve(root, normalized);
  const relative = path.relative(path.resolve(root), target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Path escapes root: ${relativePath}`);
  }
  return target;
}
