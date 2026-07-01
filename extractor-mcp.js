#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DS_PATH = path.join(__dirname, "design-system.html");
const CSS_PATH = path.join(__dirname, "base.css");
const ASSETS_DIR = path.join(__dirname, "assets");

/* ---------- carga perezosa + cache en memoria ---------- */
let _html = null, _style = null;
function html() { return (_html ??= fs.readFileSync(DS_PATH, "utf-8")); }
function style() {
  if (_style == null) {
    const m = html().match(/<style[^>]*>([\s\S]*?)<\/style>/i);
    _style = m ? m[1] : "";
  }
  return _style;
}

/* ---------- utilidades ---------- */
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Extrae <tag ...>...</tag> balanceando anidados: recorre <tag / </tag> en orden.
function extractTag(src, startIdx, tag) {
  const re = new RegExp(`<${tag}\\b|</${tag}>`, "gi");
  re.lastIndex = startIdx;
  let depth = 0, m;
  while ((m = re.exec(src))) {
    if (m[0][1] === "/") depth--; else depth++;
    if (depth === 0) return src.slice(startIdx, re.lastIndex);
  }
  return null;
}

// Todas las clases usadas en un fragmento HTML.
function classesIn(fragment) {
  const set = new Set();
  const re = /class=["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(fragment))) m[1].split(/\s+/).forEach((c) => c && set.add(c));
  return set;
}

// Divide CSS en bloques de primer nivel { ... } balanceando llaves.
function splitRules(css) {
  const rules = [];
  let depth = 0, buf = "";
  for (const ch of css) {
    buf += ch;
    if (ch === "{") depth++;
    else if (ch === "}" && --depth === 0) { rules.push(buf.trim()); buf = ""; }
  }
  return rules.filter(Boolean);
}

function selectorMatches(selector, classSet) {
  for (const cls of classSet) {
    if (new RegExp(`\\.${escRe(cls)}(?![\\w-])`).test(selector)) return true;
  }
  return false;
}

// ponytail: devuelve solo reglas que tocan las clases dadas. @keyframes/@font-face
// NO se incluyen (raro que se necesiten); si un componente depende de un keyframe
// propio, pedir el CSS completo con tokens/animaciones.
function scopedCss(classSet) {
  const out = [];
  for (const rule of splitRules(style())) {
    const brace = rule.indexOf("{");
    const head = rule.slice(0, brace).trim();
    if (head.startsWith("@media") || head.startsWith("@supports")) {
      const inner = rule.slice(brace + 1, rule.lastIndexOf("}"));
      const kept = splitRules(inner).filter((r) => {
        const h = r.slice(0, r.indexOf("{")).trim();
        return !h.startsWith("@") && selectorMatches(h, classSet);
      });
      if (kept.length) out.push(`${head} {\n${kept.join("\n")}\n}`);
    } else if (!head.startsWith("@") && selectorMatches(head, classSet)) {
      out.push(rule);
    }
  }
  return out.join("\n");
}

// Detecta qué animaciones de animations.js aplican al fragmento.
const HOOKS = [
  [/class=["'][^"']*\breveal\b/, ".reveal → fade-in al entrar en viewport (stagger automático)."],
  [/\bdata-count=/, "[data-count] → conteo animado 0→N (data-count-suffix/prefix/decimals)."],
  [/class=["'][^"']*\bgantt-(grid|bar)\b/, ".gantt-grid + .gantt-bar → barras Gantt por data-start/end/from/to."],
  [/class=["'][^"']*\bdist-bar\b/, ".dist-bar[data-width] → barra que crece a data-width%."],
  [/id=["']scroll-progress["']/, "#scroll-progress → barra de progreso de scroll."],
  [/class=["'][^"']*\btimeline-pulse\b/, ".timeline-pulse → anillo pulsante (keyframe inyectado en runtime)."],
];
function animHooks(fragment) {
  const hits = HOOKS.filter(([re]) => re.test(fragment)).map(([, t]) => t);
  return hits.length ? hits.join("\n") + "\n(requiere animations.js cargado)" : "";
}

function assetsIn(fragment) {
  const set = new Set();
  const re = /(?:src|href)=["'](assets\/[^"']+)["']/g;
  let m;
  while ((m = re.exec(fragment))) set.add(m[1]);
  return [...set];
}

/* ---------- lógica de herramientas ---------- */
function catalogo() {
  const src = html();
  const re = /<section\b[^>]*\bid=["']([^"']+)["'][^>]*>/gi;
  const lines = [];
  let m;
  while ((m = re.exec(src))) {
    const frag = extractTag(src, m.index, "section") ?? "";
    const eyebrow = (frag.match(/class=["'][^"']*section-eyebrow[^"']*["'][^>]*>([^<]+)/i) || [])[1];
    const title = (frag.match(/class=["'][^"']*section-title[^"']*["'][^>]*>([^<]+)/i) || [])[1];
    lines.push(`${m[1]}${title ? ` — ${title.trim()}` : ""}${eyebrow ? ` (${eyebrow.trim()})` : ""}`);
  }
  return lines.length ? lines.join("\n") : "Sin secciones con id.";
}

function componente(clave) {
  const src = html();
  // 1) intento por id de sección
  let frag = null;
  const idRe = new RegExp(`<section\\b[^>]*\\bid=["']${escRe(clave)}["'][^>]*>`, "i");
  const idm = src.match(idRe);
  if (idm) frag = extractTag(src, idm.index, "section");
  // 2) si no, por clase en cualquier tag
  if (!frag) {
    const clsRe = new RegExp(`<([a-z0-9]+)\\b[^>]*class=["'][^"']*\\b${escRe(clave)}\\b`, "i");
    const cm = src.match(clsRe);
    if (cm) {
      const tag = cm[1].toLowerCase();
      const VOID = new Set(["img", "input", "br", "hr", "meta", "link", "source", "area", "col", "embed", "track", "wbr"]);
      frag = VOID.has(tag)
        ? src.slice(cm.index, src.indexOf(">", cm.index) + 1)
        : extractTag(src, cm.index, tag);
    }
  }
  if (!frag) return `No encontré componente por id ni clase: ${clave}`;

  const classes = classesIn(frag);
  const css = scopedCss(classes);
  const anim = animHooks(frag);
  const assets = assetsIn(frag);

  return [
    "<!-- HTML -->",
    frag,
    "\n/* CSS (solo reglas usadas) */",
    css || "/* sin reglas específicas; usa tokens de base.css */",
    anim && `\n<!-- ANIMACIONES -->\n${anim}`,
    assets.length && `\n<!-- ASSETS -->\n${assets.join("\n")}`,
  ].filter(Boolean).join("\n");
}

function tokens(grupo) {
  let css;
  try { css = fs.readFileSync(CSS_PATH, "utf-8"); } catch { return "base.css no encontrado."; }
  const root = (css.match(/:root\s*{([\s\S]*?)}/) || [])[1] || "";
  const lines = root.split("\n").map((l) => l.trim()).filter((l) => l.startsWith("--"));
  const out = grupo ? lines.filter((l) => l.toLowerCase().includes(grupo.toLowerCase())) : lines;
  return out.length ? out.join("\n") : `Sin tokens para grupo: ${grupo}`;
}

function assets(filtro) {
  let files;
  try { files = fs.readdirSync(ASSETS_DIR); } catch { return "Carpeta assets no encontrada."; }
  files = files.filter((f) => f !== ".DS_Store");
  if (filtro) files = files.filter((f) => f.toLowerCase().includes(filtro.toLowerCase()));
  return files.length ? files.map((f) => `assets/${f}`).join("\n") : `Sin assets para: ${filtro}`;
}

/* ---------- servidor MCP ---------- */
const TOOLS = [
  {
    name: "catalogo",
    description: "Lista todas las secciones/componentes del design system (id + título). Úsalo al planear para saber qué existe sin leer el HTML.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "componente",
    description: "Devuelve todo lo necesario para reproducir un componente: HTML + solo su CSS + animaciones que usa + assets. Acepta un id de sección (ej. 'buttons') o una clase CSS.",
    inputSchema: {
      type: "object",
      properties: { clave: { type: "string", description: "id de sección o clase CSS del componente." } },
      required: ["clave"],
    },
  },
  {
    name: "tokens",
    description: "Devuelve los design tokens (variables CSS de base.css). Opcional: filtra por grupo (color, space, radius, shadow, font, text, blue, estado...).",
    inputSchema: {
      type: "object",
      properties: { grupo: { type: "string", description: "Substring para filtrar tokens. Vacío = todos." } },
    },
  },
  {
    name: "assets",
    description: "Lista rutas de assets (svg/png). Opcional: filtra por nombre (ej. 'logo', 'react', 'stock').",
    inputSchema: {
      type: "object",
      properties: { filtro: { type: "string", description: "Substring para filtrar. Vacío = todos." } },
    },
  },
];

export { catalogo, componente, tokens, assets };

async function main() {
  const server = new Server({ name: "EDS-MCP", version: "2.0.0" }, { capabilities: { tools: {} } });
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));
  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: a = {} } = req.params;
    try {
      let text;
      if (name === "catalogo") text = catalogo();
      else if (name === "componente") text = componente(a.clave);
      else if (name === "tokens") text = tokens(a.grupo);
      else if (name === "assets") text = assets(a.filtro);
      else return { content: [{ type: "text", text: `Herramienta desconocida: ${name}` }], isError: true };
      return { content: [{ type: "text", text }] };
    } catch (e) {
      return { content: [{ type: "text", text: `Error: ${e.message}` }], isError: true };
    }
  });
  await server.connect(new StdioServerTransport());
}

// Arranca el server solo si se ejecuta directo (no al importar en tests).
if (process.argv[1] === __filename) main();
