# Pokémon Stat Block Embeds for Obsidian

Turns Pokémon Showdown exports and pokepast.es links into compact team cards inside Obsidian (desktop + mobile).

## Install
Copy this folder to `<vault>/.obsidian/plugins/obsidian-pokemon-statblock-embeds/` (the folder name must match the `id` in `manifest.json`, and it must contain `main.js`, `manifest.json`, `styles.css`), then enable **Pokemon Stat Block Embeds** in *Settings → Community plugins*.

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

## Stats
Every card shows the six final stats as bars, calculated from the species' base stats, level, IVs, nature and EVs.

- Solid bar: the stat before any EVs. Bright extension: what the EVs (or stat points) add. The number is the final stat.
- `+` / `−` next to a label (and a green / red number) marks the nature's boosted / lowered stat.
- All bars in one block share a single scale, so lengths compare directly between stats and between Pokémon. Tap or hover a stat for its exact breakdown.
- Pokémon Champions spreads (max 32 per stat, 66 total, +1 stat per point) are detected automatically. Override under *Settings → Spread format*.

Types, name colors, move types and item icons come from Pokémon Showdown's data (downloaded once, cached, refreshed weekly). Sprites load from play.pokemonshowdown.com, so the first view needs a connection.
