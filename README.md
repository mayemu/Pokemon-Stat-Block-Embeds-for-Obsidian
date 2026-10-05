# Pokemon Stat Block Embeds

Render Pokémon Showdown sets, Pokepaste links, and team stat blocks as clean inline cards in Obsidian.

![vgy.me](https://i.vgy.me/jbVlVX.png)

## Features

- Sprites in animated, pixel, or HD style, with support for shiny, gendered, regional, and alternate forms (Mega, Gigantamax, etc.)
- Real final stats calculated from level, nature, IVs, and EVs
- **Pokémon Champions support**: stat point spreads are auto-detected
- Type-colored cards with tera types, item icons, and move details on hover
- Copy button for teams, plus 1 to 3 column layouts
- Designed to look clean and readable on both desktop and mobile, with cards that adapt to your note width and always stack in a single column on narrow screens

## Usage

Put a Showdown export or a Pokepaste link in a `pokepaste` code block:

````
```pokepaste
Lurantis @ Leftovers
Ability: Contrary
EVs: 252 HP / 40 Def / 216 Spe
Bold Nature
- Defog
- Leaf Storm
- Superpower
- Synthesis
```
````

````
```pokepaste
https://pokepast.es/xxxxxxxxxxxxxxxx
```
````

Pasting a team or Pokepaste link into a note wraps it for you automatically.

## Settings

| Setting | Options | What it does |
| --- | --- | --- |
| Sprite style | Animated, Pixel, HD | Animated uses Showdown's battle sprites, Pixel uses the classic Gen 5 look, HD uses the static dex art |
| Spread format | Auto, EVs, Stat points | How the numbers on the `EVs:` line are read. Auto treats small spreads (max 32 per stat, 66 total) as Pokémon Champions stat points |
| Columns | Auto, 1, 2, 3 | Auto fits as many cards as your note width allows. Narrow screens always use one column |
| Show species types | On / Off | Show or hide the type badges on each card |
| Show item icons | On / Off | Show or hide the held item icon |
| Copy button on teams | On / Off | Adds a Copy button above teams with two or more Pokémon |
| Auto-wrap pasted teams | On / Off | Wraps pasted Showdown exports and pokepast.es links in a code block for you |
| Pokémon data | Refresh button | Types, colors, moves, and item icons come from Pokémon Showdown and refresh weekly. You can update manually here |

Some changes apply after you reopen the note.

## Installation

**Community plugins:** [Install from the Obsidian community page](https://community.obsidian.md/plugins/pokemon-statblock-embeds)

**BRAT:** add this repository in [BRAT](https://github.com/TfTHacker/obsidian42-brat).

**Manual:** copy `main.js`, `manifest.json`, and `styles.css` into `<vault>/.obsidian/plugins/pokemon-statblock-embeds/` and enable the plugin.

## Credits

Data and sprites from [Pokémon Showdown](https://pokemonshowdown.com) and [Pokepaste](https://pokepast.es). Pokémon is a trademark of Nintendo, Game Freak, and Creatures Inc.; this project isn't affiliated with them.

## License

[GPL-3.0](LICENSE)