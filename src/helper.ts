import fs from 'fs';
import os from 'os';
import path from 'path';

const requiredProjectFiles = ['solid-api/package.json', 'solid-ui/package.json'] as const;
const validPercentEscapePattern = /^%[0-9A-Fa-f]{2}$/;

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

export function getSolidCommandEnv() {
  const solidctlBinDir = path.join(os.homedir(), '.solidctl', 'bin');
  const currentPath = process.env.PATH || '';
  const pathEntries = currentPath.split(path.delimiter).filter(Boolean);

  if (pathEntries.includes(solidctlBinDir)) {
    return process.env;
  }

  return {
    ...process.env,
    PATH: `${solidctlBinDir}${path.delimiter}${currentPath}`,
  };
}

function encodeUserInfoComponent(value: string) {
  return value
    .split(/(%[0-9A-Fa-f]{2})/)
    .map((part) => (validPercentEscapePattern.test(part) ? part : encodeURIComponent(part)))
    .join('');
}

export function normalizeDatabaseUrl(urlValue: string) {
  const trimmedUrl = urlValue.trim();
  const schemeMatch = trimmedUrl.match(/^([a-z][a-z0-9+.-]*:\/\/)([\s\S]+)$/i);

  if (!schemeMatch) return trimmedUrl;

  const [, scheme, remainder] = schemeMatch;
  const userInfoSeparatorIndex = remainder.lastIndexOf('@');

  if (userInfoSeparatorIndex < 0) return trimmedUrl;

  const userInfo = remainder.slice(0, userInfoSeparatorIndex);
  const hostAndSuffix = remainder.slice(userInfoSeparatorIndex + 1);
  const authorityEndIndex = ['/', '?', '#']
    .map((separator) => hostAndSuffix.indexOf(separator))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0] ?? hostAndSuffix.length;
  const hostInfo = hostAndSuffix.slice(0, authorityEndIndex);
  const suffix = hostAndSuffix.slice(authorityEndIndex);
  const passwordSeparatorIndex = userInfo.indexOf(':');

  if (passwordSeparatorIndex < 0) {
    return `${scheme}${encodeUserInfoComponent(userInfo)}@${hostInfo}${suffix}`;
  }

  const username = userInfo.slice(0, passwordSeparatorIndex);
  const password = userInfo.slice(passwordSeparatorIndex + 1);

  return `${scheme}${encodeUserInfoComponent(username)}:${encodeUserInfoComponent(password)}@${hostInfo}${suffix}`;
}
