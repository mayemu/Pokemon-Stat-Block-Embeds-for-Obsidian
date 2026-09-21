'use strict';
/*
 * Pokémon Stat Block Embeds for Obsidian
 * Renders Pokémon Showdown / Poképaste exports as compact, mobile-safe cards.
 *
 * Data:    play.pokemonshowdown.com/data (pokedex, moves, items) — cached locally, refreshed weekly
 * Sprites: play.pokemonshowdown.com/sprites (animated / dex / gen5, shiny + female variants)
 */
const { Plugin, PluginSettingTab, Setting, Notice, requestUrl } = require('obsidian');

/* ───────────────────────────── constants ───────────────────────────── */

const SPRITES = 'https://play.pokemonshowdown.com/sprites/';
const DATA_URL = 'https://play.pokemonshowdown.com/data/';
const ITEM_FALLBACK = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/';
const CACHE_VERSION = 1;
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;
const FENCES = ['pokepaste', 'showdown', 'pokemon', 'pkmn', 'pokepast'];

const DEFAULTS = {
  spriteStyle: 'animated', // animated | pixel | hd
  columns: 'auto',         // auto | 1 | 2 | 3
  showTypes: true,
  showItemIcons: true,
  showCopy: true,
  autoWrapPaste: true,
};

const TYPE_HEX = {
  normal: '#A8A77A', fire: '#EE8130', water: '#6390F0', electric: '#F7D02C',
  grass: '#7AC74C', ice: '#96D9D6', fighting: '#C22E28', poison: '#A33EA1',
  ground: '#E2BF65', flying: '#A98FF3', psychic: '#F95587', bug: '#A6B91A',
  rock: '#B6A136', ghost: '#735797', dragon: '#6F35FC', dark: '#705746',
  steel: '#B7B7CE', fairy: '#D685AD', stellar: '#40B5A5',
};

const NATURES = {
  adamant: ['atk', 'spa'], bashful: [], bold: ['def', 'atk'], brave: ['atk', 'spe'],
  calm: ['spd', 'atk'], careful: ['spd', 'spa'], docile: [], gentle: ['spd', 'def'],
  hardy: [], hasty: ['spe', 'def'], impish: ['def', 'spa'], jolly: ['spe', 'spa'],
  lax: ['def', 'spd'], lonely: ['atk', 'def'], mild: ['spa', 'def'], modest: ['spa', 'atk'],
  naive: ['spe', 'spd'], naughty: ['atk', 'spd'], quiet: ['spa', 'spe'], quirky: [],
  rash: ['spa', 'spd'], relaxed: ['def', 'spe'], sassy: ['spd', 'spe'], serious: [],
  timid: ['spe', 'atk'],
};

const STAT_ORDER = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
const STAT_LABEL = { hp: 'HP', atk: 'Atk', def: 'Def', spa: 'SpA', spd: 'SpD', spe: 'Spe' };
const STAT_ALIAS = {
  hp: 'hp', atk: 'atk', attack: 'atk', def: 'def', defense: 'def',
  spa: 'spa', spatk: 'spa', satk: 'spa', spatt: 'spa', spc: 'spa', special: 'spa',
  spd: 'spd', spdef: 'spd', sdef: 'spd', spdefense: 'spd',
  spe: 'spe', speed: 'spe',
};

// Species whose *base* name contains a hyphen (Showdown sprite ids drop it).
const HYPHEN_BASES = [
  'ho-oh', 'porygon-z', 'jangmo-o', 'hakamo-o', 'kommo-o', 'ting-lu',
  'chien-pao', 'wo-chien', 'chi-yu', 'nidoran-f', 'nidoran-m',
];

const ATTR_KEYS = new Set([
  'ability', 'level', 'shiny', 'tera type', 'evs', 'ivs', 'happiness', 'friendship',
  'hidden power', 'dynamax level', 'gigantamax', 'pokeball', 'language', 'nature',
  'stat points', 'sps',
]);

/* ───────────────────────────── helpers ───────────────────────────── */

