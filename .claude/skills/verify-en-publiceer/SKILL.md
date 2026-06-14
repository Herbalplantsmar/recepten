---
name: verify-en-publiceer
description: Loop draft-plantcontent na, laat de eigenaar verifiëren, en publiceer naar GitHub Pages (commit + push). Gebruik wanneer content gecontroleerd en live gezet moet worden.
disable-model-invocation: true
---

# Verifiëren & publiceren

Brengt gecontroleerde content live. Regel: **alleen de eigenaar zet `status` op `"verified"`** — jij doet dat nooit zelf.

## Stappen

1. **Selecteer** de plant(en) met `status: "draft"` die nagekeken moeten worden (`data/plants.json`).
2. **Onafhankelijke check:** draai per plant de `foraging-fact-checker` subagent (web-bronnen, adversarieel) op `eetbareDelen`, `giftigeVerwisseling`, `waarschuwing`. Pas correcties toe; houd `status` op `"draft"`.
3. **Toon de eigenaar** per plant een samenvatting (eetbare delen, giftige verwisselingen, waarschuwingen + bronnen) en vraag expliciet om akkoord.
4. **Na akkoord van de eigenaar:** zet `status` op `"verified"` voor die plant(en). De PostToolUse-hook valideert de JSON.
5. **Visuele controle:** `python -m http.server` in de repo, open de pagina('s), check de browserconsole op fouten.
6. **Publiceren:** commit de gewijzigde `data/*.json` en push naar `origin` (https://github.com/Herbalplantsmar/recepten). GitHub Pages (root, `.nojekyll`) zet het automatisch live.

## Let op
- Push alleen wanneer de eigenaar dat wil.
- Bewaar de eigen recept-/voice-tekst (`recept`, `data/recipes.json`) verbatim.
- Eet-/veiligheidsclaims nooit overdrijven of giftige verwisselingen weglaten.
