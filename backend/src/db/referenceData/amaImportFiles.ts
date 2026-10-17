import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const amaRowsDirectory = fileURLToPath(new URL("../../../reference-data/ama-rows/", import.meta.url));
export const amaRatingTablesDirectory = fileURLToPath(new URL("../../../reference-data/ama-rating-tables/", import.meta.url));

// Combine the complete upload before schema validation or database writes.
export async function readAmaImportFiles(inputPath: string): Promise<unknown[]> {
  const filenames = (await stat(inputPath)).isDirectory()
    ? (await readdir(inputPath, { withFileTypes: true }))
        .filter(entry => entry.isFile() && entry.name.toLowerCase().endsWith(".json"))
        .map(entry => path.join(inputPath, entry.name))
        .sort()
    : [inputPath];
  if (!filenames.length) {
    throw new Error(`No JSON files found in ${inputPath}. Add a .json file containing an array of AMA entries.`);
  }
  const entries: unknown[] = [];
  for (const filename of filenames) {
    const contents = await readFile(filename, "utf8");
    let parsed: unknown;
    try {
      parsed = JSON.parse(contents);
    } catch {
      throw new Error(`Invalid JSON in ${filename}`);
    }
    if (!Array.isArray(parsed)) {
      throw new Error(`Expected a JSON array in ${filename}`);
    }
    entries.push(...parsed);
  }
  return entries;
}
