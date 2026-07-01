import assert from "assert";
import { catalogo, componente, tokens, assets } from "./extractor-mcp.js";

// catalogo lista secciones conocidas
assert.match(catalogo(), /buttons/, "catalogo debe incluir 'buttons'");

// componente por id trae HTML + su CSS
const btn = componente("buttons");
assert.match(btn, /<section[^>]*id="buttons"/, "componente(id) debe traer la sección");
assert.match(btn, /\.btn\b/, "componente debe incluir CSS scopeado de .btn");

// componente por clase (elemento no div/section) trae solo su regla
const dot = componente("badge-dot");
assert.match(dot, /\.badge-dot\s*{/, "componente(clase) debe traer CSS de la clase");
assert.ok(dot.length < 1000, "extracción por clase debe ser compacta");

// no encontrado
assert.match(componente("no-existe-xyz"), /No encontré/, "clave inexistente");

// tokens filtra por grupo
assert.match(tokens("radius"), /--radius-md/, "tokens('radius')");
assert.ok(!tokens("radius").includes("--space-1"), "filtro no debe traer otros grupos");

// assets filtra
assert.strictEqual(assets("react").trim(), "assets/react.svg", "assets('react')");

console.log("OK — todos los checks pasaron");
