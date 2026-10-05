# Pokemon Stat Block Embeds

Render Pokémon Showdown sets, Pokepaste links, and team stat blocks as clean inline cards in Obsidian.

![vgy.me](https://i.vgy.me/ePDwBA.png)

## Features

- Animated, pixel, or HD sprites, including shiny, female, and Mega forms
- Real final stats calculated from level, nature, IVs, and EVs
- **Pokémon Champions support**: stat point spreads are auto-detected
- Type-colored cards with tera types, item icons, and move details on hover
- Copy button for teams, plus 1 to 3 column layouts

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

## Installation

**Community plugins:** [Install from the Obsidian community page](https://community.obsidian.md/plugins/pokemon-statblock-embeds)

**BRAT:** add this repository in [BRAT](https://github.com/TfTHacker/obsidian42-brat).

**Manual:** copy `main.js`, `manifest.json`, and `styles.css` into `<vault>/.obsidian/plugins/pokemon-statblock-embeds/` and enable the plugin.

## Credits

Data and sprites from [Pokémon Showdown](https://pokemonshowdown.com) and [Pokepaste](https://pokepast.es). Pokémon is a trademark of Nintendo, Game Freak, and Creatures Inc.; this project isn't affiliated with them.

## License

[GPL-3.0](LICENSE)
