// Add a validate function which check if the current process working directly is the project root of SolidX project.
// Do the above check
export function validateProjectRoot() {
  const fs = require('fs');
  const path = require('path');

  const requiredFiles = [
    'solid-api/package.json',
    'solid-ui/package.json',
  ];

    const cwd = process.cwd();
    for (const file of requiredFiles) {
      if (!fs.existsSync(path.join(cwd, file))) {
        console.error(`Ensure you are running this command from the SolidX project root. Missing file: ${file}`);
        process.exit(1);
      }
    }
}