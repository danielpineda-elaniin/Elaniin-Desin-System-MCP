# EDS-MCP — Elaniin Design System MCP

Servidor MCP que expone el **Elaniin Design System** a Claude Desktop: catálogo de componentes, código de cada componente, design tokens y assets.

## Herramientas

| Tool | Descripción |
|------|-------------|
| `catalogo` | Lista todos los componentes disponibles. |
| `componente` | Devuelve el código HTML/CSS de un componente. |
| `tokens` | Devuelve los design tokens (colores, tipografía, etc.). |
| `assets` | Lista/entrega los assets del sistema. |

> ⚠️ **Este es un MCP local (stdio), no un conector remoto.**
> NO se instala pegando el nombre + link en Claude ("Agregar conector").
> Si lo intentas verás un error de OAuth (`No se pudo registrar con el servicio de inicio de sesión... ofid_...`).
> Corre en la máquina del usuario vía `npx` o clonando el repo (ver abajo).

## Requisitos

- [Node.js](https://nodejs.org) 18+
- [Claude Desktop](https://claude.ai/download)

## Instalación rápida (npx) ⭐

Sin clonar nada. Agrega esto a tu `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "EDS-MCP": {
      "command": "npx",
      "args": ["-y", "elaniin-eds-mcp"]
    }
  }
}
```

Ubicación de la config:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

Reinicia Claude Desktop. `npx` descarga y cachea el paquete automáticamente.

> En Claude Code / CLI:
> ```bash
> claude mcp add EDS-MCP -- npx -y elaniin-eds-mcp
> ```

## Instalación desde GitHub (alternativa)

### 1. Clonar el repo

```bash
git clone https://github.com/danielpineda-elaniin/Elaniin-Desin-System-MCP.git
cd Elaniin-Desin-System-MCP
```

### 2. Ejecutar el instalador

**macOS**
```bash
./instalar.command
```
> Si no abre: clic derecho → Abrir, o `chmod +x instalar.command` y reintenta.

**Windows**

Doble clic en `instalar.bat` (o ejecútalo en cmd).

El instalador hace `npm install` y registra el servidor en la config de Claude Desktop automáticamente.

### 3. Reiniciar Claude Desktop

Cierra y abre Claude Desktop. El MCP `EDS-MCP` aparece disponible.

## Instalación manual (alternativa)

```bash
git clone https://github.com/danielpineda-elaniin/Elaniin-Desin-System-MCP.git
cd Elaniin-Desin-System-MCP
npm install --omit=dev
node install.mjs
```

`install.mjs` agrega esto a tu `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "EDS-MCP": {
      "command": "node",
      "args": ["/ruta/absoluta/a/extractor-mcp.js"]
    }
  }
}
```

Ubicación de la config:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

> No muevas la carpeta del repo después de instalar: la config apunta a la ruta absoluta.

## Desinstalar

**macOS**
```bash
./desinstalar.command
```

**Windows** — doble clic en `desinstalar.bat`

Manual:
```bash
node uninstall.mjs
```

Reinicia Claude Desktop después.

## Problemas comunes

**"No se pudo registrar con el servicio de inicio de sesión de EDS-MCP… ofid_…"**
Estás intentando agregarlo como conector remoto por URL. Este MCP es local: no uses "Agregar conector". Clona el repo y corre el instalador (ver arriba).

**El MCP no aparece tras instalar**
Reinicia Claude Desktop por completo (cerrar desde la barra, no solo la ventana).

**Moviste la carpeta y dejó de funcionar**
La config apunta a la ruta absoluta de `extractor-mcp.js`. Vuelve a correr el instalador desde la nueva ubicación.

## Uso

Ya en Claude Desktop, pregunta cosas como:

- "Muestra el catálogo del design system" → `catalogo`
- "Dame el código del componente button" → `componente`
- "Lista los design tokens" → `tokens`
