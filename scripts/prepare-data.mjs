#!/usr/bin/env node
/**
 * Stateless Build-Time Data Preparer
 * - Uses local weekly repo if present (e.g. ../student570/weekly or WEEKLY_REPO_PATH).
 * - Otherwise shallow-clones upstream repo on the fly during CI / Cloudflare Pages build,
 *   parses Markdown into public/data/, and removes the temporary clone.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const TMP_CLONE_DIR = path.join(ROOT_DIR, '.tmp-weekly');
const LOCAL_DEFAULT_DIR = path.resolve(ROOT_DIR, '..', 'student570', 'weekly');

const upstreamRepo = process.env.WEEKLY_UPSTREAM_REPO || 'student570/weekly';
const envRepoPath = process.env.WEEKLY_REPO_PATH
  ? path.resolve(process.env.WEEKLY_REPO_PATH)
  : null;

function runParse(repoDir) {
  execFileSync(
    process.execPath,
    [path.join(__dirname, 'parse-weekly.mjs'), repoDir],
    { stdio: 'inherit' }
  );
}

function main() {
  if (envRepoPath && fs.existsSync(path.join(envRepoPath, 'docs'))) {
    console.log(`[prepare-data] Using WEEKLY_REPO_PATH: ${envRepoPath}`);
    runParse(envRepoPath);
    return;
  }

  if (fs.existsSync(path.join(LOCAL_DEFAULT_DIR, 'docs'))) {
    console.log(`[prepare-data] Using local repository: ${LOCAL_DEFAULT_DIR}`);
    runParse(LOCAL_DEFAULT_DIR);
    return;
  }

  const repoUrl = `https://github.com/${upstreamRepo}.git`;
  console.log(`[prepare-data] Stateless build: shallow-cloning ${repoUrl}...`);

  fs.rmSync(TMP_CLONE_DIR, { recursive: true, force: true });
  try {
    execFileSync(
      'git',
      ['clone', '--depth', '1', '--single-branch', repoUrl, TMP_CLONE_DIR],
      { stdio: 'inherit' }
    );
    runParse(TMP_CLONE_DIR);
  } finally {
    fs.rmSync(TMP_CLONE_DIR, { recursive: true, force: true });
  }
}

main();
