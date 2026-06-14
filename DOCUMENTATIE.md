# Documentatie — HerbalPlantsMar

De technische kant van de site: hoe je planten en recepten toevoegt, hoe alles in
elkaar zit, en hoe je de site lokaal draait en publiceert. Voor de site zelf, zie de
[README](README.md).

Statische site, geen build-stap, draait op GitHub Pages.

## Structuur

```
index.html        Plantenoverzicht: galerij + zoeken + filters (locatie / eetbaar deel / seizoen)
plant.html        Detailpagina van één plant  (plant.html?plant=<id>)
recepten.html     Recepten, filterbaar op seizoen + links naar de benodigde planten
seizoen.html      "Dit seizoen" — toont automatisch wat je nu kunt oogsten (op basis van de datum)
projecten.html    Wildplukwandelingen, workshops en proeverijen
over.html         Over HerbalPlantsMar
sign-up.html      Diner-inschrijving
diner-fotos.html  Foto's van vorige diners
admin.html        Formulier dat JSON genereert om een plant toe te voegen/bewerken (geen code nodig)

app.js            De hele site-logica (één bestand, rendert elke pagina vanuit de data)
style.css         Vormgeving / design system
favicon.svg       Icoon

data/plants.json   Bron van alle planten  ← hier voeg je planten toe/bewerk je ze
data/recipes.json  Bron van alle recepten

Afbeeldingen/      Foto's
```

De pagina's zijn dunne schillen; `app.js` kiest wat te tonen op basis van `<body data-page="…">`
en leest alle inhoud uit `data/plants.json` en `data/recipes.json`.

## Een plant toevoegen of bewerken

**Makkelijkste manier:** open `admin.html` in de browser, vul de velden in, klik **Genereer JSON**,
en **Kopieer** of **Download** het blok. Plak het in de lijst in `data/plants.json` en commit.

**Of handmatig:** voeg een object toe aan de array in `data/plants.json`. Velden:

| veld | uitleg |
|------|--------|
| `id` | uniek, kleine letters, geen spaties (bv. `brandnetel`) — gebruikt in de URL |
| `naam`, `latijn`, `familie` | namen |
| `afbeelding` | pad naar hoofdfoto (bv. `Afbeeldingen/IMG_7433.jpg`). Ontbreekt de foto? Dan toont de site automatisch een nette placeholder. |
| `afbeeldingen` | lijst met extra foto's (mag leeg `[]`) |
| `ecosysteem` | habitat |
| `locaties` | lijst, bv. `["bos","stad","langs de weg"]` — voedt het locatiefilter |
| `eetbareDelen`, `oogstbareDelen` | lijsten, bv. `["blad","bloem"]` — voeden het delen-filter |
| `seizoenskalender` | lijst van `{ "deel": "...", "maanden": [3,4,5], "toepassing": "..." }`. Maanden zijn nummers 1–12. Dit voedt de pagina **Dit seizoen** en het seizoensfilter. |
| `oogstmethode` | hoe te oogsten |
| `wildplukGevolgen` | duurzaamheid / impact |
| `verwisselingIntro` | optionele algemene opmerking boven de verwisselingenlijst (`""` als geen) |
| `giftigeVerwisseling` | **belangrijk:** een **lijst** van verwisselplanten. Elk item: `{ "naam": "...", "latijn": "...", "giftig": true/false, "onderscheid": "hoe te onderscheiden" }`. In `admin.html` typ je één regel per plant: `naam \| latijn \| giftig(ja/nee) \| onderscheid`. |
| `waarschuwing` | risico's (rauw giftig, allergie, vervuilde grond…), `""` als geen |
| `gebruik` | "wat kan ik ermee?" |
| `recept` | bereidingstekst (mag `""`; losse recepten staan in `recipes.json`) |
| `info` | achtergrond |
| `bronnen` | lijst met bron-URL's |
| `status` | `"draft"` = nog te controleren (toont een waarschuwingsbanner) · `"verified"` = door jou nagekeken |

### Een recept toevoegen (`data/recipes.json`)

```json
{
  "id": "uniek-id",
  "titel": "Titel van het recept",
  "seizoenen": ["lente","zomer"],
  "planten": ["brandnetel"],
  "andereIngredienten": ["ui","bouillon"],
  "bereiding": "Stappen…",
  "bron": "eigen recept",
  "status": "verified"
}
```

`planten` verwijst naar `id`'s uit `plants.json` — die worden klikbare links op de receptenpagina.

## ⚠️ Inhoud & veiligheid

De plantbeschrijvingen met `"status": "draft"` zijn opgesteld op basis van openbare
bronnen en zijn **nog niet door jou geverifieerd**. De site toont daarom een waarschuwingsbanner.
Loop ze na, corrigeer waar nodig (let vooral op `eetbareDelen`, `giftigeVerwisseling` en `waarschuwing`),
en zet de status op `"verified"` zodra je ze vertrouwt. Eet nooit een plant zonder 100% zekere determinatie.

Elke plant heeft een veld `verificatie` met de uitkomst van een automatische, kritische tweede controle
(o.a. `verdict` en `corrections`). Gebruik dat als hulp bij je eigen nacontrole.

## Lokaal bekijken

`fetch()` van de data-bestanden werkt niet via `file://`. Start een lokale server:

```bash
python -m http.server 8000
# open http://localhost:8000
```

## Publiceren (GitHub Pages)

`.nojekyll` staat in de repo. Zet GitHub Pages aan op de `main`-branch (root); de site is dan
direct online. Commit gewoon je wijzigingen in `data/*.json` om inhoud bij te werken.
