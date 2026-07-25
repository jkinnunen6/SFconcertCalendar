/* ============================================================================
   FORTNITE SPRITE TRACKER — DATA + CONFIG
   Data: Fortnite Chapter 7 Season 3 ("Runners"). 61 sprites total.
   Drop rates are DATAMINED community estimates (via fortnite.gg). Epic Games
   has NOT published official spawn rates — the UI labels them accordingly.
   ============================================================================ */

const CONFIG = {
  // Where sprite icons load from.
  //   false  -> load from the fortnite.gg CDN (works instantly, no setup)
  //   true   -> load from ./images/ (local copy bundled with this site)
  USE_LOCAL_IMAGES: true,

  CDN_BASE: "https://fortnite.gg/img/x/sprites/icons/",
  LOCAL_BASE: "/sprites/images/",

  SITE_LABEL: "Sprite Tracker — sprites-tracker.vercel.app",

  STORAGE_KEY: "fnSpriteTracker:v3",
};

// Theme presentation -------------------------------------------------------
const THEMES = {
  base:     { label: "Base",     color: null /* uses rarity color */ },
  gold:     { label: "Gold",     color: "#ffc23b" },
  gummy:    { label: "Gummy",    color: "#ff5fa8" },
  galaxy:   { label: "Galaxy",   color: "#9b7bff" },
  holofoil: { label: "Holofoil", color: "#a8f0ff" },
  gem:      { label: "Gem",      color: "#4dffc3" },
  rift:     { label: "Cube",     color: "#ff6bff" },
};

const RARITY = {
  rare:      { label: "Rare",      color: "#2bb3ff", rank: 1 },
  epic:      { label: "Epic",      color: "#b54bff", rank: 2 },
  legendary: { label: "Legendary", color: "#ff9d2b", rank: 3 },
  mythic:    { label: "Mythic",    color: "#ffd23f", rank: 4 },
};

const VARIANT_BONUS = {
  gold:     "Bonus XP from eliminations.",
  gummy:    "10% more Sprite Dust when extracted.",
  galaxy:   "20% more ammo when looting.",
  holofoil: "Squad-wide rare-find bonus.",
};