const toID = (s) =>
  String(s == null ? '' : s)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '');

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function h(tag, cls, text, parent) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null && text !== '') e.textContent = text;
  if (parent) parent.appendChild(e);
  return e;
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Sets --t / --t-rgb / --t-fg on an element so CSS can tint it. */
function applyType(el, type) {
  const hex = TYPE_HEX[String(type || '').toLowerCase()];
  if (!hex) return false;
  const [r, g, b] = hexToRgb(hex);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  el.style.setProperty('--t', hex);
  el.style.setProperty('--t-rgb', `${r},${g},${b}`);
  el.style.setProperty('--t-fg', lum > 0.58 ? '#1c1d24' : '#ffffff');
  return true;
}

function looksLikeShowdown(text) {
  const t = String(text || '');
  if (t.length < 20 || t.length > 20000) return false;
  const hasMove = /^\s*[-–]\s*\S/m.test(t);
  const hasAttr = /^\s*(Ability|EVs|IVs|Level|Tera Type|Shiny)\s*:/im.test(t) || /^\s*\w+\s+Nature\s*$/im.test(t);
  return hasMove && hasAttr;
}

/* ───────────────────────────── parser ───────────────────────────── */

function parseStats(value) {
  const out = {};
  const re = /(\d+)\s*([A-Za-z]+)/g;
  let m;
  while ((m = re.exec(value))) {
    const key = STAT_ALIAS[m[2].toLowerCase()];
    if (key) out[key] = parseInt(m[1], 10);
  }
  return out;
}

function parseHeader(line) {
  const mon = {
    species: '', nick: '', gender: '', item: '', ability: '', level: null, shiny: false,
    tera: '', gmax: false, nature: '', happiness: null, evs: {}, ivs: {}, moves: [],
  };
  let rest = line;
  const at = rest.indexOf('@');
  if (at !== -1) {
    mon.item = rest.slice(at + 1).trim();
    rest = rest.slice(0, at).trim();
  }
  const g = /\s*\((M|F)\)\s*$/i.exec(rest);
  if (g) {
    mon.gender = g[1].toUpperCase();
    rest = rest.slice(0, g.index).trim();
  }
  const n = /^(.*\S)\s+\(([^()]+)\)$/.exec(rest);
  if (n) {
    mon.nick = n[1].trim();
    mon.species = n[2].trim();
  } else {
    mon.species = rest.trim();
  }
  return mon;
}

function applyAttr(mon, key, v) {
  switch (key) {
    case 'ability': mon.ability = v; break;
    case 'level': mon.level = parseInt(v, 10) || null; break;
    case 'shiny': mon.shiny = /^(yes|true|1)$/i.test(v); break;
    case 'tera type': mon.tera = v; break;
    case 'evs': case 'stat points': case 'sps': mon.evs = parseStats(v); break;
    case 'ivs': mon.ivs = parseStats(v); break;
    case 'gigantamax': mon.gmax = /^(yes|true|1)$/i.test(v); break;
    case 'happiness': case 'friendship': mon.happiness = parseInt(v, 10); break;
    case 'nature': mon.nature = v.replace(/\s*nature$/i, ''); break;
    default: break;
  }
}

/** Parses one or many Pokémon (Showdown export / Poképaste raw text). */
function parseTeam(text) {
  const lines = String(text).replace(/\r/g, '').replace(/\u00a0/g, ' ').split('\n');
  const mons = [];
  let cur = null;
  let title = null;
  const push = () => { if (cur && cur.species) mons.push(cur); cur = null; };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { push(); continue; }

    const hdr = /^===\s*(?:\[([^\]]*)\]\s*)?(.*?)\s*===$/.exec(line);
    if (hdr) { push(); title = { format: hdr[1] || '', name: hdr[2] || '' }; continue; }

    const mv = /^[-–]\s*(.*)$/.exec(line);
    if (mv) { if (cur && mv[1].trim()) cur.moves.push(mv[1].trim()); continue; }

    const nat = /^([A-Za-z]+)\s+Nature$/i.exec(line);
    if (nat && cur) { cur.nature = nat[1]; continue; }

    const kv = /^([A-Za-z][A-Za-z ]*?)\s*:\s*(.*)$/.exec(line);
    if (kv && ATTR_KEYS.has(kv[1].toLowerCase())) {
      if (cur) applyAttr(cur, kv[1].toLowerCase(), kv[2].trim());
      continue;
    }

    // Anything else is a Pokémon header line — unless it's stray "Note: ..." text.
    if (line.includes(':') && !/^type:\s*null\b/i.test(line)) continue;
    push();
    cur = parseHeader(line);
  }
  push();
  return { title, mons };
}

