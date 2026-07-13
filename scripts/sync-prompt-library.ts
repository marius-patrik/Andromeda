import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import {
  PROMPT_MANIFEST_PATH,
  computeChecksum,
  composePrompt,
  defaultPromptsRoot,
  loadFixture,
  loadManifest,
  verifySnapshots
} from "../src/prompts.js";

/**
 * Regenerate derived prompt-library artifacts: artifact checksums in
 * manifest.json and the deterministic composition snapshots. Run this after
 * editing any prompt artifact or fixture, then commit the result. The test
 * lane (tests/prompts.test.ts) verifies the checked-in state matches.
 */
const root = defaultPromptsRoot();
const manifest = loadManifest(root);

for (const artifact of manifest.artifacts) {
  const content = readFileSync(resolve(root, artifact.path), "utf8");
  artifact.checksum = computeChecksum(content);
}
writeFileSync(resolve(root, PROMPT_MANIFEST_PATH), `${JSON.stringify(manifest, null, 2)}\n`);

for (const fixture of manifest.fixtures) {
  const inputs = loadFixture(root, fixture.path);
  const composed = composePrompt(inputs, root);
  const snapshotPath = resolve(root, fixture.snapshot);
  mkdirSync(dirname(snapshotPath), { recursive: true });
  writeFileSync(snapshotPath, composed);
}

verifySnapshots(root);
console.log(
  `Synced ${manifest.artifacts.length} artifact checksums and ${manifest.fixtures.length} snapshots in ${root}`
);
