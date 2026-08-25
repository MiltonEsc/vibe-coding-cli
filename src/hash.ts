import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

export function sha256(data: Uint8Array | string): string {
  return createHash("sha256").update(data).digest("hex");
}

export async function sha256File(target: string): Promise<string> {
  return sha256(await readFile(target));
}