// Base creatures. Each expands into its theme variants below.
// rates: drop % per theme. icons: exact filename per theme.
// Burnt Peanut is unique: base only, no variants.
const CREATURES = [
  {
    key: "water", name: "Water", rarity: "rare",
    ability: "Replenishes shields for you and nearby squadmates while in water.",
    rates: { base: 13.92, gold: 6, gummy: 0.08, galaxy: null, holofoil: null, gem: null },
    icons: {
      base: "T_Icon_BR_Creature_Sprite_Water_Unvault_Ch7S3_ui_L.webp",
      gold: "T_Icon_BR_Creature_Sprite_Water_Gold_ui_L.webp",
      gummy: "T_Icon_BR_Creature_Sprite_Water_Candy_ui_L.webp",
      galaxy: "T_Icon_BR_Creature_Sprite_Water_Galaxy_ui_L.webp",
      holofoil: "water_holofoil.webp",
      gem: "water_gem.png",
    },
  },
  {
    key: "earth", name: "Earth", rarity: "rare",
    ability: "Has a chance to grant additional rare items when opening chests.",
    rates: { base: 13.92, gold: 6, gummy: 0.08, galaxy: null, gem: null, rift: null },
    icons: {
      base: "T_Icon_BR_Creature_Sprite_Earth_Ch7S3_UI_L.webp",
      gold: "T_Icon_BR_Creature_Sprite_Earth_Gold_ui_L.webp",
      gummy: "T_Icon_BR_Creature_Sprite_Earth_Candy_ui_L.webp",
      galaxy: "T_Icon_BR_Creature_Sprite_Earth_Galaxy_ui_L.webp",
      gem: "earth_gem.png",
      rift: "earth_rift.png",
    },
  },
  {
    key: "fire", name: "Fire", rarity: "rare",
    ability: "Creates a fiery burst when you deal enough damage to an enemy.",
    rates: { base: 13.92, gold: 6, gummy: 0.08, galaxy: null, holofoil: null, rift: null },
    icons: {
      base: "T_Icon_BR_Creature_Sprite_Fire_Unvault_Ch7S3_ui_L.webp",
      gold: "T_Icon_BR_Creature_Sprite_Fire_Gold_ui_L.webp",
      gummy: "T_Icon_BR_Creature_Sprite_Fire_Candy_ui_L.webp",
      galaxy: "T_Icon_BR_Creature_Sprite_Fire_Galaxy_ui_L.webp",
      holofoil: "fire_holofoil.webp",
      rift: "fire_rift.png",
    },
  },
  {
    key: "duck", name: "Duck", rarity: "epic",
    ability: "Replenishes shields when you emote or use Jam Tracks.",
    rates: { base: 5.22, gold: 2.25, gummy: 0.03, galaxy: null, gem: null },
    icons: {
      base: "T_Icon_BR_Duck_Default_L.webp",
      gold: "T_Icon_BR_Duck_Gold_L.webp",
      gummy: "T_Icon_BR_Duck_Candy_L.webp",
      galaxy: "T_Icon_BR_Duck_Galaxy_L.webp",
      gem: "duck_gem.png",
    },
  },
  {
    key: "ghost", name: "Ghost", rarity: "epic",
    ability: "Grants a temporary invisibility cloak upon reloading.",
    rates: { base: 5.22, gold: 2.25, gummy: 0.03, galaxy: null, holofoil: null },
    icons: {
      base: "T_Icon_BR_Creature_Sprite_Ghost_Unvault_L.webp",
      gold: "T_Icon_BR_Creature_Sprite_Ghost_Gold_L.webp",
      gummy: "T_Icon_BR_Creature_Sprite_Ghost_Candy_L.webp",
      galaxy: "T_Icon_BR_Creature_Sprite_Ghost_Galaxy_L.webp",
      holofoil: "ghost_holofoil.webp",
    },
  },
  {
    key: "dream", name: "Dream", rarity: "legendary",
    ability: "Grants a random item each level, and explodes with Legendary loot at max level.",
    rates: { base: 2.436, gold: 1.05, gummy: 0.014, galaxy: null, rift: null },
    icons: {
      base: "T_Icon_BR_Creature_Sprite_Sleepy_ui_L.webp",
      gold: "T_Icon_BR_Creature_Sprite_Sleepy_Gold_ui_L.webp",
      gummy: "T_Icon_BR_Creature_Sprite_Sleepy_Candy_ui_L.webp",
      galaxy: "T_Icon_BR_Creature_Sprite_Sleepy_Galaxy_ui_L.webp",
      rift: "dream_rift.png",
    },
  },
  {
    key: "punk", name: "Punk", rarity: "legendary",
    ability: "Unpredictable effects — can grant infinite ammo for all weapons at max level.",
    rates: { base: 2.436, gold: 1.05, gummy: 0.014, galaxy: null, gem: null, rift: null },
    icons: {
      base: "T_Icon_BR_Creature_Sprite_Punk_ui_L.webp",
      gold: "T_Icon_BR_Creature_Sprite_Punk_Gold_ui_L.webp",
      gummy: "T_Icon_BR_Creature_Sprite_Punk_Candy_ui_L.webp",
      galaxy: "T_Icon_BR_Creature_Sprite_Punk_Galaxy_ui_L.webp",
      gem: "punk_gem.png",
      rift: "punk_rift.png",
    },
  },
  {
    key: "king", name: "King", rarity: "epic",
    ability: "Increases your pickaxe damage.",
    rates: { base: 5.22, gold: 2.25, gummy: 0.03, galaxy: null, holofoil: null },
    icons: {
      base: "T_Icon_BR_Creature_Sprite_King_ui_L.webp",
      gold: "T_Icon_BR_Creature_Sprite_King_Gold_ui_L.webp",
      gummy: "T_Icon_BR_Creature_Sprite_King_Candy_ui_L.webp",
      galaxy: "T_Icon_BR_Creature_Sprite_King_Galaxy_ui_L.webp",
      holofoil: "king_holofoil.webp",
    },
  },
  {
    key: "zeropoint", name: "Zero Point", rarity: "mythic",
    ability: "Spawns a Shield Bubble Jr. when you use a healing item on yourself.",
    rates: { base: 1.044, gold: 0.45, gummy: 0.006, galaxy: null, gem: null, holofoil: null },
    icons: {
      base: "T_Icon_BR_Creature_Sprite_ZeroPoint_ui_L.webp",
      gold: "T_Icon_BR_Creature_Sprite_ZeroPoint_Gold_ui_L.webp",
      gummy: "T_Icon_BR_Creature_Sprite_ZeroPoint_Candy_ui_L.webp",
      galaxy: "T_Icon_BR_Creature_Sprite_ZeroPoint_Galaxy_ui_L.webp",
      gem: "zeropoint_gem.png",
      holofoil: "zeropoint_holofoil.png",
    },
  },
  {
    key: "demon", name: "Demon", rarity: "epic",
    ability: "Restores health and shields when you eliminate an opponent.",
    rates: { base: 5.22, gold: 2.25, gummy: 0.03, galaxy: null, gem: null },
    icons: {
      base: "T_Icon_BR_RedDemon_Default_L.webp",
      gold: "T_Icon_BR_RedDemon_Gold_L.webp",
      gummy: "T_Icon_BR_RedDemon_Candy_L.webp",
      galaxy: "T_Icon_BR_RedDemon_Galaxy_L.webp",
      gem: "demon_gem.png",
    },
  },
  {
    key: "fishy", name: "Fishy", rarity: "rare",
    ability: "Swim speed greatly increased. Taking damage also briefly increases movement speed.",
    rates: { base: null, gold: null, gummy: null, galaxy: null, rift: null },
    icons: {
      base: "T_Icon_BR_Creature_Sprite_Fishy_ui_L.webp",
      gold: "T_Icon_BR_Creature_Sprite_Fishy_Gold_ui_L.webp",
      gummy: "T_Icon_BR_Creature_Sprite_Fishy_Candy_ui_L.webp",
      galaxy: "T_Icon_BR_Creature_Sprite_Fishy_Galaxy_ui_L.webp",
      rift: "fishy_rift.png",
    },
  },
  {
    key: "striker", name: "Striker", rarity: "epic",
    ability: "Gain the Overdrive effect when you Mantle, Hurdle, or Wall Scramble. Duration increases at each Level.",
    rates: { base: null, gold: null, gummy: null, galaxy: null, holofoil: null },
    icons: {
      base: "T_Icon_BR_Creature_Sprite_Soccer_ui_L.webp",
      gold: "T_Icon_BR_Creature_Sprite_Soccer_Gold_L.webp",
      gummy: "T_Icon_BR_Creature_Sprite_Soccer_Candy_L.webp",
      galaxy: "T_Icon_BR_Creature_Sprite_Soccer_Galaxy_L.webp",
      holofoil: "striker_holofoil.webp",
    },
  },
  {
    key: "aura", name: "Aura", rarity: "epic",
    ability: "Gain a Shock Rock charge when you deal enough damage to enemies.",
    rates: { base: null, gold: null, gummy: null, galaxy: null, gem: null },
    icons: {
      base: "T_Icon_BR_Creature_Sprite_Drifter_ui_L.webp",
      gold: "T_Icon_BR_Creature_Sprite_Drifter_Gold_ui_L.webp",
      gummy: "T_Icon_BR_Creature_Sprite_Drifter_Candy_ui_L.webp",
      galaxy: "T_Icon_BR_Creature_Sprite_Drifter_Galaxy_ui_L.webp",
      gem: "aura_gem.png",
    },
  },
  {
    key: "boss", name: "Boss", rarity: "legendary",
    ability: "Grants an increase to your max HP and Shield.",
    rates: { base: null, gold: null, gummy: null, galaxy: null, rift: null },
    icons: {
      base: "T_Icon_BR_Creature_Sprite_Boss_ui_L.webp",
      gold: "T_Icon_BR_Creature_Sprite_Boss_Gold_ui_L.webp",
      gummy: "T_Icon_BR_Creature_Sprite_Boss_Candy_ui_L.webp",
      galaxy: "T_Icon_BR_Creature_Sprite_Boss_Galaxy_ui_L.webp",
      rift: "boss_rift.png",
    },
  },
  {
    key: "grim", name: "Grim", rarity: "mythic",
    ability: "Players who attack you are marked for a duration.",
    rates: { base: null, gold: null, gummy: null, galaxy: null, rift: null },
    icons: {
      base: "T_Icon_BR_GrimReaper_Default_L.webp",
      gold: "T_Icon_BR_GrimReaper_Gold_L.webp",
      gummy: "T_Icon_BR_GrimReaper_Candy_L.webp",
      galaxy: "T_Icon_BR_GrimReaper_Galaxy_L.webp",
      rift: "grim_rift.png",
    },
  },
  {
    key: "burntpeanut", name: "Burnt Peanut", rarity: "mythic",
    ability: "Eliminations have a chance to drop extra loot, including Mythic items. Unique — has no Special variants.",
    rates: { base: 1.5 },
    icons: { base: "T_Icon_BR_Creature_Sprite_BurntPeanut_ui_L.webp" },
    baseOnly: true,
  },
  {
    key: "air", name: "Air", rarity: "rare",
    ability: "Ability not yet revealed.",
    rates: { base: null, gold: null, gummy: null, galaxy: null, holofoil: null },
    icons: {
      base: "air_basic.png",
      gold: "air_gold.png",
      gummy: "air_candy.png",
      galaxy: "air_galaxy.png",
      holofoil: "air_holofoil.png",
    },
  },
  {
    key: "seven", name: "Seven", rarity: "legendary",
    ability: "Ability not yet revealed.",
    rates: { base: null, gold: null, gummy: null, galaxy: null, holofoil: null },
    icons: {
      base: "seven_basic.png",
      gold: "seven_gold.png",
      gummy: "seven_candy.png",
      galaxy: "seven_galaxy.png",
      holofoil: "seven_holofoil.png",
    },
  },
  {
    key: "wick", name: "John Wick", rarity: "mythic",
    ability: "Ability not yet revealed.",
    rates: { base: null },
    icons: { base: "wick_basic.png" },
    baseOnly: true,
  },
  {
    key: "batman", name: "Batman", rarity: "mythic",
    ability: "Ability not yet revealed.",
    rates: { base: null, gold: null, gummy: null, galaxy: null, holofoil: null, rift: null },
    icons: {
      base: "batman_basic.png",
      gold: "batman_gold.png",
      gummy: "batman_candy.png",
      galaxy: "batman_galaxy.png",
      holofoil: "batman_holofoil.png",
      rift: "batman_rift.png",
    },
  },
  {
    key: "pollo", name: "Pollo", rarity: "mythic",
    ability: "Ability not yet revealed.",
    rates: { base: null },
    icons: { base: "pollo_basic.png" },
    baseOnly: true,
  },
  {
    key: "vini", name: "Vini Jr.", rarity: "mythic",
    ability: "Ability not yet revealed.",
    rates: { base: null },
    icons: { base: "vini_basic.png" },
    baseOnly: true,
  },
];

