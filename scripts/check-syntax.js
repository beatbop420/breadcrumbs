import { readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

function listJavaScriptFiles(directoryPath) {
  return readdirSync(directoryPath)
    .sort()
    .flatMap((entryName) => {
      const entryPath = join(directoryPath, entryName);
      const entryStats = statSync(entryPath);

      if (entryStats.isDirectory()) {
        return listJavaScriptFiles(entryPath);
      }

      return entryPath.endsWith('.js') ? [entryPath] : [];
    });
}

const projectRoot = resolve(process.cwd());
const filePathsToCheck = [
  ...listJavaScriptFiles(join(projectRoot, 'js')),
  ...listJavaScriptFiles(join(projectRoot, 'scripts')),
  join(projectRoot, 'sw.js'),
];

let failureCount = 0;

for (const filePath of filePathsToCheck) {
  const syntaxCheck = spawnSync(process.execPath, ['--check', filePath], {
    encoding: 'utf8',
    cwd: projectRoot,
  });

  console.log(`$ ${process.execPath} --check ${filePath}`);
  if (syntaxCheck.stdout) process.stdout.write(syntaxCheck.stdout);
  if (syntaxCheck.stderr) process.stderr.write(syntaxCheck.stderr);
  console.log(syntaxCheck.status === 0 ? 'OK' : 'FAILED');

  if (syntaxCheck.status !== 0) {
    failureCount += 1;
  }
}

console.log(`\nChecked_files: ${filePathsToCheck.length}`);
console.log(`Failures: ${failureCount}`);

process.exit(failureCount === 0 ? 0 : 1);
