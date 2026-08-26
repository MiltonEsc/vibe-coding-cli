declare const process: {
  argv: string[];
  cwd(): string;
  exit(code?: number): never;
  exitCode?: number;
};

declare const Buffer: {
  from(value: ArrayBuffer | Uint8Array | string): Uint8Array & { length: number; toString(encoding?: string): string; includes(value: number): boolean };
  byteLength(value: string, encoding?: string): number;
};

declare module "node:crypto" {
  export function createHash(algorithm: string): { update(data: Uint8Array | string): any; digest(encoding: "hex"): string };
  export function randomUUID(): string;
}

declare module "node:fs/promises" {
  export const access: any;
  export const appendFile: any;
  export const cp: any;
  export const lstat: any;
  export const mkdir: any;
  export const readFile: any;
  export const readdir: any;
  export const rename: any;
  export const rm: any;
  export const stat: any;
  export const writeFile: any;
}

declare module "node:child_process" {
  export const execFile: any;
}

declare module "node:util" {
  export const promisify: any;
}

declare module "node:path" {
  const path: any;
  export default path;
}

declare module "node:url" {
  export function fileURLToPath(value: string | URL): string;
}
