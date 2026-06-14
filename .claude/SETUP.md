# Claude Code automatisering — opzet

Deze repo bevat afgestemde Claude Code-automatisering. Overzicht + wat je zelf moet regelen.

## Wat er actief is (automatisch)

- **Hook — data-guard** (`.claude/hooks/validate_data.py`, via `.claude/settings.json`):
  draait na elke `Write`/`Edit` op `data/*.json`. Blokkeert/meldt ongeldige JSON, dubbele
  plant-id's, ontbrekende verplichte velden en recept→plant-links die niet bestaan.
  Vereist `python` op PATH.

## Subagents (`.claude/agents/`)

- **foraging-fact-checker** — controleert eetbaarheid/giftige verwisselingen adversarieel tegen
  webbronnen. Gebruik vóór je een plant op `verified` zet. Vereist web-tools (WebSearch/WebFetch).
- **content-integrity-reviewer** — leest een contentwijziging na op schema, gecontroleerde tags en integriteit.

Aanroepen: vraag Claude bijv. "laat de foraging-fact-checker heermoes checken".

## Skills (`.claude/skills/`) — handmatig aanroepen

- `/nieuwe-plant` — plant toevoegen volgens de conventies.
- `/verify-en-publiceer` — draft nakijken, eigenaar laat verifiëren, commit + push.

(Beide zijn user-only: ze hebben bijwerkingen, dus Claude start ze niet vanzelf.)

## MCP-servers (`.mcp.json`)

- **playwright** — werkt direct via `npx` (Node vereist). De enige manier om de site te testen:
  pagina's renderen, console-fouten checken, screenshots.
- **github** — remote MCP voor issues/PR's/Pages. **Vereist een token.** Zet een GitHub
  Personal Access Token in de omgeving als `GITHUB_PAT` vóór je Claude start, bijv. (PowerShell):
  `setx GITHUB_PAT "ghp_..."` (nieuwe shell daarna). Zonder token verbindt alleen deze server niet;
  Playwright blijft werken. Geen token? Gebruik de `gh` CLI als alternatief, of verwijder het
  `github`-blok uit `.mcp.json`.

> Commit nooit een echte token. `${GITHUB_PAT}` wordt uit de omgeving gelezen.
