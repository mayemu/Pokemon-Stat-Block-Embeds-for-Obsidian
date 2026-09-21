# Pokémon Stat Block Embeds for Obsidian

Turns Pokémon Showdown exports and pokepast.es links into visually pleasing compact cards inside your Obsidian notes. 

## Features
- Visually optimized for both mobile and desktop clients
- Pokemon, moves, and typings are colored as they are in game
- Animated Pokémon sprites
- Icons for items
- Stat spreads displayed in a bar graph
- ...and more!

## Preview
<img width="932" height="1206" alt="image" src="https://github.com/user-attachments/assets/7a665daa-6fae-4d9e-bfe1-16f87ebb4bb6" />


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

## Notes
- Pokémon Champions spreads (max 32 per stat, 66 total, +1 stat per point) are detected automatically. Override under *Settings → Spread format*.
- Types, name colors, move types and item icons come from Pokémon Showdown's data (downloaded once, cached, refreshed weekly). Sprites load from play.pokemonshowdown.com, so the first view needs a connection.
