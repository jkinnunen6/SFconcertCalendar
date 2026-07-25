/* ============================================================================
   FORTNITE SPRITE TRACKER — APP LOGIC
   Status per sprite:  0 = not collected,  1 = collected,  2 = Mastered.
   Collection count = status>=1 ; Mastery count = status===2.
   Galaxy sprites are unreleased: shown as locked previews, not collectable,
   and excluded from your counts until they release in-game.
   ============================================================================ */

"use strict";

let state = { levels: {} };          // map: spriteId -> 0|1|2
let sharedMode = false;
let sharedLevels = null;

const filters = {
  search: "", theme: "all", status: "all", rarity: "all", sort: "type",
  hideMastered: false, groupBy: false, showUnreleased: true, // Galaxy shown by default
};

function activeLevels() { return sharedMode ? sharedLevels : state.levels; }
function statusOf(id) { return activeLevels()[id] || 0; }
function isOwned(id) { return statusOf(id) >= 1; }
function isMastered(id) { return statusOf(id) === 2; }
function spriteById(id) { return SPRITES.find((s) => s.id === id); }
function isLocked(sprite) { return !sprite.released; }

// ---- Persistence (with one-time migration from the old level scheme) -----
function load() {
  try {
    const raw = localStorage.getItem(CONFIG.STORAGE_KEY);
    if (raw) {
      state = JSON.parse(raw);
    } else {
      const legacy = localStorage.getItem("fnSpriteTracker:v2");
      if (legacy) {
        const old = (JSON.parse(legacy) || {}).levels || {};
        const conv = {};
        for (const k in old) {
          const v = old[k];
          const ns = v >= 5 ? 2 : v >= 1 ? 1 : 0; // old 5=mastered, 1-4=owned
          if (ns > 0) conv[k] = ns;
        }
        state = { levels: conv };
        save();
      }
    }
  } catch (e) { /* ignore */ }
  if (!state.levels) state.levels = {};
}
function save() {
  if (sharedMode) return;
  try { localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
}

function setStatus(id, val) {
  if (sharedMode) return;
  const sprite = spriteById(id);
  if (isLocked(sprite)) return; // can't collect unreleased sprites
  val = Math.max(0, Math.min(2, val));
  if (val === 0) delete state.levels[id];
  else state.levels[id] = val;
  save();
  renderMeters();
  renderGrid();
}

// ---- Sprite sets ---------------------------------------------------------
function releasedSprites() { return SPRITES.filter((s) => s.released); }
function trackableSprites() { return SPRITES.filter((s) => s.released || filters.showUnreleased); }

// ---- Filtering + sorting -------------------------------------------------
function visibleSprites() {
  let list = trackableSprites();
  if (filters.theme !== "all") list = list.filter((s) => s.theme === filters.theme);
  if (filters.rarity !== "all") list = list.filter((s) => s.rarity === filters.rarity);
  if (filters.status === "owned") list = list.filter((s) => isOwned(s.id));
  else if (filters.status === "missing") list = list.filter((s) => !isOwned(s.id) && s.released);
  if (filters.hideMastered) list = list.filter((s) => !isMastered(s.id));
  if (filters.search) {
    const q = filters.search.toLowerCase();
    list = list.filter((s) => s.name.toLowerCase().includes(q) || s.theme.includes(q) || s.rarity.includes(q));
  }
  const byType = (a, b) => SPRITE_IDS.indexOf(a.id) - SPRITE_IDS.indexOf(b.id);
  if (filters.sort === "rarity") list.sort((a, b) => b.rarityRank - a.rarityRank || byType(a, b));
  else if (filters.sort === "drop") list.sort((a, b) => a.dropRate - b.dropRate || byType(a, b));
  else if (filters.sort === "name") list.sort((a, b) => a.name.localeCompare(b.name));
  else list.sort(byType);
  return list;
}

// ---- Rendering -----------------------------------------------------------
const $ = (sel) => document.querySelector(sel);

// Creature display order for the row layout
const CREATURE_DISPLAY_ORDER = [
  "water","earth","fire","duck","ghost","dream",
  "demon","punk","king","burntpeanut","zeropoint",
  "fishy","striker","aura","boss","grim",
  "air","seven","wick","batman","pollo","vini",
];

function miniCardHTML(s) {
  const locked = isLocked(s);
  const status = statusOf(s.id);
  const owned = status >= 1 && !locked;
  const mastered = status === 2 && !locked;
  const tag = s.theme === "base" ? RARITY[s.rarity].label : THEMES[s.theme].label;
  const masterBtn = owned
    ? `<button class="mini-master-btn ${mastered ? "on" : ""}" data-master title="${mastered ? "Mastered" : "Mark mastered"}">♛</button>`
    : "";
  return `
    <div class="mini-card ${owned ? "owned" : ""} ${mastered ? "mastered" : ""} ${locked ? "locked" : ""}"
         data-id="${s.id}" style="--c:${s.color}" tabindex="0" role="button"
         aria-pressed="${owned}"
         aria-label="${s.name}${locked ? ", unreleased" : owned ? ", collected" : ", not collected"}">
      ${masterBtn}
      <div class="mini-img">
        <img src="${iconURL(s)}" alt="${s.name}" loading="lazy"
             onerror="this.onerror=null;this.src='${CONFIG.CDN_BASE + s.icon}'" />
        ${locked ? '<div class="lock-overlay" style="font-size:18px">🔒</div>' : ""}
      </div>
      <div class="mini-tag">${tag}</div>
    </div>`;
}

function creatureRowHTML(creature, variants) {
  const rep = variants.find((s) => s.theme === "base") || variants[0];
  const rarityColor = RARITY[rep.rarity].color;
  return `
    <div class="creature-row">
      <div class="row-head">
        <div class="row-name" style="color:${rarityColor}">${rep.creatureName}</div>
        <div class="row-rar">${RARITY[rep.rarity].label}</div>
      </div>
      <div class="row-cards">${variants.map(miniCardHTML).join("")}</div>
    </div>`;
}

function fmtRate(r) {
  if (r === null || r === undefined) return "NEW";
  if (r === 0) return "—";
  if (r >= 1) return r % 1 === 0 ? r + "%" : r.toFixed(2).replace(/0$/, "") + "%";
  return r + "%";
}

function cardHTML(s) {
  const locked = isLocked(s);
  const status = statusOf(s.id);
  const owned = status >= 1 && !locked;
  const mastered = status === 2 && !locked;
  const crown = mastered ? ' <span class="crown">♛</span>' : "";

  let control = "";
  if (sharedMode) control = "";
  else if (locked) control = '<div class="pip-label locked">🔒 Not released yet</div>';
  else if (owned) control = `<button class="master-btn ${mastered ? "on" : ""}" data-master title="Mastered = reached Level 5 in-game">♛ ${mastered ? "Mastered" : "Mark mastered"}</button>`;
  else control = '<div class="pip-label">Tap to collect</div>';

  return `
    <div class="card ${owned ? "owned" : ""} ${mastered ? "mastered" : ""} ${locked ? "locked" : ""}" data-id="${s.id}"
         style="--c:${s.color}" tabindex="0" role="button" aria-pressed="${owned}"
         aria-label="${s.name}${locked ? ", unreleased" : owned ? ", collected" : ", not collected"}">
      <div class="accent-bar"></div>
      <div class="thumb">
        <span class="badge">${s.badge}</span>
        <span class="rate" title="Datamined drop chance">${locked ? "SOON" : fmtRate(s.dropRate)}</span>
        <img src="${iconURL(s)}" alt="${s.name}" loading="lazy"
             onerror="this.onerror=null;this.src='${CONFIG.CDN_BASE + s.icon}'" />
        <button class="info-btn" data-info title="Details">i</button>
        ${locked ? '<div class="lock-overlay">🔒</div>' : ""}
      </div>
      <div class="meta">
        <div class="name">${s.name}${crown}</div>
        ${control}
      </div>
    </div>`;
}

function renderGrid() {
  const grid = $("#grid");
  const list = visibleSprites();
  if (list.length === 0) {
    grid.innerHTML = `<div class="empty"><div class="big">🫥</div><h3>No sprites match</h3><div>Try clearing a filter or the search box.</div></div>`;
    renderResultLine(list);
    return;
  }
  if (filters.groupBy) {
    let html = "";
    for (const theme of THEME_ORDER) {
      const group = list.filter((s) => s.theme === theme);
      if (!group.length) continue;
      const color = THEMES[theme].color || "var(--accent)";
      const tag = !RELEASED_THEMES.has(theme) ? " · Unreleased" : "";
      html += `<div class="group-title" style="--c:${color}"><span class="swatch"></span>${THEMES[theme].label}${tag}</div>`;
      html += `<div class="grid">${group.map(cardHTML).join("")}</div>`;
    }
    grid.innerHTML = html;
  } else {
    // Default: one row per creature with variants inline
    const byCreature = {};
    for (const s of list) {
      (byCreature[s.creature] = byCreature[s.creature] || []).push(s);
    }
    let html = '<div class="creature-rows">';
    for (const key of CREATURE_DISPLAY_ORDER) {
      if (byCreature[key]) html += creatureRowHTML(key, byCreature[key]);
    }
    html += "</div>";
    grid.innerHTML = html;
  }
  renderResultLine(list);
}

function renderResultLine(list) {
  const owned = list.filter((s) => isOwned(s.id)).length;
  $("#resultLine").innerHTML = `Showing <b>${list.length}</b> sprite${list.length === 1 ? "" : "s"} · <b>${owned}</b> collected`;
}

function renderMeters() {
  const set = releasedSprites(); // Galaxy never counts (unobtainable)
  const total = set.length;
  const owned = set.filter((s) => isOwned(s.id)).length;
  const mastered = set.filter((s) => isMastered(s.id)).length;
  $("#collCount").innerHTML = `<b>${owned}</b> / ${total}`;
  $("#masCount").innerHTML = `<b>${mastered}</b> / ${total}`;
  $("#collBar").style.width = total ? (owned / total) * 100 + "%" : "0%";
  $("#masBar").style.width = total ? (mastered / total) * 100 + "%" : "0%";
}

// ---- Card interactions ---------------------------------------------------
$("#grid").addEventListener("click", (e) => {
  const card = e.target.closest(".card, .mini-card");
  if (!card) return;
  const id = card.dataset.id;
  const sprite = spriteById(id);
  if (e.target.closest("[data-info]")) { openDetail(sprite); return; }
  if (sharedMode) return;
  if (isLocked(sprite)) { toast("This sprite isn't in the game yet"); return; }
  if (e.target.closest("[data-master]")) { setStatus(id, isMastered(id) ? 1 : 2); return; }
  setStatus(id, isOwned(id) ? 0 : 1);
});

$("#grid").addEventListener("keydown", (e) => {
  if (e.key !== "Enter" && e.key !== " ") return;
  const card = e.target.closest(".card, .mini-card");
  if (!card || sharedMode) return;
  const sprite = spriteById(card.dataset.id);
  if (isLocked(sprite)) return;
  e.preventDefault();
  setStatus(card.dataset.id, isOwned(card.dataset.id) ? 0 : 1);
});

// ---- Detail modal --------------------------------------------------------
function openDetail(s) {
  const locked = isLocked(s);
  const status = statusOf(s.id);
  const relPill = s.released ? '<span class="pill soft">Released</span>' : '<span class="pill soft">Unreleased</span>';

  let controls = "", statusNote = "";
  if (locked) {
    statusNote = '<div class="ability" style="color:var(--muted)">🔒 Not in the game yet — this variant is unreleased.</div>';
  } else {
    const ownBtn = status >= 1
      ? `<button class="btn ghost" data-detail-act="unown">Remove from collection</button>`
      : `<button class="btn" data-detail-act="own">Add to collection</button>`;
    const masterBtn = status === 2
      ? `<button class="btn" data-detail-act="unmaster">Unmark mastered</button>`
      : `<button class="btn primary" data-detail-act="master">Mark mastered</button>`;
    controls = `<div class="gen-actions" style="justify-content:flex-start;margin-top:16px;">${ownBtn} ${masterBtn}</div>`;
    const label = status === 0 ? "Not collected" : status === 2 ? "Mastered" : "Collected";
    statusNote = `<div class="ability" style="color:var(--muted)">Status: ${label}</div>`;
  }

  $("#detailTitle").textContent = s.name;
  $("#detailBody").innerHTML = `
    <div class="detail" style="--c:${s.color}">
      <div class="big-thumb"><img src="${iconURL(s)}" alt="${s.name}"
           onerror="this.onerror=null;this.src='${CONFIG.CDN_BASE + s.icon}'"></div>
      <div>
        <div class="d-name">${s.name}</div>
        <div>
          <span class="pill">${s.badge}</span>
          <span class="pill soft">${RARITY[s.rarity].label}</span>
          <span class="pill soft">Drop: ${locked ? "—" : s.dropRate == null ? "Undisclosed" : fmtRate(s.dropRate)}</span>
          ${relPill}
        </div>
        <div class="ability"><b>Ability.</b> ${s.ability}</div>
        ${sharedMode ? "" : statusNote}
        ${sharedMode ? "" : controls}
      </div>
    </div>`;

  $("#detailBody").querySelectorAll("[data-detail-act]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const act = btn.dataset.detailAct;
      if (act === "own") setStatus(s.id, 1);
      else if (act === "unown") setStatus(s.id, 0);
      else if (act === "master") setStatus(s.id, 2);
      else if (act === "unmaster") setStatus(s.id, 1);
      openDetail(s);
    });
  });
  openOverlay("#detailOverlay");
}

