import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const projectRoot = process.cwd();
const contractsRoot = path.join(projectRoot, "packages/contracts/src");
const sourceExtensions = new Set([".ts", ".tsx", ".js", ".mjs"]);
const forbiddenContractImports = [
  "backend",
  "frontend",
  "drizzle",
  "fastify",
  "react",
  "openai",
  "@google",
];

const collectSourceFiles = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        return collectSourceFiles(entryPath);
      }

      return sourceExtensions.has(path.extname(entry.name)) ? [entryPath] : [];
    }),
  );

  return files.flat();
};

const violations = [];

for (const file of await collectSourceFiles(contractsRoot)) {
  const source = await readFile(file, "utf8");

  for (const forbiddenImport of forbiddenContractImports) {
    const importPattern = new RegExp(
      `from\\s+["'][^"']*${forbiddenImport}|import\\s+["'][^"']*${forbiddenImport}`,
    );

    if (importPattern.test(source)) {
      violations.push(
        `${path.relative(projectRoot, file)} imports ${forbiddenImport}`,
      );
    }
  }
}

const applicationRoots = [
  path.join(projectRoot, "backend/src"),
  path.join(projectRoot, "frontend/azimeclient/src"),
];

for (const applicationRoot of applicationRoots) {
  for (const file of await collectSourceFiles(applicationRoot)) {
    const source = await readFile(file, "utf8");

    if (source.includes("backend/src/providers/caseProvider")) {
      violations.push(
        `${path.relative(projectRoot, file)} imports the retired provider contract`,
      );
    }
  }
}

if (violations.length > 0) {
  console.error(violations.join("\n"));
  process.exitCode = 1;
} else {
  console.log("Contracts boundary checks passed");
}