// Expand creatures -> flat sprite list (stable order = encode/decode order) ---
const THEME_ORDER = ["base", "gold", "gummy", "galaxy", "holofoil", "rift", "gem"];
// Themes currently live in-game. Add new ones here as Epic releases them.
const RELEASED_THEMES = new Set(["base", "gold", "gummy", "galaxy", "holofoil", "gem", "rift"]);

const SPRITES = (() => {
  const out = [];
  for (const c of CREATURES) {
    const themes = c.baseOnly ? ["base"] : THEME_ORDER.filter(t => c.icons[t] !== undefined);
    for (const theme of themes) {
      const isBase = theme === "base";
      const label = THEMES[theme].label;
      out.push({
        id: `${theme}-${c.key}`,
        creature: c.key,
        creatureName: c.name,
        theme,
        name: isBase ? c.name : `${label} ${c.name}`,
        rarity: c.rarity,
        rarityRank: RARITY[c.rarity].rank,
        // Badge: base shows rarity, variants show their theme name.
        badge: isBase ? RARITY[c.rarity].label : label,
        // Accent: base uses rarity color, variants use theme color.
        color: isBase ? RARITY[c.rarity].color : THEMES[theme].color,
        dropRate: c.rates[theme],
        released: !c.unreleased && RELEASED_THEMES.has(theme),
        icon: c.icons[theme],
        ability: isBase ? c.ability : `${c.ability} ${VARIANT_BONUS[theme] || ""}`.trim(),
      });
    }
  }
  return out;
})();

function iconURL(sprite) {
  return (CONFIG.USE_LOCAL_IMAGES ? CONFIG.LOCAL_BASE : CONFIG.CDN_BASE) + sprite.icon;
}

// Stable id list for share-link encoding.
const SPRITE_IDS = SPRITES.map((s) => s.id);
