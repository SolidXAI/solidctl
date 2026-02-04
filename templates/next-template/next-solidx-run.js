#!/usr/bin/env node
const { spawn } = require("child_process");
const path = require("path");

// Load .env (and .env.local if you use it)
require("dotenv").config({ path: path.resolve(process.cwd(), ".env") });

const port = process.env.PORT || "3001";

const mode = process.argv[2]; // "dev" or "start"
const args =
    mode === "dev"
        ? ["dev", "-p", port]
        : ["start", "-p", port];

const child = spawn("next", args, { stdio: "inherit", shell: true });

child.on("exit", (code) => process.exit(code ?? 0));
