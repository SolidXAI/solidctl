import fs from 'fs';
import path from 'path';

const requiredProjectFiles = ['solid-api/package.json', 'solid-ui/package.json'] as const;

export function validateProjectRoot() {
  const cwd = process.cwd();

  for (const file of requiredProjectFiles) {
    if (!fs.existsSync(path.join(cwd, file))) {
      console.error(
        `Ensure you are running this command from the SolidX project root. Missing file: ${file}\n` +
        `Run this command from the directory containing your SolidX project (with solid-api/ and solid-ui/ subdirectories).`,
      );
      process.exit(1);
    }
  }
}

export function validateProjectScript(projectName: 'solid-api' | 'solid-ui', scriptName: string) {
  validateProjectRoot();

  const packageJsonPath = path.join(process.cwd(), projectName, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as {
    scripts?: Record<string, string>;
  };

  if (!packageJson.scripts?.[scriptName]) {
    console.error(
      `Ensure ${projectName}/package.json defines the "${scriptName}" script before running this command.`,
    );
    process.exit(1);
  }
}
