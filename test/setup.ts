import { spawn, execSync, type ChildProcess } from "child_process";
import { createHash } from "crypto";
import { readFileSync, writeFileSync, existsSync, copyFileSync, mkdirSync, readdirSync, statSync } from "fs";
import { join, resolve } from "path";

const ROOT_DIR = resolve(import.meta.dirname, "..");
const TEST_DIR = resolve(import.meta.dirname);
const CACHE_DIR = join(TEST_DIR, ".cache");

const MPA_DIR = join(TEST_DIR, "mpa");
const SPA_DIR = join(TEST_DIR, "spa");

const MPA_PORT = 4321;
const SPA_PORT = 5173;

const SERVER_STARTUP_TIMEOUT = 30_000; // 30 seconds

let mpaProcess: ChildProcess | null = null;
let spaProcess: ChildProcess | null = null;

/**
 * Recursively get all files in a directory
 */
function getAllFiles(dir: string, files: string[] = []): string[] {
  if (!existsSync(dir)) return files;

  const entries = readdirSync(dir);
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      // Skip node_modules and build output directories
      if (entry !== "node_modules" && entry !== "dist" && entry !== ".astro" && entry !== ".svelte-kit" && entry !== "build") {
        getAllFiles(fullPath, files);
      }
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

/**
 * Compute a hash of all source files in a directory
 */
function computeSourceHash(srcDir: string): string {
  const files = getAllFiles(srcDir).sort();
  const hash = createHash("sha256");

  for (const file of files) {
    const content = readFileSync(file);
    hash.update(file);
    hash.update(content);
  }

  return hash.digest("hex");
}

/**
 * Check if app needs to be rebuilt based on source hash
 */
function needsRebuild(appName: string, srcDir: string): boolean {
  const forceBuild = process.env.FORCE_BUILD === "1";
  if (forceBuild) {
    console.log(`[${appName}] Force rebuild requested`);
    return true;
  }

  const hashFile = join(CACHE_DIR, `${appName}.hash`);
  const currentHash = computeSourceHash(srcDir);

  if (!existsSync(hashFile)) {
    console.log(`[${appName}] No previous build hash found, will build`);
    return true;
  }

  const previousHash = readFileSync(hashFile, "utf-8").trim();
  if (currentHash !== previousHash) {
    console.log(`[${appName}] Source files changed, will rebuild`);
    return true;
  }

  console.log(`[${appName}] No changes detected, skipping build`);
  return false;
}

/**
 * Save the source hash after a successful build
 */
function saveSourceHash(appName: string, srcDir: string): void {
  const hashFile = join(CACHE_DIR, `${appName}.hash`);
  const hash = computeSourceHash(srcDir);
  writeFileSync(hashFile, hash);
}

/**
 * Copy tracker script to app static directories
 */
function copyTracker(): void {
  const trackerSrc = join(ROOT_DIR, "build", "stonks.js");

  if (!existsSync(trackerSrc)) {
    console.warn("[tracker] build/stonks.js not found, skipping copy");
    return;
  }

  const mpaDest = join(MPA_DIR, "public", "stonks.js");
  const spaDest = join(SPA_DIR, "static", "stonks.js");

  // Ensure directories exist
  mkdirSync(join(MPA_DIR, "public"), { recursive: true });
  mkdirSync(join(SPA_DIR, "static"), { recursive: true });

  copyFileSync(trackerSrc, mpaDest);
  copyFileSync(trackerSrc, spaDest);

  console.log("[tracker] Copied stonks.js to MPA and SPA static directories");
}

/**
 * Run a command in a directory and wait for it to complete
 */
function runCommand(command: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      cwd,
      stdio: "inherit",
      shell: true,
    });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command "${command} ${args.join(" ")}" failed with code ${code}`));
      }
    });

    proc.on("error", reject);
  });
}

/**
 * Build an app if needed
 */
async function buildAppIfNeeded(appName: string, appDir: string): Promise<void> {
  const srcDir = join(appDir, "src");

  if (!needsRebuild(appName, srcDir)) {
    // Check if dist exists even if hash matches
    const distDir = appName === "mpa" ? join(appDir, "dist") : join(appDir, "build");
    if (!existsSync(distDir)) {
      console.log(`[${appName}] Build output missing, will build`);
    } else {
      return;
    }
  }

  console.log(`[${appName}] Building...`);
  await runCommand("pnpm", ["build"], appDir);
  saveSourceHash(appName, srcDir);
  console.log(`[${appName}] Build complete`);
}

/**
 * Wait for a server to be ready
 */
async function waitForServer(url: string, timeout: number): Promise<void> {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    try {
      const response = await fetch(url);
      if (response.ok || response.status === 404) {
        // 404 is fine, it means server is responding
        return;
      }
    } catch {
      // Server not ready yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  throw new Error(`Server at ${url} did not start within ${timeout}ms`);
}

/**
 * Start a preview server
 */
function startPreviewServer(appName: string, appDir: string, port: number): ChildProcess {
  console.log(`[${appName}] Starting preview server on port ${port}...`);

  const proc = spawn("pnpm", ["preview"], {
    cwd: appDir,
    stdio: "pipe",
    shell: true,
  });

  proc.stdout?.on("data", (data) => {
    const output = data.toString().trim();
    if (output) {
      console.log(`[${appName}] ${output}`);
    }
  });

  proc.stderr?.on("data", (data) => {
    const output = data.toString().trim();
    if (output) {
      console.error(`[${appName}] ${output}`);
    }
  });

  proc.on("error", (err) => {
    console.error(`[${appName}] Process error:`, err);
  });

  return proc;
}

/**
 * Kill any processes using the specified port
 */
function killPort(port: number): void {
  try {
    // Works on macOS and Linux
    const pid = execSync(`lsof -ti :${port} 2>/dev/null || true`, { encoding: "utf-8" }).trim();
    if (pid) {
      console.log(`[setup] Killing existing process on port ${port} (PID: ${pid})`);
      execSync(`kill -9 ${pid} 2>/dev/null || true`);
    }
  } catch {
    // Ignore errors - port might not be in use
  }
}

/**
 * Kill a process and its children
 */
function killProcess(proc: ChildProcess | null, name: string): void {
  if (!proc || proc.killed) return;

  console.log(`[${name}] Stopping server...`);

  try {
    // On Unix, kill the process group
    if (proc.pid) {
      process.kill(-proc.pid, "SIGTERM");
    }
  } catch {
    // Fallback to just killing the process
    proc.kill("SIGTERM");
  }
}

/**
 * Vitest globalSetup - runs before all tests
 */
export default async function setup(): Promise<() => Promise<void>> {
  console.log("\n--- Test Setup ---\n");

  // Ensure cache directory exists
  mkdirSync(CACHE_DIR, { recursive: true });

  // Copy tracker if requested (must happen BEFORE build so it's included in dist)
  if (process.env.COPY_TRACKER === "1") {
    copyTracker();
  }

  // Build apps if needed
  await buildAppIfNeeded("mpa", MPA_DIR);
  await buildAppIfNeeded("spa", SPA_DIR);

  // Kill any processes using our ports before starting
  killPort(MPA_PORT);
  killPort(SPA_PORT);

  // Start preview servers
  mpaProcess = startPreviewServer("mpa", MPA_DIR, MPA_PORT);
  spaProcess = startPreviewServer("spa", SPA_DIR, SPA_PORT);

  // Wait for servers to be ready
  console.log("\nWaiting for servers to be ready...\n");

  await Promise.all([
    waitForServer(`http://localhost:${MPA_PORT}`, SERVER_STARTUP_TIMEOUT),
    waitForServer(`http://localhost:${SPA_PORT}`, SERVER_STARTUP_TIMEOUT),
  ]);

  console.log("\n--- Servers ready, running tests ---\n");

  // Return teardown function
  return async () => {
    console.log("\n--- Test Teardown ---\n");
    killProcess(mpaProcess, "mpa");
    killProcess(spaProcess, "spa");

    // Give processes time to clean up
    await new Promise((r) => setTimeout(r, 500));
  };
}