// ---- Overlay helpers -----------------------------------------------------
function openOverlay(sel) { $(sel).classList.add("open"); }
function closeOverlay(sel) { $(sel).classList.remove("open"); }
document.querySelectorAll("[data-close]").forEach((b) =>
  b.addEventListener("click", () => b.closest(".overlay").classList.remove("open")));
document.querySelectorAll(".overlay").forEach((o) =>
  o.addEventListener("click", (e) => { if (e.target === o) o.classList.remove("open"); }));
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") document.querySelectorAll(".overlay.open").forEach((o) => o.classList.remove("open"));
});

// ---- Toast ---------------------------------------------------------------
let toastTimer;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
}

// ---- Filter wiring -------------------------------------------------------
function bindChips(containerSel, key, field) {
  const buttons = document.querySelectorAll(`${containerSel} .chip`);
  buttons.forEach((btn) =>
    btn.addEventListener("click", () => {
      buttons.forEach((b) => b.setAttribute("aria-pressed", "false"));
      btn.setAttribute("aria-pressed", "true");
      filters[key] = btn.dataset[field];
      renderGrid();
    }));
}
bindChips("#themeChips", "theme", "theme");
bindChips("#statusChips", "status", "status");

$("#search").addEventListener("input", (e) => { filters.search = e.target.value.trim(); renderGrid(); });
$("#raritySelect").addEventListener("change", (e) => { filters.rarity = e.target.value; renderGrid(); });
$("#sortSelect").addEventListener("change", (e) => { filters.sort = e.target.value; renderGrid(); });
$("#hideMastered").addEventListener("change", (e) => { filters.hideMastered = e.target.checked; renderGrid(); });
$("#groupBy").addEventListener("change", (e) => { filters.groupBy = e.target.checked; renderGrid(); });
$("#showUnreleased").addEventListener("change", (e) => { filters.showUnreleased = e.target.checked; renderMeters(); renderGrid(); });

