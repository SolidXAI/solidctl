import fs from 'fs-extra';
import path from 'path';
import { kebabCase } from 'lodash';
import { getTemplatesPath } from './create-app/helpers';

const UI_SRC_RELATIVE = path.join('solid-ui', 'src');
const UI_MODULE_TEMPLATE = 'ui-module-template';
const MODULE_PLACEHOLDER = '__module-name__';

export function extractModuleNameFromArgs(args: string[]): string | undefined {
  for (let i = 0; i < args.length; i++) {
    if ((args[i] === '--name' || args[i] === '-n') && i + 1 < args.length) {
      return kebabCase(args[i + 1]);
    }
    if (args[i].startsWith('--name=')) return kebabCase(args[i].split('=')[1]);
    if (args[i].startsWith('-n='))     return kebabCase(args[i].split('=')[1]);
  }
  return undefined;
}

export function generateSolidUiModule(projectRoot: string, moduleName: string): void {
  const uiSrcPath = path.join(projectRoot, UI_SRC_RELATIVE);

  if (!fs.existsSync(uiSrcPath)) {
    console.log('ℹ No solid-ui/src found — skipping UI module scaffold');
    return;
  }

  const moduleDir = path.join(uiSrcPath, moduleName);
  if (fs.existsSync(moduleDir)) {
    console.log(`ℹ solid-ui module "${moduleName}" already exists — skipping`);
    return;
  }

  const templateDir = path.join(getTemplatesPath(), UI_MODULE_TEMPLATE);
  const templateFiles = fs.readdirSync(templateDir);

  for (const templateFile of templateFiles) {
    const outputFilename = templateFile.replace(MODULE_PLACEHOLDER, moduleName);
    const content = fs.readFileSync(path.join(templateDir, templateFile), 'utf-8');
    fs.outputFileSync(
      path.join(moduleDir, outputFilename),
      content.replaceAll(MODULE_PLACEHOLDER, moduleName),
    );
  }

  console.log(`✔ solid-ui module scaffold created at solid-ui/src/${moduleName}/`);
}
