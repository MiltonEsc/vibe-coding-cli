import { randomUUID } from "node:crypto";
import { cp, mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { auditSkillDirectory } from "./security.js";
import { sha256 } from "./hash.js";
import { BUNDLED_SKILLS_ROOT, CATALOG_PATH, exists, findProjectRoot, readJson, safeJoin } from "./paths.js";
import type { AuditReport, RemoteCatalog, RemoteCatalogEntry } from "./types.js";

interface SkillsLock {
  schemaVersion: 1;
  installed: Array<{
    name: string;
    id: string;
    publisher: string;
    repository: string;
    reviewedAt: string;
    installedAt: string;
    files: Array<{ path: string; sha256: string }>;
  }>;
}

export async function loadCatalog(): Promise<RemoteCatalog> {
  const catalog = await readJson<RemoteCatalog>(CATALOG_PATH);
  if (catalog.schemaVersion !== 1 || catalog.policy.executableFilesAllowed !== false) {
    throw new Error("Unsupported or unsafe remote Skill catalog policy.");
  }
  return catalog;
}

export async function listBundledSkills(): Promise<string[]> {
  const entries = await readdir(BUNDLED_SKILLS_ROOT, { withFileTypes: true });
  return entries.filter((entry: any) => entry.isDirectory()).map((entry: any) => entry.name).sort();
}

export async function listInstalledSkills(start?: string): Promise<Array<{ name: string; audit: AuditReport }>> {
  const root = await findProjectRoot(start);
  const skillsRoot = path.join(root, ".agents", "skills");
  if (!(await exists(skillsRoot))) return [];
  const entries = await readdir(skillsRoot, { withFileTypes: true });
  const results: Array<{ name: string; audit: AuditReport }> = [];
  for (const entry of entries.filter((item: any) => item.isDirectory()).sort((a: any, b: any) => a.name.localeCompare(b.name))) {
    results.push({ name: entry.name, audit: await auditSkillDirectory(path.join(skillsRoot, entry.name)) });
  }
  return results;
}

export async function addBundledSkill(name: string, options: { start?: string; force?: boolean }): Promise<string> {
  const bundled = await listBundledSkills();
  if (!bundled.includes(name)) {
    throw new Error(`Unknown bundled Skill: ${name}. Available: ${bundled.join(", ")}`);
  }
  const root = await findProjectRoot(options.start);
  const source = safeJoin(BUNDLED_SKILLS_ROOT, name);
  const destination = safeJoin(path.join(root, ".agents", "skills"), name);
  if ((await exists(destination)) && !options.force) {
    throw new Error(`Skill already exists: ${name}. Use --force to replace it with the bundled version.`);
  }
  if (await exists(destination)) {
    await rm(destination, { recursive: true, force: true });
  }
  await mkdir(path.dirname(destination), { recursive: true });
  await cp(source, destination, { recursive: true, force: false, errorOnExist: true, verbatimSymlinks: false });
  const report = await auditSkillDirectory(destination);
  if (!report.passed) {
    await rm(destination, { recursive: true, force: true });
    throw new Error(`Bundled Skill failed audit: ${report.findings.map((finding) => finding.message).join("; ")}`);
  }
  return destination;
}

export async function auditInstalledSkills(start?: string): Promise<AuditReport[]> {
  return (await listInstalledSkills(start)).map((item) => item.audit);
}

function assertAllowedUrl(rawUrl: string, allowedHosts: string[]): URL {
  const url = new URL(rawUrl);
  if (url.protocol !== "https:") {
    throw new Error(`Only HTTPS is allowed for remote Skills: ${rawUrl}`);
  }
  if (!allowedHosts.includes(url.hostname)) {
    throw new Error(`Remote Skill host is not allowlisted: ${url.hostname}`);
  }
  if (url.username || url.password) {
    throw new Error("Credentials in remote Skill URLs are forbidden.");
  }
  return url;
}

async function downloadCatalogEntry(entry: RemoteCatalogEntry, catalog: RemoteCatalog, destination: string): Promise<void> {
  let total = 0;
  for (const file of entry.files) {
    const sourceUrl = assertAllowedUrl(file.url, catalog.policy.allowedHosts);
    const target = safeJoin(destination, file.path);
    const response = await fetch(sourceUrl, {
      redirect: "follow",
      headers: { "user-agent": "vibe-cli/0.3.0" },
    });
    if (!response.ok) {
      throw new Error(`Failed to download ${entry.id}/${file.path}: HTTP ${response.status}`);
    }
    assertAllowedUrl(response.url, catalog.policy.allowedHosts);
    const declaredLength = Number(response.headers.get("content-length") ?? 0);
    if (declaredLength > file.maxBytes) {
      throw new Error(`${entry.id}/${file.path} exceeds the per-file size limit.`);
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > file.maxBytes) {
      throw new Error(`${entry.id}/${file.path} exceeds the per-file size limit.`);
    }
    total += bytes.length;
    if (total > catalog.policy.maxSkillBytes) {
      throw new Error(`${entry.id} exceeds the catalog Skill size limit.`);
    }
    const actualHash = sha256(bytes);
    if (actualHash !== file.sha256) {
      throw new Error(`Checksum mismatch for ${entry.id}/${file.path}. Expected ${file.sha256}, received ${actualHash}. Installation stopped.`);
    }
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, bytes, { mode: 0o644 });
  }
}

