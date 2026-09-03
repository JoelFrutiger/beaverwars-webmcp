/* global console */
import { readFile } from "node:fs/promises";
import { glob } from "node:fs/promises";

const files = [];
for await (const file of glob("src/**/*.{ts,css}")) files.push(file);
const banned = [
  /node:crypto/,
  /babylon/i,
  /havok/i,
  /ParsedAgentInvitation/,
  /invitationSecret/,
  /preferredSeatId/,
  /WebSocket\s*\(/,
];
const violations = [];
for (const file of files) {
  const source = await readFile(file, "utf8");
  for (const pattern of banned)
    if (pattern.test(source)) violations.push(`${file}: ${pattern}`);
}
if (violations.length)
  throw new Error(
    `Private/runtime-specific surface leaked:\n${violations.join("\n")}`,
  );
console.log(`Public surface verified (${files.length} files).`);
