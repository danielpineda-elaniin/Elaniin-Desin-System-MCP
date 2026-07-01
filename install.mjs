import fs from "fs";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const server = path.join(dir, "extractor-mcp.js");

const configDir = process.platform === "win32"
  ? path.join(process.env.APPDATA, "Claude")
  : path.join(os.homedir(), "Library", "Application Support", "Claude");
const configFile = path.join(configDir, "claude_desktop_config.json");

fs.mkdirSync(configDir, { recursive: true });

let config = {};
if (fs.existsSync(configFile)) {
  try { config = JSON.parse(fs.readFileSync(configFile, "utf-8")); }
  catch { console.error("Config existente ilegible, abortando para no perder datos."); process.exit(1); }
}
config.mcpServers ??= {};
delete config.mcpServers.extractor; // limpia nombre viejo
config.mcpServers["EDS-MCP"] = { command: "node", args: [server] };

fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
console.log("Instalado. Reinicia Claude Desktop.");
