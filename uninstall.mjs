import fs from "fs";
import path from "path";
import os from "os";

const configDir = process.platform === "win32"
  ? path.join(process.env.APPDATA, "Claude")
  : path.join(os.homedir(), "Library", "Application Support", "Claude");
const configFile = path.join(configDir, "claude_desktop_config.json");

if (!fs.existsSync(configFile)) {
  console.log("No hay config de Claude. Nada que desinstalar.");
  process.exit(0);
}

let config;
try { config = JSON.parse(fs.readFileSync(configFile, "utf-8")); }
catch { console.error("Config ilegible, abortando para no perder datos."); process.exit(1); }

const KEYS = ["EDS-MCP", "extractor"]; // nueva y vieja
let removed = 0;
if (config.mcpServers) {
  for (const k of KEYS) {
    if (config.mcpServers[k]) { delete config.mcpServers[k]; removed++; }
  }
}

fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
console.log(removed ? `Desinstalado (${removed} entrada(s)). Reinicia Claude Desktop.`
                    : "No estaba instalado. Nada que quitar.");
