import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const sourceRoots = ["src", "src-tauri/src", "scripts", "docs"];
const extensions = new Set([".ts", ".tsx", ".css", ".rs", ".mjs", ".js", ".html"]);
const ignoredExtensions = new Set([".md"]);
const maxLines = 250;

async function collect(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? collect(path) : [path];
  }));
  return nested.flat();
}

const files = (await Promise.all(sourceRoots.map((directory) => collect(join(root, directory)))))
  .flat()
  .filter((file) => !ignoredExtensions.has(extname(file)) && extensions.has(extname(file)));
const oversized = [];
for (const file of files) {
  const lines = (await readFile(file, "utf8")).split(/\r?\n/).length;
  const limit = extname(file) === ".html" ? 300 : maxLines;
  if (lines > limit) oversized.push({ file: relative(root, file), lines, limit });
}

if (oversized.length) {
  console.error("代码文件超过规模上限：");
  for (const item of oversized) console.error(`- ${item.file}: ${item.lines} 行（上限 ${item.limit}）`);
  process.exitCode = 1;
} else {
  console.log(`文件规模检查通过：${files.length} 个代码文件 ≤250 行，HTML ≤300 行。`);
}
