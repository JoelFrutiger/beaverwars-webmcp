/* global console */
import { build } from "vite";

const result = await build({
  configFile: false,
  build: {
    lib: { entry: "src/index.ts", formats: ["es"], name: "BeaverWarsWebMcp" },
    rollupOptions: { external: ["zod/v4"] },
    write: false,
  },
  logLevel: "silent",
});
const outputs = Array.isArray(result) ? result : [result];
const modules = outputs.flatMap(({ output }) =>
  output.flatMap((item) =>
    item.type === "chunk" ? Object.keys(item.modules) : [],
  ),
);
const banned = [
  /node:/i,
  /babylon/i,
  /havok/i,
  /play-service/i,
  /src[\\/]main\.ts/i,
];
const violations = modules.filter((id) =>
  banned.some((pattern) => pattern.test(id)),
);
if (violations.length)
  throw new Error(
    `Browser graph contains banned modules:\n${violations.join("\n")}`,
  );
console.log(`Browser graph verified (${modules.length} modules).`);
