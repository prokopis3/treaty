import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import ts from 'typescript';

const TARGET_ROOT = join(process.cwd(), 'src', 'app');

const isTypeOnlyServerImport = (node: ts.ImportDeclaration): boolean => {
  if (!ts.isStringLiteral(node.moduleSpecifier)) {
    return true;
  }

  const source = node.moduleSpecifier.text;
  if (source !== 'server') {
    return true;
  }

  const clause = node.importClause;
  if (!clause) {
    return false;
  }

  if (clause.isTypeOnly) {
    return true;
  }

  if (clause.name) {
    return false;
  }

  if (!clause.namedBindings) {
    return false;
  }

  if (ts.isNamespaceImport(clause.namedBindings)) {
    return false;
  }

  return clause.namedBindings.elements.every((specifier) => specifier.isTypeOnly);
};

const collectTsFiles = (dir: string): string[] => {
  const files: string[] = [];

  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...collectTsFiles(fullPath));
      continue;
    }

    if (extname(fullPath) === '.ts' && !fullPath.endsWith('.d.ts')) {
      files.push(fullPath);
    }
  }

  return files;
};

const violations: Array<{ file: string; line: number; text: string }> = [];

for (const filePath of collectTsFiles(TARGET_ROOT)) {
  const sourceText = readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

  for (const stmt of sourceFile.statements) {
    if (!ts.isImportDeclaration(stmt)) {
      continue;
    }

    if (isTypeOnlyServerImport(stmt)) {
      continue;
    }

    const { line } = sourceFile.getLineAndCharacterOfPosition(stmt.getStart(sourceFile));
    violations.push({
      file: relative(process.cwd(), filePath).replaceAll('\\', '/'),
      line: line + 1,
      text: stmt.getText(sourceFile),
    });
  }
}

if (violations.length > 0) {
  console.error('Found non-type imports from "server" under src/app. Use type-only imports.');
  for (const violation of violations) {
    console.error(`- ${violation.file}:${violation.line}`);
    console.error(`  ${violation.text}`);
  }
  process.exit(1);
}

console.log('Import guard passed: all src/app imports from "server" are type-only.');
