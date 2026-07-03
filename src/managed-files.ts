import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const AGENTS_GLOBAL_VERSION_PATH = ".agents/.global/VERSION";
export const GITHUB_BOOTSTRAP_WORKFLOW_PATH = ".github/workflows/dark-factory-bootstrap.yml";
export const CODEX_REVIEW_WORKFLOW_PATH = ".github/workflows/codex-review.yml";
export const CODEX_REVIEW_DOCKERFILE_PATH = ".github/codex-review.Dockerfile";
export const CODEX_REVIEW_SCHEMA_PATH = ".github/codex-review.schema.json";
export const CODEX_REVIEW_SCRIPT_PATH = ".github/scripts/run-codex-review.sh";

export interface ManagedFile {
  path: string;
  content: string;
}

export interface ManagedRepositoryRef {
  owner: string;
  repo: string;
}

const MANAGED_COMMON_DIRS = [".agents/.global", ".github"] as const;

export function readManagedFiles(repository?: ManagedRepositoryRef, root = resolveManagedWorkspaceRoot()): ManagedFile[] {
  const files = new Map<string, ManagedFile>();

  for (const dir of MANAGED_COMMON_DIRS) {
    for (const file of readManagedTree(root, dir)) {
      files.set(file.path, file);
    }
  }

  if (repository) {
    const overlayPrefix = `repositories/${repository.owner}/${repository.repo}/`;
    const overlayRoot = resolve(root, overlayPrefix, ".agents", ".project");

    if (existsSync(overlayRoot)) {
      for (const file of readManagedTree(root, `${overlayPrefix}.agents/.project`)) {
        files.set(file.path.slice(overlayPrefix.length), {
          ...file,
          path: file.path.slice(overlayPrefix.length)
        });
      }
    }
  }

  return [...files.values()].sort((a, b) => a.path.localeCompare(b.path));
}

export function requiredManagedFilePaths(): string[] {
  return [
    AGENTS_GLOBAL_VERSION_PATH,
    GITHUB_BOOTSTRAP_WORKFLOW_PATH,
    CODEX_REVIEW_WORKFLOW_PATH,
    CODEX_REVIEW_DOCKERFILE_PATH,
    CODEX_REVIEW_SCHEMA_PATH,
    CODEX_REVIEW_SCRIPT_PATH
  ];
}

function readManagedTree(root: string, relativeDir: string): ManagedFile[] {
  const fullDir = resolve(root, relativeDir);

  if (!existsSync(fullDir)) {
    return [];
  }

  return walk(fullDir)
    .filter((path) => statSync(path).isFile())
    .map((fullPath) => {
      const relativePath = toPosix(fullPath.slice(root.length + 1));
      return {
        path: relativePath,
        content: readFileSync(fullPath, "utf8").replace(/\r\n/g, "\n")
      };
    });
}

function walk(dir: string): string[] {
  const out: string[] = [];

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = resolve(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(fullPath));
    else out.push(fullPath);
  }

  return out;
}

function toPosix(filePath: string): string {
  return filePath.replace(/\\/g, "/");
}

function resolveManagedWorkspaceRoot(): string {
  const configured = process.env.DARK_FACTORY_WORKSPACE_ROOT?.trim();
  if (configured) {
    return resolve(configured);
  }

  const projectRoot = resolveProjectRoot();
  const siblingWorkspace = resolve(projectRoot, "..", "darkfactory-workspace", "managed-repository");
  if (existsSync(siblingWorkspace)) {
    return siblingWorkspace;
  }

  const bundledWorkspace = resolve(projectRoot, "darkfactory-workspace", "managed-repository");
  if (existsSync(bundledWorkspace)) {
    return bundledWorkspace;
  }

  return resolve(projectRoot, "managed-repository");
}

function resolveProjectRoot(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), "..");
}
