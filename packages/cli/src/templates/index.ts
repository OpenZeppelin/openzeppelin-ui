import fs from 'node:fs';
import path from 'node:path';

import { getTemplatesPath } from '../utils/paths';

export function readTemplate(templateName: string): string {
  const templatePath = path.join(getTemplatesPath(), templateName);
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template not found: ${templateName}`);
  }
  return fs.readFileSync(templatePath, 'utf8');
}

export function writeTemplate(
  targetPath: string,
  templateName: string,
  replacements?: Record<string, string>
): boolean {
  let content = readTemplate(templateName);

  if (replacements) {
    for (const [key, value] of Object.entries(replacements)) {
      content = content.replaceAll(`{{${key}}}`, value);
    }
  }

  if (fs.existsSync(targetPath)) {
    const existing = fs.readFileSync(targetPath, 'utf8');
    if (existing === content) return false;
  }

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, content, 'utf8');
  return true;
}

export function copyTemplateDirectory(
  sourceDir: string,
  targetDir: string
): { copied: string[]; skipped: string[] } {
  const sourcePath = path.join(getTemplatesPath(), sourceDir);
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Template directory not found: ${sourceDir}`);
  }

  const copied: string[] = [];
  const skipped: string[] = [];

  function walk(currentDir: string, relativeTo: string): void {
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      const source = path.join(currentDir, entry.name);
      const relative = path.relative(relativeTo, source);
      const target = path.join(targetDir, relative);

      if (entry.isDirectory()) {
        walk(source, relativeTo);
        continue;
      }

      if (fs.existsSync(target)) {
        skipped.push(relative);
        continue;
      }

      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(source, target);
      copied.push(relative);
    }
  }

  walk(sourcePath, sourcePath);
  return { copied, skipped };
}