// ---- Reset ---------------------------------------------------------------
$("#resetBtn").addEventListener("click", () => {
  if (sharedMode) { toast("Read-only shared view"); return; }
  if (confirm("Reset your whole collection? This can't be undone.")) {
    state.levels = {};
    save();
    renderMeters();
    renderGrid();
    toast("Collection reset");
  }
});

// ---- Share link ----------------------------------------------------------
function decodeState(str) {
  if (!/^[0-9]+$/.test(str)) return null;
  const out = {};
  for (let i = 0; i < SPRITE_IDS.length && i < str.length; i++) {
    let v = parseInt(str[i], 10);
    if (v >= 2) v = 2; // mastered (also handles legacy "5")
    if (v > 0) out[SPRITE_IDS[i]] = v;
  }
  return out;
}

$("#shareBtn").addEventListener("click", async () => {
  const data = activeLevels();
  let code = SPRITE_IDS.map((id) => Math.max(0, Math.min(2, data[id] || 0))).join("").replace(/0+$/, "");
  if (!code) { toast("Collect some sprites first, then share"); return; }
  const url = `${location.origin}${location.pathname}#c=${code}`;
  try {
    await navigator.clipboard.writeText(url);
    toast("Share link copied to clipboard");
  } catch (e) {
    prompt("Copy your share link:", url);
  }
});

