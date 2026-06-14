---
name: nieuwe-plant
description: Voeg een nieuwe plant toe aan data/plants.json volgens de conventies van de site (gecontroleerde tags, seizoenskalender, gestructureerde giftige verwisselingen, status draft + bronnen). Gebruik wanneer de eigenaar een plant wil toevoegen of bewerken.
disable-model-invocation: true
---

# Nieuwe plant toevoegen

Voegt een plant toe aan `data/plants.json` (de enige contentbron; geen build-stap).

## Stappen

1. Vraag (of leid af) de basis: Nederlandse naam, Latijnse naam, familie.
2. Vul de overige velden in. Kort en feitelijk, in het Nederlands.
3. **Onderzoek + fact-check** de veiligheidsvelden via de `foraging-fact-checker` subagent vóór je iets als zeker presenteert. Pas de correcties toe.
4. Zet `status: "draft"` en vul echte `bronnen` (URL's). Markeer NOOIT zelf als `"verified"` — dat doet de eigenaar.
5. Voeg het object toe aan de array in `data/plants.json`. De PostToolUse-hook valideert de JSON + integriteit automatisch.
6. Verifieer in de browser: `python -m http.server` in de repo, open `plant.html?plant=<id>`.

## Gecontroleerde vocabulaire (belangrijk — anders fragmenteren de filters)

- `locaties` (kies uit, hergebruik bestaande): `langs de weg`, `bos`, `stad`, `park`, `langs rivier`, `duinen`, `moestuin`, `akker`, `heide`, `grasland`. Nuance over habitat → in het prozaveld `ecosysteem`, niet in `locaties`.
- `eetbareDelen` (coarse): `blad`, `bloem`, `bloemknop`, `jonge scheut`, `stengel`, `wortel`, `knol`, `zaad`, `zaailing`, `vrucht`, `noot`, `naald`, `bast`, `katje`.

## Schema (één object in de array)

```json
{
  "id": "kleine-letters-uniek",
  "naam": "Naam",
  "latijn": "Genus species",
  "familie": "Nederlandse familienaam (Latijn)",
  "afbeelding": "Afbeeldingen/bestand.jpg",
  "afbeeldingen": [],
  "ecosysteem": "habitat in proza",
  "locaties": ["bos", "park"],
  "eetbareDelen": ["blad"],
  "oogstbareDelen": ["blad"],
  "seizoenskalender": [
    { "deel": "blad", "maanden": [3,4,5], "toepassing": "salade, soep" }
  ],
  "oogstmethode": "...",
  "wildplukGevolgen": "...",
  "verwisselingIntro": "",
  "giftigeVerwisseling": [
    { "naam": "Verwisselplant", "latijn": "Genus species", "giftig": true, "onderscheid": "hoe te onderscheiden" }
  ],
  "waarschuwing": "",
  "gebruik": "wat kan ik ermee?",
  "recept": "",
  "info": "achtergrond",
  "bronnen": ["https://..."],
  "status": "draft"
}
```

Een ontbrekende foto is geen probleem: de site toont automatisch een SVG-placeholder.