/* ───────────────────────────── sprites ───────────────────────────── */

function heuristicSpriteId(name) {
  const lower = name.trim().toLowerCase();
  let base = null;
  for (const b of HYPHEN_BASES) {
    if (lower === b || lower.startsWith(b + '-')) { base = b; break; }
  }
  if (!base) base = lower.split('-')[0];
  const rest = lower.slice(base.length).replace(/^-/, '');
  return toID(base) + (rest ? '-' + toID(rest) : '');
}

function entrySpriteId(e) {
  const [name, , , base, forme] = e;
  return base ? `${toID(base)}-${toID(forme)}` : toID(name);
}

function spriteChain(id, { shiny, female, style }) {
  const order = {
    animated: [['ani', 'gif'], ['dex', 'png'], ['gen5', 'png']],
    hd: [['dex', 'png'], ['ani', 'gif'], ['gen5', 'png']],
    pixel: [['gen5', 'png'], ['ani', 'gif'], ['dex', 'png']],
  }[style] || [['ani', 'gif'], ['dex', 'png'], ['gen5', 'png']];
  const ids = female && !/-f$/.test(id) ? [`${id}-f`, id] : [id];
  const urls = [];
  const pass = (suffix) => {
    for (const [dir, ext] of order) for (const i of ids) urls.push(`${SPRITES}${dir}${suffix}/${i}.${ext}`);
  };
  if (shiny) pass('-shiny');
  pass('');
  return urls;
}

/* ───────────────────────────── plugin ───────────────────────────── */