function checkSharedLink() {
  const m = location.hash.match(/#c=([0-9]+)/);
  if (!m) return;
  const decoded = decodeState(m[1]);
  if (!decoded) return;
  sharedMode = true;
  sharedLevels = decoded;
  $("#sharedBanner").classList.add("open");
}
$("#exitShared").addEventListener("click", () => {
  sharedMode = false;
  sharedLevels = null;
  history.replaceState(null, "", location.pathname);
  $("#sharedBanner").classList.remove("open");
  renderMeters();
  renderGrid();
});

// ============================================================================
//  IMAGE GENERATOR (canvas)
// ============================================================================
function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

async function generateImage(mode) {
  openOverlay("#genOverlay");
  $("#genTitle").textContent = mode === "collection" ? "Collection image" : "Wishlist image";
  $("#genBody").innerHTML = `<div class="gen-loading"><div class="spinner"></div>Building your image…</div>`;

  const set = releasedSprites(); // generators use obtainable sprites only
  const lv = activeLevels();
  const ownedSet = set.filter((s) => (lv[s.id] || 0) >= 1);
  let chosen, title, subtitle;

  if (mode === "collection") {
    chosen = ownedSet;
    const mastered = chosen.filter((s) => (lv[s.id] || 0) >= 2).length;
    title = "MY SPRITE COLLECTION";
    subtitle = `COLLECTION ${ownedSet.length}/${set.length}   ·   MASTERY ${mastered}/${set.length}`;
    if (chosen.length === 0) {
      $("#genBody").innerHTML = `<div class="gen-loading">Collect at least one sprite first, then generate your collection image.</div>`;
      return;
    }
  } else {
    chosen = set.filter((s) => (lv[s.id] || 0) === 0);
    title = "I'M HUNTING THESE";
    subtitle = `${chosen.length} SPRITE${chosen.length === 1 ? "" : "S"} LEFT TO FIND`;
    if (chosen.length === 0) {
      $("#genBody").innerHTML = `<div class="gen-loading">🎉 You've collected every released sprite — nothing left on the wishlist!</div>`;
      return;
    }
  }

  try {
    await Promise.all([
      document.fonts.load('700 48px "Chakra Petch"'),
      document.fonts.load('italic 700 48px "Chakra Petch"'),
      document.fonts.load('600 26px "Chakra Petch"'),
      document.fonts.load('600 22px "Inter"'),
    ]);
    await document.fonts.ready;
  } catch (e) { /* fall back */ }

  const imgs = await Promise.all(chosen.map((s) => loadImage(iconURL(s))));
  const anyMissing = imgs.some((i) => i === null);

  const S = 2;
  const count = chosen.length;
  const tileW = 224, tileH = 248, gap = 18, pad = 40, headerH = 176, footerH = 64;

  // Balanced grid: lean slightly landscape, cap at 6 columns, never exceed the count.
  const cols = Math.min(count, 6, Math.max(1, Math.ceil(Math.sqrt(count * 1.6))));
  const rows = Math.ceil(count / cols);

  const gridW = cols * tileW + (cols - 1) * gap;
  const W = Math.max(pad * 2 + gridW, 520);      // floor: keeps tiny collections from looking sparse
  const H = headerH + pad + rows * tileH + (rows - 1) * gap + footerH;
  const gridLeft = Math.round((W - gridW) / 2);  // center the whole grid horizontally

  const canvas = document.createElement("canvas");
  canvas.width = W * S; canvas.height = H * S;
  const ctx = canvas.getContext("2d");
  ctx.scale(S, S);
  ctx.textBaseline = "alphabetic";

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#0a0a16"); bg.addColorStop(0.5, "#0c0b1a"); bg.addColorStop(1, "#0a0a14");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  radial(ctx, W * 0.15, 0, 520, "rgba(120,60,220,0.22)");
  radial(ctx, W * 0.92, 40, 520, "rgba(0,180,180,0.18)");
  radial(ctx, W * 0.5, H, 600, "rgba(255,46,136,0.10)");

  const accent = mode === "collection" ? "#22e0c0" : "#ff2e88";

  // Auto-fit the title so it never overflows or dominates a small collection.
  let titleSize = 44;
  ctx.font = `italic 700 ${titleSize}px "Chakra Petch", sans-serif`;
  while (ctx.measureText(title).width > W - (gridLeft + 22) - pad && titleSize > 24) {
    titleSize -= 1; ctx.font = `italic 700 ${titleSize}px "Chakra Petch", sans-serif`;
  }

  // accent bar scales with the (possibly shrunk) title
  ctx.fillStyle = accent;
  ctx.shadowColor = accent; ctx.shadowBlur = 18;
  ctx.fillRect(gridLeft, pad + 6 + (44 - titleSize) * 0.5, 6, titleSize + 10);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#ffffff";
  ctx.font = `italic 700 ${titleSize}px "Chakra Petch", sans-serif`;
  ctx.fillText(title, gridLeft + 22, pad + 44);

  if (mode === "collection") {
    // Big-number stats + a rank tier that climbs with your collection %.
    const total = set.length;
    const masteredCount = chosen.filter((s) => (lv[s.id] || 0) >= 2).length;
    const collPct = total ? Math.round((ownedSet.length / total) * 100) : 0;
    const masPct = total ? Math.round((masteredCount / total) * 100) : 0;

    const numBaseline = pad + 104, lblBaseline = pad + 126;
    const bigStat = (x, pct, label, color) => {
      ctx.fillStyle = color;
      ctx.font = '700 42px "Chakra Petch", sans-serif';
      ctx.fillText(pct + "%", x, numBaseline);
      const pw = ctx.measureText(pct + "%").width;
      ctx.fillStyle = "rgba(255,255,255,0.62)";
      ctx.font = '600 13px "Chakra Petch", sans-serif';
      ctx.fillText(label, x, lblBaseline);
      return Math.max(pw, ctx.measureText(label).width);
    };
    const x1 = gridLeft + 24;
    const w1 = bigStat(x1, collPct, `COLLECTED ${ownedSet.length}/${total}`, "#2fe3cb");
    const x2 = x1 + w1 + 40;
    const w2 = bigStat(x2, masPct, `MASTERED ${masteredCount}/${total}`, "#ffc23b");
    const numbersRight = x2 + w2;

    // rank ladder (descending thresholds)
    const tiers = [
      { at: 100, name: "COMPLETE" }, { at: 90, name: "LEGEND" }, { at: 75, name: "ELITE" },
      { at: 50, name: "HUNTER" }, { at: 25, name: "COLLECTOR" }, { at: 0, name: "ROOKIE" },
    ];
    const ti = tiers.findIndex((t) => collPct >= t.at);
    const rank = tiers[ti];
    const next = ti > 0 ? tiers[ti - 1] : null;
    const hint = next ? `Next: ${next.name} at ${next.at}%` : "Collection complete";

    // rank pill on the right (only when there's room beside the numbers)
    const pillW = 232, pillH = 58, pillX = W - pad - pillW, pillY = pad + 68;
    if (pillX > numbersRight + 24) {
      ctx.fillStyle = "rgba(255,194,59,0.10)";
      roundRect(ctx, pillX, pillY, pillW, pillH, 14); ctx.fill();
      ctx.strokeStyle = "rgba(255,194,59,0.6)"; ctx.lineWidth = 1.5;
      roundRect(ctx, pillX, pillY, pillW, pillH, 14); ctx.stroke();
      const cx = pillX + pillW / 2;
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = '700 10px "Chakra Petch", sans-serif';
      ctx.fillText("RANK", cx, pillY + 16);
      ctx.fillStyle = "#ffc23b";
      ctx.font = '700 19px "Chakra Petch", sans-serif';
      ctx.fillText(rank.name, cx, pillY + 37);
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = '600 11px "Chakra Petch", sans-serif';
      ctx.fillText(hint, cx, pillY + 52);
      ctx.textAlign = "left";
    }
  } else {
    let subSize = 22;
    ctx.font = `600 ${subSize}px "Chakra Petch", sans-serif`;
    while (ctx.measureText(subtitle).width > W - (gridLeft + 24) - pad && subSize > 13) {
      subSize -= 1; ctx.font = `600 ${subSize}px "Chakra Petch", sans-serif`;
    }
    ctx.fillStyle = accent;
    ctx.fillText(subtitle, gridLeft + 24, pad + 78);
  }

  chosen.forEach((s, i) => {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const inRow = Math.min(cols, count - row * cols);                  // tiles in this row
    const rowOffset = Math.round((gridW - (inRow * tileW + (inRow - 1) * gap)) / 2); // center the last row
    const cx = gridLeft + rowOffset + col * (tileW + gap);
    const cy = headerH + pad + row * (tileH + gap);
    drawTile(ctx, s, imgs[i], cx, cy, tileW, tileH, mode, (lv[s.id] || 0) >= 2);
  });

  let wmSize = 22;
  const wm = CONFIG.SITE_LABEL.toUpperCase();
  ctx.font = `700 ${wmSize}px "Chakra Petch", sans-serif`;
  while (ctx.measureText(wm).width > W - pad * 2 && wmSize > 12) {
    wmSize -= 1; ctx.font = `700 ${wmSize}px "Chakra Petch", sans-serif`;
  }
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.textAlign = "center";
  ctx.fillText(wm, W / 2, H - 26);
  ctx.textAlign = "left";

  let url;
  try { url = canvas.toDataURL("image/png"); }
  catch (err) {
    $("#genBody").innerHTML = `<div class="warn"><b>Couldn't export the image.</b> The sprite icons are loading from another site, which blocks saving. Fix: set <code>USE_LOCAL_IMAGES = true</code> in <code>data.js</code> and ensure images are in the <code>./images/</code> folder.</div>`;
    return;
  }

  const warnHTML = (anyMissing && !CONFIG.USE_LOCAL_IMAGES)
    ? `<div class="warn">Some icons couldn't load across sites, so placeholders were used. For full-quality images, set <code>USE_LOCAL_IMAGES = true</code> in <code>data.js</code>.</div>`
    : "";

  $("#genBody").innerHTML = `
    <div class="gen-preview">
      ${warnHTML}
      <img src="${url}" alt="Generated ${mode} image" />
      <div class="hint">Right-click → Save, or use the button below.</div>
      <div class="gen-actions">
        <button class="btn primary" id="dlImg"><span class="ico">⬇</span> Download PNG</button>
        <button class="btn" data-close>Close</button>
      </div>
    </div>`;
  $("#genBody").querySelector("[data-close]").addEventListener("click", () => closeOverlay("#genOverlay"));
  $("#dlImg").addEventListener("click", () => {
    canvas.toBlob((blob) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = mode === "collection" ? "my-sprite-collection.png" : "sprite-wishlist.png";
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    }, "image/png");
  });
}

