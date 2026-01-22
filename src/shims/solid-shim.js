const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const pointerPath = path.join(os.homedir(), '.solidctl', 'solid-current');
if (!fs.existsSync(pointerPath)) {
  console.error('solidctl: solid target not set. Run `solidctl rebuild-api` in a project.');
  process.exit(1);
}
const target = fs.readFileSync(pointerPath, 'utf8').trim();
if (!target) {
  console.error('solidctl: solid target is empty. Run `solidctl rebuild-api` again.');
  process.exit(1);
}
const result = spawnSync(process.execPath, [target, ...process.argv.slice(2)], {
  stdio: 'inherit',
});
if (result.error) {
  console.error(`solidctl: failed to launch solid: ${result.error.message}`);
  process.exit(1);
}
process.exit(typeof result.status === 'number' ? result.status : 1);