class PokepastePlugin extends Plugin {
  async onload() {
    const saved = (await this.loadData()) || {};
    this.settings = Object.assign({}, DEFAULTS, saved.settings);
    this.cache = saved.cache && saved.cache.v === CACHE_VERSION ? saved.cache : null;
    this.pasteCache = new Map();
    this.refreshing = null;
    this.lastFail = 0;
    this.buildIndex();
    this.applyBodyClasses();

    for (const lang of FENCES) {
      this.registerMarkdownCodeBlockProcessor(lang, (src, el) => this.renderBlock(src, el));
    }

    this.addCommand({
      id: 'wrap-selection',
      name: 'Wrap selection as Pokémon team block',
      editorCallback: (editor) => {
        const sel = editor.getSelection();
        if (!sel.trim()) { new Notice('Select a Showdown export first.'); return; }
        editor.replaceSelection('```pokepaste\n' + sel.trim() + '\n```\n');
      },
    });

    this.addCommand({
      id: 'paste-from-clipboard',
      name: 'Paste Showdown export or Poképaste link from clipboard',
      editorCallback: async (editor) => {
        try {
          const text = (await navigator.clipboard.readText()).trim();
          if (!text) { new Notice('Clipboard is empty.'); return; }
          editor.replaceSelection('```pokepaste\n' + text + '\n```\n');
        } catch (e) {
          new Notice('Could not read the clipboard. Just paste normally — teams get wrapped automatically.');
        }
      },
    });

    this.addCommand({
      id: 'refresh-data',
      name: 'Refresh Pokémon data (types, colors, items)',
      callback: async () => {
        new Notice('Refreshing Pokémon data…');
        const ok = await this.refreshData(true);
        new Notice(ok ? 'Pokémon data updated.' : 'Could not reach Pokémon Showdown.');
      },
    });

    // Auto-wrap pasted Showdown exports / pokepast.es links in a code block.
    this.registerEvent(
      this.app.workspace.on('editor-paste', (evt, editor) => {
        if (!this.settings.autoWrapPaste || evt.defaultPrevented) return;
        const text = ((evt.clipboardData && evt.clipboardData.getData('text/plain')) || '').trim();
        if (!text) return;
        const isLink = /^https?:\/\/pokepast\.es\/[A-Za-z0-9]+\/?$/i.test(text);
        if (!isLink && !looksLikeShowdown(text)) return;

        const cursor = editor.getCursor();
        let fences = 0;
        for (let i = 0; i < cursor.line; i++) {
          if (/^\s*(```|~~~)/.test(editor.getLine(i))) fences++;
        }
        if (fences % 2 === 1) return; // already inside a code block

        const before = editor.getLine(cursor.line).slice(0, cursor.ch);
        const prefix = before.trim() ? '\n' : '';
        evt.preventDefault();
        editor.replaceSelection(prefix + '```pokepaste\n' + text + '\n```\n');
      })
    );

    this.addSettingTab(new PokepasteSettingTab(this.app, this));

    // Warm the cache in the background.
    this.ensureData().catch(() => {});
  }

  onunload() {
    const b = document.body;
    ['auto', '1', '2', '3'].forEach((c) => b.classList.remove('pkp-cols-' + c));
    b.classList.remove('pkp-hide-types', 'pkp-hide-itemicons');
  }

  async savePlugin() {
    await this.saveData({ settings: this.settings, cache: this.cache });
  }

  applyBodyClasses() {
    const b = document.body;
    ['auto', '1', '2', '3'].forEach((c) => b.classList.remove('pkp-cols-' + c));
    b.classList.add('pkp-cols-' + this.settings.columns);
    b.classList.toggle('pkp-hide-types', !this.settings.showTypes);
    b.classList.toggle('pkp-hide-itemicons', !this.settings.showItemIcons);
  }

  /* ─────────────── data ─────────────── */

  buildIndex() {
    const c = this.cache || {};
    this.dex = c.dex || null;
    this.moves = c.moves || null;
    this.items = c.items || null;
  }

  ensureData() {
    const fresh = this.cache && Date.now() - this.cache.ts < CACHE_TTL;
    if (fresh) return Promise.resolve();
    if (!this.refreshing) {
      if (!this.cache && Date.now() - this.lastFail < 60000) return Promise.resolve();
      this.refreshing = this.refreshData(false).finally(() => { this.refreshing = null; });
    }
    return this.cache ? Promise.resolve() : this.refreshing;
  }

  async refreshData() {
    const get = async (file) => (await requestUrl({ url: DATA_URL + file })).text;
    const [d, m, i] = await Promise.allSettled([get('pokedex.json'), get('moves.json'), get('items.js')]);
    const next = Object.assign({ v: CACHE_VERSION, ts: 0, dex: null, moves: null, items: null }, this.cache || {});
    let ok = 0;

    if (d.status === 'fulfilled') {
      try {
        const raw = JSON.parse(d.value);
        const out = {};
        for (const k in raw) {
          const v = raw[k];
          if (v && v.name) out[k] = [v.name, (v.types || []).join('/'), v.color || '', v.baseSpecies || '', v.forme || ''];
        }
        next.dex = out; ok++;
      } catch (e) { console.warn('[pokepaste] pokedex parse failed', e); }
    }
    if (m.status === 'fulfilled') {
      try {
        const raw = JSON.parse(m.value);
        const out = {};
        for (const k in raw) {
          const v = raw[k];
          if (v && v.name) out[k] = [v.name, v.type || '', v.category || '', v.basePower || 0, v.accuracy === true ? 0 : v.accuracy || 0, v.shortDesc || ''];
        }
        next.moves = out; ok++;
      } catch (e) { console.warn('[pokepaste] moves parse failed', e); }
    }
    if (i.status === 'fulfilled') {
      try { next.items = parseItems(i.value); ok++; } catch (e) { console.warn('[pokepaste] items parse failed', e); }
    }

    if (ok) {
      // If something failed, backdate the timestamp so we retry within the hour.
      next.ts = ok === 3 ? Date.now() : Date.now() - CACHE_TTL + 60 * 60 * 1000;
      this.cache = next;
      this.buildIndex();
      await this.savePlugin();
    } else {
      this.lastFail = Date.now();
    }
    return ok > 0;
  }

  lookupSpecies(raw) {
    const name = raw.trim();
    const dex = this.dex;
    let entry = null;
    let rest = '';
    if (dex) {
      const exact = dex[toID(name)];
      if (exact) entry = exact;
      else {
        const parts = name.split('-');
        for (let i = parts.length - 1; i >= 1; i--) {
          const e = dex[toID(parts.slice(0, i).join('-'))];
          if (e) { entry = e; rest = parts.slice(i).join('-'); break; }
        }
      }
    }
    let spriteId;
    if (entry && !rest) spriteId = entrySpriteId(entry);
    else if (entry && entry[3]) spriteId = `${toID(entry[3])}-${toID(entry[4] + '-' + rest)}`;
    else if (entry) spriteId = `${toID(entry[0])}-${toID(rest)}`;
    else spriteId = heuristicSpriteId(name);
    return {
      known: !!entry,
      name: entry && !rest ? entry[0] : name,
      types: entry ? entry[1].split('/').filter(Boolean) : [],
      color: entry ? entry[2].toLowerCase() : '',
      spriteId,
    };
  }

  lookupMove(raw) {
    let name = raw.trim();
    const first = name.split(/\s+\/\s+/)[0];
    let m = this.moves && this.moves[toID(first)];
    let type = m ? m[1] : '';
    const hp = /^hidden power\s*[\[(]?\s*([a-z]+)\s*[\])]?$/i.exec(first);
    if (hp) {
      type = cap(hp[1]);
      name = `Hidden Power ${type}`;
    } else if (m && first === name) name = m[0];
    return { name, type, cat: m ? m[2] : '', bp: m ? m[3] : 0, acc: m ? m[4] : 0, desc: m ? m[5] : '' };
  }

  lookupItem(raw) {
    const it = this.items && this.items[toID(raw)];
    return it ? { name: it[0], sprite: it[1], desc: it[2] } : { name: raw, sprite: -1, desc: '' };
  }

  /* ─────────────── rendering ─────────────── */

  async fetchPaste(id) {
    if (this.pasteCache.has(id)) return this.pasteCache.get(id);
    let out = null;
    try {
      const r = await requestUrl({ url: `https://pokepast.es/${id}/json` });
      const j = r.json;
      if (j && typeof j.paste === 'string') out = { paste: j.paste, title: j.title || '', author: j.author || '' };
    } catch (e) { /* fall through to /raw */ }
    if (!out) {
      const r = await requestUrl({ url: `https://pokepast.es/${id}/raw` });
      out = { paste: r.text, title: '', author: '' };
    }
    this.pasteCache.set(id, out);
    return out;
  }

  async renderBlock(source, el) {
    const host = h('div', 'pkp-team pkp-loading', 'Loading team…', el);
    let text = source.trim();
    let meta = null;
    try {
      const link = /^https?:\/\/pokepast\.es\/([A-Za-z0-9]+)/i.exec(text);
      if (link && text.split(/\s+/).length === 1) {
        meta = await this.fetchPaste(link[1]);
        text = meta.paste;
      }
    } catch (e) {
      host.className = 'pkp-team pkp-error';
      host.textContent = `Couldn't load this Poképaste: ${e && e.message ? e.message : e}`;
      return;
    }

    await Promise.race([this.ensureData().catch(() => {}), sleep(7000)]);

    host.className = 'pkp-team';
    host.textContent = '';
    const team = parseTeam(text);
    // Drop stray lines that aren't Pokémon (only possible to tell once the dex is loaded).
    if (this.dex) {
      team.mons = team.mons.filter((m) =>
        this.lookupSpecies(m.species).known || m.moves.length || m.item || m.ability || m.nature ||
        Object.keys(m.evs).length);
    }

    if (!team.mons.length) {
      host.classList.add('pkp-error');
      h('div', 'pkp-err-title', 'No Pokémon found', host);
      h('div', 'pkp-err-body', 'Expected a Showdown export, e.g. “Garchomp @ Life Orb”, followed by Ability / EVs / Nature / moves.', host);
      return;
    }

    const titleText = (meta && meta.title) || (team.title && team.title.name) || '';
    const sub = (meta && meta.author && `by ${meta.author}`) || (team.title && team.title.format) || '';
    const showBar = !!titleText || (this.settings.showCopy && team.mons.length > 1);
    if (showBar) {
      const bar = h('div', 'pkp-bar', null, host);
      h('span', 'pkp-bar-title', titleText || `${team.mons.length} Pokémon`, bar);
      if (sub) h('span', 'pkp-bar-sub', sub, bar);
      if (this.settings.showCopy) {
        const btn = h('button', 'pkp-copy', 'Copy', bar);
        btn.type = 'button';
        btn.setAttribute('aria-label', 'Copy team text');
        btn.addEventListener('click', async () => {
          try {
            await navigator.clipboard.writeText(text.trim());
            btn.textContent = 'Copied';
          } catch (e) { btn.textContent = 'Failed'; }
          setTimeout(() => { btn.textContent = 'Copy'; }, 1400);
        });
      }
    }

    const grid = h('div', 'pkp-grid' + (team.mons.length === 1 ? ' pkp-solo' : ''), null, host);
    for (const mon of team.mons) this.renderMon(grid, mon);
  }

  mountSprite(box, sp, mon) {
    const urls = spriteChain(sp.spriteId, {
      shiny: mon.shiny, female: mon.gender === 'F', style: this.settings.spriteStyle,
    });
    const img = h('img', 'pkp-img', null, box);
    img.alt = sp.name;
    img.decoding = 'async';
    img.referrerPolicy = 'no-referrer';
    let i = 0;
    img.addEventListener('error', () => {
      i++;
      if (i < urls.length) img.src = urls[i];
      else {
        img.remove();
        box.classList.add('pkp-noimg');
        box.textContent = sp.name.charAt(0);
      }
    });
    img.src = urls[0];
  }

  itemIcon(it) {
    if (it.sprite >= 0) {
      const s = h('span', 'pkp-ic');
      s.style.backgroundImage = `url(${SPRITES}itemicons-sheet.png)`;
      s.style.backgroundPosition = `-${(it.sprite % 16) * 24}px -${Math.floor(it.sprite / 16) * 24}px`;
      return s;
    }
    const slug = it.name.toLowerCase().replace(/['’.]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const img = h('img', 'pkp-ic pkp-ic-img');
    img.alt = '';
    img.referrerPolicy = 'no-referrer';
    img.addEventListener('error', () => img.remove());
    img.src = `${ITEM_FALLBACK}${slug}.png`;
    return img;
  }

  renderMon(grid, mon) {
    const sp = this.lookupSpecies(mon.species);
    const card = h('article', 'pkp-mon', null, grid);
    if (sp.color) card.dataset.c = sp.color;

    // Type "spine" on the left edge + tinted sprite backdrop.
    const t1 = sp.types[0];
    const t2 = sp.types[1] || sp.types[0];
    for (const [i, t] of [[1, t1], [2, t2]]) {
      const hex = TYPE_HEX[String(t || '').toLowerCase()];
      if (!hex) continue;
      card.style.setProperty(`--pkp-t${i}`, hex);
      card.style.setProperty(`--pkp-t${i}-rgb`, hexToRgb(hex).join(','));
    }

    /* header: sprite + identity */
    const head = h('div', 'pkp-head', null, card);
    const spriteBox = h('div', 'pkp-sprite', null, head);
    this.mountSprite(spriteBox, sp, mon);

    const id = h('div', 'pkp-id', null, head);

    const l1 = h('div', 'pkp-l1', null, id);
    const nm = h('span', 'pkp-nm', null, l1);
    h('span', 'pkp-name', sp.name, nm).title = sp.name;
    if (mon.gender === 'M') h('span', 'pkp-g pkp-g-m', '♂', nm).title = 'Male';
    if (mon.gender === 'F') h('span', 'pkp-g pkp-g-f', '♀', nm).title = 'Female';
    if (mon.shiny) h('span', 'pkp-shiny', '★', nm).title = 'Shiny';
    if (mon.gmax) h('span', 'pkp-badge', 'G-Max', nm);
    if (mon.nick) h('span', 'pkp-nick', `“${mon.nick}”`, l1).title = 'Nickname';

    const l2 = h('div', 'pkp-l2', null, id);
    for (const t of sp.types) {
      const chip = h('span', 'pkp-ty', t, l2);
      applyType(chip, t);
    }
    if (mon.tera) {
      const tt = cap(mon.tera);
      const tera = h('span', 'pkp-tera' + (tt === 'Stellar' ? ' pkp-stellar' : ''), null, l2);
      tera.title = `Tera Type: ${tt}`;
      const NS = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('viewBox', '0 0 10 10');
      svg.setAttribute('aria-hidden', 'true');
      const path = document.createElementNS(NS, 'path');
      path.setAttribute('d', 'M5 .3 9.2 5 5 9.7.8 5z');
      svg.appendChild(path);
      tera.appendChild(svg);
      h('span', null, tt, tera);
      applyType(tera, tt);
    }

    if (mon.item) {
      const it = this.lookupItem(mon.item);
      const row = h('div', 'pkp-item', null, id);
      row.appendChild(this.itemIcon(it));
      h('span', 'pkp-item-name', it.name, row);
      row.title = it.desc ? `${it.name} — ${it.desc}` : it.name;
    }
    if (mon.ability) h('div', 'pkp-ab', mon.ability, id).title = 'Ability';

    /* nature + spreads */
    const [up, down] = NATURES[toID(mon.nature)] || [];
    const chips = [];
    if (mon.level && mon.level !== 100) {
      const c = h('span', 'pkp-chip pkp-lvl');
      h('span', null, 'Lv', c);
      h('b', null, String(mon.level), c);
      chips.push(c);
    }
    if (mon.nature) {
      const c = h('span', 'pkp-chip pkp-nat');
      h('b', null, cap(mon.nature), c);
      if (up) {
        h('i', 'up', `+${STAT_LABEL[up]}`, c);
        h('i', 'dn', `−${STAT_LABEL[down]}`, c);
      }
      chips.push(c);
    }
    for (const k of STAT_ORDER) {
      if (!mon.evs[k]) continue;
      const c = h('span', 'pkp-chip pkp-ev' + (k === up ? ' up' : k === down ? ' dn' : ''));
      h('b', null, String(mon.evs[k]), c);
      h('span', null, STAT_LABEL[k], c);
      c.title = `${mon.evs[k]} ${STAT_LABEL[k]} EVs`;
      chips.push(c);
    }
    for (const k of STAT_ORDER) {
      if (mon.ivs[k] === undefined || mon.ivs[k] === 31) continue;
      const c = h('span', 'pkp-chip pkp-iv');
      h('b', null, String(mon.ivs[k]), c);
      h('span', null, `${STAT_LABEL[k]} IV`, c);
      chips.push(c);
    }
    if (chips.length) {
      const meta = h('div', 'pkp-meta', null, card);
      chips.forEach((c) => meta.appendChild(c));
    }

    /* moves */
    if (mon.moves.length) {
      const ul = h('ul', 'pkp-moves', null, card);
      for (const raw of mon.moves) {
        const mv = this.lookupMove(raw);
        const li = h('li', 'pkp-mv', null, ul);
        applyType(li, mv.type);
        h('span', null, raw.includes('/') ? raw : mv.name, li);
        const bits = [mv.type, mv.cat, mv.bp ? `${mv.bp} BP` : '', mv.acc ? `${mv.acc}% acc` : ''].filter(Boolean);
        li.title = bits.length ? `${mv.name} — ${bits.join(' · ')}${mv.desc ? '\n' + mv.desc : ''}` : mv.name;
      }
    }
  }
}

/* ───────────────────────────── items.js parser ───────────────────────────── */

function parseItems(text) {
  const re = /["']?([a-z0-9]+)["']?:\s*\{\s*["']?name["']?:\s*"((?:[^"\\]|\\.)*)"/g;
  const hits = [];
  let m;
  while ((m = re.exec(text))) hits.push({ id: m[1], name: m[2].replace(/\\(.)/g, '$1'), idx: m.index, end: re.lastIndex });
  const out = {};
  for (let i = 0; i < hits.length; i++) {
    const slice = text.slice(hits[i].end, i + 1 < hits.length ? hits[i + 1].idx : text.length);
    const sp = /spritenum:\s*(\d+)/.exec(slice);
    const ds = /shortDesc:\s*"((?:[^"\\]|\\.)*)"/.exec(slice);
    out[hits[i].id] = [hits[i].name, sp && parseInt(sp[1], 10) > 0 ? parseInt(sp[1], 10) : -1, ds ? ds[1].replace(/\\(.)/g, '$1') : ''];
  }
  return out;
}

/* ───────────────────────────── settings ───────────────────────────── */

class PokepasteSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    const p = this.plugin;
    containerEl.empty();

    new Setting(containerEl)
      .setName('Sprite style')
      .setDesc('Animated uses Showdown’s battle sprites (shiny, female, and Mega forms included). Reopen a note to apply.')
      .addDropdown((d) =>
        d.addOptions({ animated: 'Animated', pixel: 'Pixel (static)', hd: 'HD renders' })
          .setValue(p.settings.spriteStyle)
          .onChange(async (v) => { p.settings.spriteStyle = v; await p.savePlugin(); })
      );

    new Setting(containerEl)
      .setName('Columns')
      .setDesc('Auto fits as many cards as the note width allows. Narrow screens always use one column.')
      .addDropdown((d) =>
        d.addOptions({ auto: 'Auto', 1: '1', 2: '2', 3: '3' })
          .setValue(String(p.settings.columns))
          .onChange(async (v) => { p.settings.columns = v; p.applyBodyClasses(); await p.savePlugin(); })
      );

    new Setting(containerEl)
      .setName('Show species types')
      .addToggle((t) => t.setValue(p.settings.showTypes).onChange(async (v) => {
        p.settings.showTypes = v; p.applyBodyClasses(); await p.savePlugin();
      }));

    new Setting(containerEl)
      .setName('Show item icons')
      .addToggle((t) => t.setValue(p.settings.showItemIcons).onChange(async (v) => {
        p.settings.showItemIcons = v; p.applyBodyClasses(); await p.savePlugin();
      }));

    new Setting(containerEl)
      .setName('Copy button on teams')
      .setDesc('Adds a small button above teams with two or more Pokémon. Reopen a note to apply.')
      .addToggle((t) => t.setValue(p.settings.showCopy).onChange(async (v) => {
        p.settings.showCopy = v; await p.savePlugin();
      }));

    new Setting(containerEl)
      .setName('Auto-wrap pasted teams')
      .setDesc('When you paste a Showdown export or a pokepast.es link, wrap it in a code block automatically.')
      .addToggle((t) => t.setValue(p.settings.autoWrapPaste).onChange(async (v) => {
        p.settings.autoWrapPaste = v; await p.savePlugin();
      }));

    const age = p.cache && p.cache.ts ? new Date(p.cache.ts).toLocaleDateString() : 'never';
    new Setting(containerEl)
      .setName('Pokémon data')
      .setDesc(`Types, colors, moves and item icons come from Pokémon Showdown. Last updated: ${age}.`)
      .addButton((b) =>
        b.setButtonText('Refresh now').onClick(async () => {
          b.setDisabled(true);
          const ok = await p.refreshData();
          new Notice(ok ? 'Pokémon data updated.' : 'Could not reach Pokémon Showdown.');
          b.setDisabled(false);
          this.display();
        })
      );
  }
}

module.exports = PokepastePlugin;
module.exports.__test = { parseTeam, parseItems, heuristicSpriteId, entrySpriteId, spriteChain, toID, looksLikeShowdown };
