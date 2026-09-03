/* global console */
import Ajv from "ajv";
import { createServer } from "vite";

const server = await createServer({
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});
try {
  const { getPlayWebMcpToolSchemas } = await server.ssrLoadModule(
    "/src/runtime/register-tools.ts",
  );
  const schemas = getPlayWebMcpToolSchemas();
  if (schemas.length !== 7)
    throw new Error(`Expected seven schemas, received ${schemas.length}.`);
  for (const { inputSchema, name } of schemas) {
    const text = JSON.stringify(inputSchema);
    if (/"(?:sessionId|server|invitation)"/.test(text))
      throw new Error(`${name} exposes a private transport field.`);
    new Ajv({
      strict: true,
      strictRequired: false,
      strictTypes: false,
    }).compile(inputSchema);
  }
  console.log("Seven strict WebMCP schemas verified.");
} finally {
  await server.close();
}
