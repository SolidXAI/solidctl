const { execSync } = require("child_process");

const args = process.argv.slice(2);
const forceFlag = args.includes("--force");
const dryRun = args.includes("--dry-run");

// Extract --preid=<value> for pre-releases (alpha, beta, rc)
const preidArg = args.find((arg) => arg.startsWith("--preid="));
const preid = preidArg ? preidArg.split("=")[1] : null;
const isPrerelease = !!preid;

// Version type: patch, minor, major, or preminor, premajor for starting new pre-release cycles
const versionType = args.find((arg) => !arg.startsWith("--")) || "patch";

const MAIN_BRANCH = "main";
const DEV_BRANCH = "dev";

function exec(cmd, options = {}) {
  if (dryRun) {
    console.log(`[dry-run] ${cmd}`);
    return "";
  }
  return execSync(cmd, { stdio: "inherit", ...options });
}

function getCurrentBranch() {
  return execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf-8" }).trim();
}

try {
  // Check we're on the correct branch
  const currentBranch = getCurrentBranch();
  const requiredBranch = isPrerelease ? DEV_BRANCH : MAIN_BRANCH;

  if (currentBranch !== requiredBranch) {
    if (forceFlag) {
      console.log(`⚠️  Not on ${requiredBranch} branch (on ${currentBranch}), but --force flag set. Continuing...`);
    } else {
      if (isPrerelease) {
        console.error(`❌ Must be on ${DEV_BRANCH} branch to publish pre-releases. Currently on: ${currentBranch}`);
      } else {
        console.error(`❌ Must be on ${MAIN_BRANCH} branch to publish stable releases. Currently on: ${currentBranch}`);
      }
      console.error(`   Use --force to override this check.`);
      process.exit(1);
    }
  }

  if (dryRun) {
    console.log("🧪 Dry run mode - no changes will be made\n");
  }

  // Build version command
  let versionCmd;
  if (isPrerelease) {
    if (versionType === "patch" || versionType === "prerelease") {
      // Increment pre-release: 0.0.12 → 0.0.13-alpha.0, or 0.0.13-alpha.0 → 0.0.13-alpha.1
      versionCmd = `npm version prerelease --preid=${preid}`;
    } else if (versionType === "preminor" || versionType === "minor") {
      // Start new minor pre-release: 0.0.12 → 0.1.0-alpha.0
      versionCmd = `npm version preminor --preid=${preid}`;
    } else if (versionType === "premajor" || versionType === "major") {
      // Start new major pre-release: 0.0.12 → 1.0.0-alpha.0
      versionCmd = `npm version premajor --preid=${preid}`;
    } else {
      versionCmd = `npm version prerelease --preid=${preid}`;
    }
    console.log(`🔄 Updating package version (pre-release: ${preid})...`);
  } else {
    versionCmd = `npm version ${versionType}`;
    console.log(`🔄 Updating package version (${versionType})...`);
  }
  exec(versionCmd);

  console.log("📦 Pushing to git (with tags)...");
  exec("git push --follow-tags");

  console.log("📦 Publishing package...");
  if (isPrerelease) {
    exec(`npm publish --tag ${preid}`);
  } else {
    exec("npm publish");
  }

  console.log("✅ Published successfully!\n");

  // Reverse merge to dev (only for stable releases from main)
  if (!isPrerelease) {
    console.log(`🔀 Merging ${MAIN_BRANCH} into ${DEV_BRANCH}...`);
    exec(`git checkout ${DEV_BRANCH}`);
    exec(`git pull origin ${DEV_BRANCH}`);

    try {
      exec(`git merge ${MAIN_BRANCH} -m "chore: merge ${MAIN_BRANCH} after publish"`);
      exec(`git push origin ${DEV_BRANCH}`);
      console.log(`✅ Successfully merged ${MAIN_BRANCH} into ${DEV_BRANCH}\n`);
    } catch (mergeError) {
      console.error(`\n⚠️  Merge conflict detected. Please resolve manually.`);
      console.error(`   You are now on the ${DEV_BRANCH} branch.`);
      process.exit(1);
    }

    // Return to main branch
    exec(`git checkout ${MAIN_BRANCH}`);
    console.log(`📍 Back on ${MAIN_BRANCH} branch`);
  } else {
    // For pre-releases, just push the tag
    console.log(`📍 Staying on ${currentBranch} branch`);
  }

  console.log("\n🎉 All done!");
} catch (error) {
  console.error("❌ Error:", error.message);
  process.exit(1);
}
