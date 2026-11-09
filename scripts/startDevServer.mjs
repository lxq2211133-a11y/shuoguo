import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

process.env.CI = "true";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const logPath = path.join(root, "vite-dev.log");
const errorLogPath = path.join(root, "vite-dev.err.log");

function writeLog(filePath, message) {
  fs.writeFileSync(filePath, `${new Date().toISOString()} ${message}\n`);
}

process.on("uncaughtException", (error) => {
  writeLog(errorLogPath, error.stack || String(error));
  process.exit(1);
});

process.on("unhandledRejection", (error) => {
  writeLog(errorLogPath, error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});

const { createServer } = await import("vite");

const server = await createServer({
  configFile: "vite.config.ts",
  logLevel: "silent",
  server: {
    host: "127.0.0.1",
    port: 5174,
    strictPort: true,
  },
});

await server.listen();
writeLog(logPath, "Vite dev server ready at http://127.0.0.1:5174/");