function radial(ctx, x, y, r, color) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color); g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

function drawTile(ctx, s, img, x, y, w, h, mode, mastered) {
  const r = 18, color = s.color, dim = mode === "wishlist", nameH = 38;
  ctx.save();

  roundRect(ctx, x, y, w, h, r);
  const grd = ctx.createLinearGradient(x, y, x, y + h);
  grd.addColorStop(0, "rgba(255,255,255,0.06)"); grd.addColorStop(1, "rgba(255,255,255,0.015)");
  ctx.fillStyle = grd; ctx.fill();

  ctx.save();
  roundRect(ctx, x, y, w, h, r); ctx.clip();
  radial(ctx, x + w / 2, y + h * 0.32, w * 0.7, hexA(color, dim ? 0.10 : 0.22));
  ctx.restore();

  // sprite icon: preserve its NATURAL aspect ratio, contained above the name bar
  const areaX = x + 16, areaTop = y + 16, areaW = w - 32, areaH = h - nameH - 32;
  if (img) {
    const iw = img.naturalWidth || img.width || 1, ih = img.naturalHeight || img.height || 1;
    const sc = Math.min(areaW / iw, areaH / ih), dw = iw * sc, dh = ih * sc;
    const dx = areaX + (areaW - dw) / 2, dy = areaTop + (areaH - dh) / 2;
    ctx.save();
    if (dim) ctx.globalAlpha = 0.55;
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.restore();
  } else {
    const side = Math.min(areaW, areaH) * 0.8;
    const dx = areaX + (areaW - side) / 2, dy = areaTop + (areaH - side) / 2;
    ctx.save();
    roundRect(ctx, dx, dy, side, side, side * 0.14);
    ctx.fillStyle = hexA(color, 0.22); ctx.fill();
    ctx.fillStyle = hexA(color, 0.85);
    ctx.font = `700 ${side * 0.5}px "Chakra Petch", sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(s.creatureName[0], dx + side / 2, dy + side / 2);
    ctx.textBaseline = "alphabetic"; ctx.textAlign = "left";
    ctx.restore();
  }

  ctx.font = '700 13px "Chakra Petch", sans-serif';
  const bw = ctx.measureText(s.badge.toUpperCase()).width + 16;
  ctx.fillStyle = color;
  roundRect(ctx, x + 12, y + 12, bw, 22, 6); ctx.fill();
  ctx.fillStyle = "#06060e";
  ctx.fillText(s.badge.toUpperCase(), x + 20, y + 27);

  if (mode === "wishlist") {
    ctx.font = '700 12px "Chakra Petch", sans-serif';
    const txt = fmtRate(s.dropRate), rw = ctx.measureText(txt).width + 14;
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    roundRect(ctx, x + w - 12 - rw, y + 12, rw, 22, 6); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.fillText(txt, x + w - 12 - rw + 7, y + 27);
  }

  const nbY = y + h - nameH - 2;
  ctx.fillStyle = "rgba(6,6,16,0.82)";
  roundRect(ctx, x + 8, nbY, w - 16, nameH, 8); ctx.fill();
  ctx.fillStyle = "#fff";
  let fsize = 14;
  ctx.font = `600 ${fsize}px "Inter", sans-serif`;
  ctx.textAlign = "center";
  let label = s.name.toUpperCase();
  while (ctx.measureText(label).width > w - 28 && fsize > 9) {
    fsize -= 1;
    ctx.font = `600 ${fsize}px "Inter", sans-serif`;
  }
  ctx.fillText(label, x + w / 2, nbY + nameH / 2 + 5);
  ctx.textAlign = "left";

  if (mastered) {
    ctx.save();
    roundRect(ctx, x, y, w, h, r); ctx.clip();
    const fg = ctx.createLinearGradient(x, y, x + w, y + h);
    fg.addColorStop(0.30, "rgba(255,255,255,0)");
    fg.addColorStop(0.46, "rgba(255,255,255,0.30)");
    fg.addColorStop(0.52, "rgba(120,255,230,0.25)");
    fg.addColorStop(0.58, "rgba(255,180,60,0.28)");
    fg.addColorStop(0.74, "rgba(255,255,255,0)");
    ctx.fillStyle = fg; ctx.fillRect(x, y, w, h);
    ctx.restore();
    ctx.strokeStyle = "#ffce46"; ctx.lineWidth = 2.5;
    roundRect(ctx, x + 1.25, y + 1.25, w - 2.5, h - 2.5, r); ctx.stroke();
    ctx.fillStyle = "#ffce46";
    ctx.font = '700 22px "Chakra Petch", sans-serif';
    ctx.textAlign = "right";
    ctx.fillText("♛", x + w - 14, y + h - nameH - 12);
    ctx.textAlign = "left";
  } else {
    ctx.strokeStyle = hexA(color, dim ? 0.4 : 0.7);
    ctx.lineWidth = 1.5;
    roundRect(ctx, x + 0.75, y + 0.75, w - 1.5, h - 1.5, r); ctx.stroke();
  }
  ctx.restore();
}

function hexA(hex, a) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

$("#genCollection").addEventListener("click", () => generateImage("collection"));
$("#genWishlist").addEventListener("click", () => generateImage("wishlist"));

// ---- Boot ----------------------------------------------------------------
load();
checkSharedLink();
renderMeters();
renderGrid();

// ---- Voice search --------------------------------------------------------
(function initVoice() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return;

  const THEME_ALIASES = {
    base: "base", basic: "base",
    gold: "gold", golden: "gold",
    gummy: "gummy", candy: "gummy",
    galaxy: "galaxy",
    holofoil: "holofoil", holo: "holofoil",
    cube: "rift", rift: "rift",
    gem: "gem",
  };

  // Creature name → key; longest first so "zero point" beats "zero"
  const creatureIndex = [];
  const seen = new Set();
  for (const s of SPRITES) {
    if (seen.has(s.creature)) continue;
    seen.add(s.creature);
    creatureIndex.push({ name: s.creatureName.toLowerCase(), key: s.creature });
  }
  creatureIndex.sort((a, b) => b.name.length - a.name.length);

  function parseVoice(text) {
    const t = text.toLowerCase().replace(/\b7\b/g, "seven").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
    let creatureKey = null, remaining = t;
    for (const { name, key } of creatureIndex) {
      if (t.includes(name)) { creatureKey = key; remaining = t.replace(name, " ").trim(); break; }
    }
    if (!creatureKey) return null;
    let themeKey = "base";
    for (const word of remaining.split(" ")) {
      if (THEME_ALIASES[word]) { themeKey = THEME_ALIASES[word]; break; }
    }
    return SPRITES.find(s => s.id === `${themeKey}-${creatureKey}`)
        || SPRITES.find(s => s.creature === creatureKey && s.theme === "base");
  }

  function highlightCard(id) {
    const card = document.querySelector(`[data-id="${id}"]`);
    if (!card) return;
    card.scrollIntoView({ behavior: "smooth", block: "center" });
    card.classList.add("voice-highlight");
    setTimeout(() => card.classList.remove("voice-highlight"), 1600);
  }

  function detailSprite() {
    const overlay = $("#detailOverlay");
    if (!overlay.classList.contains("open")) return null;
    const title = $("#detailTitle").textContent;
    return SPRITES.find(s => s.name === title) || null;
  }

  const btn = $("#voiceBtn");
  btn.style.display = "";

  const rec = new SR();
  rec.lang = "en-US";
  rec.interimResults = false;
  rec.maxAlternatives = 3;

  let active = false; // true = voice mode is on (button toggled)

  rec.onstart = () => btn.classList.add("listening");

  // Restart automatically on end so voice stays on
  rec.onend = () => {
    if (active) {
      try { rec.start(); } catch (_) {}
    } else {
      btn.classList.remove("listening");
    }
  };

  rec.onerror = (e) => {
    if (e.error === "no-speech") return; // silence — just restart
    if (e.error === "aborted")  return;
    toast("Mic error: " + e.error);
  };

  rec.onresult = (e) => {
    const result = e.results[e.resultIndex];
    if (!result.isFinal) return;
    const alts = [...result].map(a => a.transcript.trim());
    const spoken = alts[0].toLowerCase();

    // --- Modal commands (when detail flyout is open) ---
    const openSprite = detailSprite();
    if (openSprite) {
      if (/\b(exit|close|back|dismiss|cancel|done)\b/.test(spoken)) {
        closeOverlay("#detailOverlay");
        toast("Closed");
        return;
      }
      if (/\b(add|collect|got it|i got (it|one)|owned)\b/.test(spoken)) {
        if (!isOwned(openSprite.id)) { setStatus(openSprite.id, 1); openDetail(openSprite); }
        toast("Added to collection");
        return;
      }
      if (/\b(master|mastered|mastery|mark master)\b/.test(spoken)) {
        setStatus(openSprite.id, 2); openDetail(openSprite);
        toast("Marked as mastered");
        return;
      }
      if (/\b(remove|un-?collect|delete|not collected)\b/.test(spoken)) {
        setStatus(openSprite.id, 0); openDetail(openSprite);
        toast("Removed from collection");
        return;
      }
    }

    // --- Sprite search ---
    let sprite = null;
    for (const alt of alts) { sprite = parseVoice(alt); if (sprite) break; }
    if (!sprite) { toast(`Couldn't find "${alts[0]}"`); return; }
    highlightCard(sprite.id);
    openDetail(sprite);
  };

  function toggleVoice() {
    if (active) {
      active = false;
      rec.stop();
      toast("Voice off");
    } else {
      active = true;
      toast("Voice on — say a sprite name");
      try { rec.start(); } catch (_) {}
    }
  }

  btn.addEventListener("click", toggleVoice);

  document.addEventListener("keydown", (e) => {
    if (e.key === "v" && !e.ctrlKey && !e.metaKey && document.activeElement.tagName !== "INPUT")
      toggleVoice();
  });
})();
