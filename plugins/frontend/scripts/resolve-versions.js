#!/usr/bin/env node

/**
 * resolve-versions.js
 *
 * Supply Chain Attack 방지를 위한 안전한 패키지 버전 조회 스크립트.
 * npm registry에서 각 패키지의 stable 버전 중 릴리스 후 일정 기간이
 * 경과한 최신 버전을 선택하여 .resolved-versions.json으로 출력한다.
 *
 * Usage:
 *   node resolve-versions.js <pkg1> <pkg2> ...
 *   node resolve-versions.js --age 7 <pkg1> <pkg2> ...
 */

const { execFile } = require('child_process');
const { writeFileSync } = require('fs');
const { join } = require('path');

const DEFAULT_AGE_DAYS = 14;
const STABLE_VERSION_RE = /^\d+\.\d+\.\d+$/;
const OUTPUT_FILE = '.resolved-versions.json';

function parseArgs(argv) {
  const args = argv.slice(2);
  let ageDays = DEFAULT_AGE_DAYS;
  const packages = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--age' && i + 1 < args.length) {
      ageDays = parseInt(args[++i], 10);
      if (Number.isNaN(ageDays) || ageDays < 0) {
        console.error('Error: --age must be a non-negative integer');
        process.exit(1);
      }
    } else {
      packages.push(args[i]);
    }
  }

  if (packages.length === 0) {
    console.error('Usage: node resolve-versions.js [--age <days>] <package1> [package2] ...');
    process.exit(1);
  }

  return { ageDays, packages };
}

function npmView(pkg) {
  return new Promise((resolve) => {
    execFile('npm', ['view', pkg, 'dist-tags', 'time', 'versions', '--json'], {
      timeout: 30_000,
    }, (err, stdout, stderr) => {
      if (err) {
        resolve({ error: stderr || err.message });
        return;
      }
      try {
        resolve({ data: JSON.parse(stdout) });
      } catch (e) {
        resolve({ error: `JSON parse failed: ${e.message}` });
      }
    });
  });
}

function parseSemver(version) {
  const [major, minor, patch] = version.split('.').map(Number);
  return { major, minor, patch };
}

function compareSemver(a, b) {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  return pa.major - pb.major || pa.minor - pb.minor || pa.patch - pb.patch;
}

function resolveVersion(data, ageDays) {
  const now = Date.now();
  const ageMs = ageDays * 24 * 60 * 60 * 1000;

  const latestTag = data['dist-tags']?.latest;
  if (!latestTag) {
    return { error: 'No dist-tags.latest found' };
  }

  const availableVersions = new Set(data.versions || []);

  const latestParsed = parseSemver(latestTag.replace(/-.*$/, ''));
  const targetMajor = latestParsed.major;

  const candidates = Object.entries(data.time)
    .filter(([ver]) => STABLE_VERSION_RE.test(ver))
    .filter(([ver]) => availableVersions.has(ver))
    .filter(([ver]) => parseSemver(ver).major === targetMajor)
    .sort((a, b) => compareSemver(a[0], b[0]));

  if (candidates.length === 0) {
    return { error: `No stable versions found for major ${targetMajor}` };
  }

  // Walk backwards: find newest version with age >= threshold
  for (let i = candidates.length - 1; i >= 0; i--) {
    const [ver, publishedAt] = candidates[i];
    const age = now - new Date(publishedAt).getTime();
    if (age >= ageMs) {
      return {
        version: ver,
        publishedAt,
        ageInDays: Math.floor(age / (24 * 60 * 60 * 1000)),
      };
    }
  }

  // All versions are too recent — use the oldest on this major
  const [ver, publishedAt] = candidates[0];
  const age = now - new Date(publishedAt).getTime();
  return {
    version: ver,
    publishedAt,
    ageInDays: Math.floor(age / (24 * 60 * 60 * 1000)),
    warning: `No version meets the ${ageDays}-day minimum age. Using oldest on major ${targetMajor}.`,
  };
}

async function main() {
  const { ageDays, packages } = parseArgs(process.argv);

  const results = await Promise.all(
    packages.map(async (pkg) => {
      const res = await npmView(pkg);
      if (res.error) {
        return { pkg, error: res.error };
      }
      const resolved = resolveVersion(res.data, ageDays);
      if (resolved.error) {
        return { pkg, error: resolved.error };
      }
      return { pkg, ...resolved };
    }),
  );

  const output = {
    generatedAt: new Date().toISOString(),
    minimumAgeDays: ageDays,
    packages: {},
    errors: [],
  };

  let hasError = false;
  for (const r of results) {
    if (r.error) {
      output.errors.push({ package: r.pkg, reason: r.error });
      hasError = true;
    } else {
      output.packages[r.pkg] = {
        version: r.version,
        publishedAt: r.publishedAt,
        ageInDays: r.ageInDays,
      };
      if (r.warning) {
        output.packages[r.pkg].warning = r.warning;
      }
    }
  }

  const outputPath = join(process.cwd(), OUTPUT_FILE);
  writeFileSync(outputPath, JSON.stringify(output, null, 2) + '\n');

  const ok = Object.keys(output.packages).length;
  const fail = output.errors.length;
  console.log(`Resolved ${ok}/${ok + fail} packages. Output: ${OUTPUT_FILE}`);

  if (fail > 0) {
    console.error(`Errors: ${output.errors.map((e) => e.package).join(', ')}`);
  }

  process.exit(hasError ? 2 : 0);
}

main();
