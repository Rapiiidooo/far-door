// Copies the pinned three.js build and the addons the game imports into game/vendor,
// following relative imports so each addon arrives with its own dependencies.
import { cp, mkdir, readFile } from "node:fs/promises";
import path from "node:path";

const src = path.resolve("node_modules/three");
const out = path.resolve("game/vendor");
const entries = [
  "csm/CSM.js",
  "postprocessing/EffectComposer.js",
  "postprocessing/RenderPass.js",
  "postprocessing/OutputPass.js",
  "postprocessing/Pass.js",
  "postprocessing/UnrealBloomPass.js",
  "utils/BufferGeometryUtils.js",
];

await mkdir(out, { recursive: true });
for (const file of ["three.module.js", "three.core.js"])
  await cp(path.join(src, "build", file), path.join(out, file));
await cp(path.join(src, "LICENSE"), path.join(out, "THREE-LICENSE.txt"));

const seen = new Set();
async function copyAddon(rel) {
  if (seen.has(rel)) return;
  seen.add(rel);
  const from = path.join(src, "examples/jsm", rel);
  const text = await readFile(from, "utf8");
  await mkdir(path.dirname(path.join(out, rel)), { recursive: true });
  await cp(from, path.join(out, rel));
  for (const [, spec] of text.matchAll(
    /(?:from|import)\s*\(?\s*['"](\.{1,2}\/[^'"]+)['"]/g,
  ))
    await copyAddon(path.normalize(path.join(path.dirname(rel), spec)));
}
for (const entry of entries) await copyAddon(entry);
console.log(
  `vendored three ${JSON.parse(await readFile(path.join(src, "package.json"), "utf8")).version} and ${seen.size} addons`,
);