async function updateLock(root: string, entry: RemoteCatalogEntry): Promise<void> {
  const lockPath = path.join(root, ".vibe", "skills.lock.json");
  let lock: SkillsLock = { schemaVersion: 1, installed: [] };
  if (await exists(lockPath)) {
    lock = await readJson<SkillsLock>(lockPath);
  }
  const installedAt = new Date().toISOString();
  const record = {
    name: entry.name,
    id: entry.id,
    publisher: entry.publisher,
    repository: entry.repository,
    reviewedAt: entry.reviewedAt,
    installedAt,
    files: entry.files.map((file) => ({ path: file.path, sha256: file.sha256 })),
  };
  lock.installed = [...lock.installed.filter((item) => item.name !== entry.name), record];
  await writeFile(lockPath, `${JSON.stringify(lock, null, 2)}\n`, { encoding: "utf8", mode: 0o644 });
  const provenancePath = path.join(root, ".vibe", "provenance", `${entry.name}-${installedAt.replace(/[:.]/g, "-")}.json`);
  await mkdir(path.dirname(provenancePath), { recursive: true });
  await writeFile(provenancePath, `${JSON.stringify(record, null, 2)}\n`, { encoding: "utf8", mode: 0o644 });
}

export async function installRemoteSkill(
  id: string,
  options: { start?: string; force?: boolean },
): Promise<{ destination: string; audit: AuditReport; entry: RemoteCatalogEntry }> {
  const catalog = await loadCatalog();
  const entry = catalog.entries.find((candidate) => candidate.id === id);
  if (!entry) {
    throw new Error(`Unknown catalog entry: ${id}. Run \"vibe skills catalog\".`);
  }
  const root = await findProjectRoot(options.start);
  const skillsRoot = path.join(root, ".agents", "skills");
  const destination = safeJoin(skillsRoot, entry.name);
  if ((await exists(destination)) && !options.force) {
    throw new Error(`Skill already exists: ${entry.name}. Use --force to replace it after review.`);
  }

  const temporaryRoot = path.join(root, ".vibe", "tmp", `skill-${randomUUID()}`);
  const temporarySkill = path.join(temporaryRoot, entry.name);
  await mkdir(temporarySkill, { recursive: true });
  try {
    await downloadCatalogEntry(entry, catalog, temporarySkill);
    const audit = await auditSkillDirectory(temporarySkill);
    if (!audit.passed) {
      throw new Error(`Remote Skill audit failed:\n${audit.findings.map((finding) => `- ${finding.path}: ${finding.message}`).join("\n")}`);
    }
    await mkdir(path.dirname(destination), { recursive: true });
    const replacementBackup = `${destination}.vibe-backup-${randomUUID()}`;
    const replacing = await exists(destination);
    let installed = false;
    if (replacing) {
      await rename(destination, replacementBackup);
    }
    try {
      await rename(temporarySkill, destination);
      installed = true;
      await updateLock(root, entry);
      if (replacing) {
        await rm(replacementBackup, { recursive: true, force: true });
      }
      return { destination, audit, entry };
    } catch (error) {
      if (installed) {
        await rm(destination, { recursive: true, force: true });
      }
      if (replacing && await exists(replacementBackup)) {
        await rename(replacementBackup, destination);
      }
      throw error;
    }
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

export async function readInstalledLock(start?: string): Promise<SkillsLock> {
  const root = await findProjectRoot(start);
  const target = path.join(root, ".vibe", "skills.lock.json");
  if (!(await exists(target))) return { schemaVersion: 1, installed: [] };
  return JSON.parse(await readFile(target, "utf8")) as SkillsLock;
}
