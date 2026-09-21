# Pokémon Stat Block Embeds for Obsidian

Turns Pokémon Showdown exports and pokepast.es links into compact team cards inside Obsidian.

## Install
Copy this folder to `<vault>/.obsidian/plugins/pokepaste-viewer/` (must contain `main.js`, `manifest.json`, `styles.css`), then enable **Poképaste Viewer** in *Settings → Community plugins*.

## Use
Just paste a Showdown export or a `https://pokepast.es/...` link into a note — it is wrapped in a code block automatically.
Or write it yourself:

````
```pokepaste
Salamence-Mega (M) @ Salamencite
Ability: Aerilate
Level: 50
Shiny: Yes
EVs: 1 HP / 32 Atk / 1 SpD / 32 Spe
Adamant Nature
- Dragon Dance
- Double-Edge
- Earthquake
- Roost
```
````

Fence names: `pokepaste`, `showdown`, `pokemon`, `pkmn`. Multiple Pokémon, nicknames, `=== [format] Team name ===` headers and pokepast.es URLs all work.

Types, name colors, move types and item icons come from Pokémon Showdown's data (downloaded once, cached, refreshed weekly). Sprites load from play.pokemonshowdown.com, so the first view needs a connection.
