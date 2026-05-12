import { readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

function listTestFiles(testDirectoryPath) {
  return readdirSync(testDirectoryPath)
    .filter((fileName) => fileName.endsWith('.test.js'))
    .sort()
    .map((fileName) => join(testDirectoryPath, fileName));
}

function parseTestCount(outputText, labelText) {
  const match = outputText.match(new RegExp(`${labelText}:\\s+(\\d+)`));
  return match ? Number.parseInt(match[1], 10) : 0;
}

const projectRoot = resolve(process.cwd());
const testDirectoryPath = join(projectRoot, 'js');
const testFilePaths = listTestFiles(testDirectoryPath);
const suiteStartTime = performance.now();

let totalPassed = 0;
let totalFailed = 0;

for (const testFilePath of testFilePaths) {
  const commandArguments = [
    '--input-type=module',
    '--eval',
    `await import(${JSON.stringify(pathToFileURL(testFilePath).href)})`,
  ];

  console.log(`\n=== ${testFilePath} ===`);
  console.log(`$ ${process.execPath} ${commandArguments.join(' ')}`);

  const testRun = spawnSync(process.execPath, commandArguments, {
    encoding: 'utf8',
    cwd: projectRoot,
  });

  if (testRun.stdout) process.stdout.write(testRun.stdout);
  if (testRun.stderr) process.stderr.write(testRun.stderr);

  totalPassed += parseTestCount(testRun.stdout, 'Passed');
  totalFailed += parseTestCount(testRun.stdout, 'Failed');

  if (testRun.status !== 0) {
    process.exit(testRun.status ?? 1);
  }
}

const durationMs = Math.round(performance.now() - suiteStartTime);

console.log('\n=== TEST SUITE SUMMARY ===');
console.log(`Total files: ${testFilePaths.length}`);
console.log(`Total tests: ${totalPassed + totalFailed}`);
console.log(`Passed: ${totalPassed}`);
console.log(`Failed: ${totalFailed}`);
console.log('Skipped: 0');
console.log(`Duration_ms: ${durationMs}`);

process.exit(totalFailed === 0 ? 0 : 1);
