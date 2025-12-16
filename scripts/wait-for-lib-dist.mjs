import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const thisFilePath = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(thisFilePath), '..');

function nowMs() {
    return Date.now();
}

async function fileExists(filePath) {
    try {
        const stat = await fs.stat(filePath);
        return stat.isFile();
    } catch {
        return false;
    }
}

async function readJson(filePath) {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
}

async function isReady(distDirAbs) {
    const manifestPath = path.join(distDirAbs, 'package.json');
    if (!(await fileExists(manifestPath))) return { ok: false, reason: 'package.json missing' };

    let manifest;
    try {
        manifest = await readJson(manifestPath);
    } catch {
        return { ok: false, reason: 'package.json unreadable' };
    }

    if (manifest?.name !== 'ng-three-model-cropper') {
        return { ok: false, reason: `package.json name is ${JSON.stringify(manifest?.name)}` };
    }

    const candidateEntrypoints = [
        path.join(distDirAbs, 'fesm2022', 'ng-three-model-cropper.mjs'),
        path.join(distDirAbs, 'esm2022', 'ng-three-model-cropper.mjs'),
        path.join(distDirAbs, 'fesm2022', 'public-api.mjs'),
        path.join(distDirAbs, 'esm2022', 'public-api.mjs')
    ];

    for (const entry of candidateEntrypoints) {
        if (await fileExists(entry)) return { ok: true };
    }

    return { ok: false, reason: 'entrypoint .mjs missing' };
}

async function main() {
    const distDirRel = process.env.LIB_DIST_DIR ?? 'dist/model-cropper';
    const distDirAbs = path.resolve(projectRoot, distDirRel);

    const timeoutMs = Number(process.env.LIB_WAIT_TIMEOUT_MS ?? 120_000);
    const pollMs = Number(process.env.LIB_WAIT_POLL_MS ?? 200);
    const stableChecks = Number(process.env.LIB_WAIT_STABLE_CHECKS ?? 3);

    const start = nowMs();
    let stableCount = 0;
    let lastReason = '';

    process.stdout.write(`[dev] Waiting for ng-three-model-cropper dist to be ready at ${distDirRel}...\n`);

    // Wait until the dist is ready for several consecutive checks.
    while (nowMs() - start < timeoutMs) {
        const status = await isReady(distDirAbs);
        if (status.ok) {
            stableCount += 1;
            if (stableCount >= stableChecks) {
                process.stdout.write('[dev] Library dist is ready. Starting dev server...\n');
                return;
            }
        } else {
            stableCount = 0;
            lastReason = status.reason ?? 'not ready';
        }

        await new Promise((r) => setTimeout(r, pollMs));
    }

    const elapsed = ((nowMs() - start) / 1000).toFixed(1);
    process.stderr.write(`[dev] Timed out after ${elapsed}s waiting for ${distDirRel} (${lastReason}).\n`);
    process.exit(1);
}

await main();
