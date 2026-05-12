import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const SECURITY_RULES = [
  { name: 'no eval', pattern: /\beval\s*\(/ },
  { name: 'no Function constructor', pattern: /\bnew Function\s*\(/ },
  { name: 'no innerHTML assignment', pattern: /\.innerHTML\s*=/ },
  { name: 'no outerHTML assignment', pattern: /\.outerHTML\s*=/ },
  { name: 'no insertAdjacentHTML', pattern: /\.insertAdjacentHTML\s*\(/ },
  { name: 'no document.write', pattern: /\bdocument\.write\s*\(/ },
  { name: 'no wildcard CORS', pattern: /Access-Control-Allow-Origin\s*:\s*\*/i },
  { name: 'no service role secrets', pattern: /service_role|SUPABASE_SERVICE_ROLE/i },
];

function listSourceFiles(directoryPath) {
  return readdirSync(directoryPath)
    .sort()
    .flatMap((entryName) => {
      const entryPath = join(directoryPath, entryName);
      const entryStats = statSync(entryPath);

      if (entryStats.isDirectory()) {
        return listSourceFiles(entryPath);
      }

      return /\.(js|html|json)$/u.test(entryPath) ? [entryPath] : [];
    });
}

function findRuleViolations(filePath) {
  const fileContent = readFileSync(filePath, 'utf8');
  const fileLines = fileContent.split('\n');
  const violations = [];
  const isTestFile = filePath.endsWith('.test.js');
  const isRuntimeConfigFile = filePath.endsWith('config.local.js');

  fileLines.forEach((fileLine, lineIndex) => {
    SECURITY_RULES.forEach((securityRule) => {
      if (securityRule.pattern.test(fileLine)) {
        violations.push({
          filePath,
          lineNumber: lineIndex + 1,
          ruleName: securityRule.name,
          lineText: fileLine.trim(),
        });
      }
    });

    if (isRuntimeConfigFile && /YOUR_SUPABASE_URL|YOUR_SUPABASE_ANON_KEY/.test(fileLine)) {
      violations.push({
        filePath,
        lineNumber: lineIndex + 1,
        ruleName: 'no placeholder Supabase config',
        lineText: fileLine.trim(),
      });
    }

    if (!isTestFile && filePath.endsWith('app.js') && /YOUR_SUPABASE_URL|YOUR_SUPABASE_ANON_KEY/.test(fileLine)) {
      violations.push({
        filePath,
        lineNumber: lineIndex + 1,
        ruleName: 'no placeholder Supabase config',
        lineText: fileLine.trim(),
      });
    }
  });

  return violations;
}

const projectRoot = resolve(process.cwd());
const sourceFilePaths = [
  join(projectRoot, 'index.html'),
  join(projectRoot, 'manifest.json'),
  join(projectRoot, 'sw.js'),
  ...listSourceFiles(join(projectRoot, 'js')),
];

const allViolations = sourceFilePaths.flatMap(findRuleViolations);

if (allViolations.length === 0) {
  console.log('Security checks passed. No forbidden patterns found.');
  process.exit(0);
}

allViolations.forEach((violation) => {
  console.log(`${violation.filePath}:${violation.lineNumber} [${violation.ruleName}] ${violation.lineText}`);
});

console.log(`\nViolations: ${allViolations.length}`);

process.exit(1);
