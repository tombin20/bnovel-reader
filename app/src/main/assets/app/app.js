(() => {
"use strict";
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const norm = s => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");
const ls = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
};
const h = html => { const d = document.createElement("div"); d.innerHTML = html.trim(); return d.firstElementChild; };
const BASE0 = "https://bnovel.tombin2k.workers.dev";
const THEMES = [["dark", "#17191d"], ["black", "#000"], ["sepia", "#f1eadb"], ["light", "#fff"], ["march7", "linear-gradient(135deg,#f6a6cb,#a9cdf3)"]];
const SV = d => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
const ICON = {
  back: SV('<path d="M15 5l-7 7 7 7"/>'),
  list: SV('<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>'),
  skipPrev: SV('<path d="M6 5v14"/><path d="M19 5L9 12l10 7z"/>'),
  skipNext: SV('<path d="M18 5v14"/><path d="M5 5l10 7-10 7z"/>'),
  rew: SV('<path d="M11 6.5L4.5 12l6.5 5.5zM19.5 6.5L13 12l6.5 5.5z"/>'),
  fwd: SV('<path d="M13 6.5l6.5 5.5-6.5 5.5zM4.5 6.5L11 12l-6.5 5.5z"/>'),
  play: SV('<path fill="currentColor" d="M8 5l11 7-11 7z"/>'),
  pause: SV('<path d="M9 5v14M15 5v14" stroke-width="3.4"/>'),
  timer: SV('<circle cx="12" cy="13.5" r="7"/><path d="M12 9.5v4l2.5 1.5M9.5 3h5"/>'),
  power: SV('<path d="M12 3v8"/><path d="M6.3 7.2a8 8 0 1011.4 0"/>'),
  voice: SV('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/>'),
  gear: SV('<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1"/>'),
  scrollV: SV('<path d="M12 4v16M8 8l4-4 4 4M8 16l4 4 4-4"/>'),
  pageH: SV('<path d="M4 12h16M8 8l-4 4 4 4M16 8l4 4-4 4"/>'),
  phones: SV('<path d="M4 15v-3a8 8 0 0116 0v3"/><rect x="3" y="14" width="4" height="6.5" rx="1.6"/><rect x="17" y="14" width="4" height="6.5" rx="1.6"/>'),
};
const native = window.AndroidTTS || null;
const APP_VER = native && window.AndroidApp ? (window.AndroidApp.versionName() || "") : "";

const clampRate = v => Math.min(2, Math.max(0.1, Math.round((+v || 1) * 100) / 100));
const fmtRate = v => (+v).toFixed(2) + "x";
let cfg = Object.assign({ base: BASE0, theme: "dark", rtheme: "app", size: 19, font: "serif", lh: 1.8, mode: "scroll", rate: 1, voice: "", dim: 0, rfg: "" }, ls.get("cfg", {}));
const saveCfg = () => ls.set("cfg", cfg);
// giao diện khi đọc: "app" = theo giao diện ứng dụng, hoặc một trong các giao diện riêng
const rKey = () => (cfg.rtheme && cfg.rtheme !== "app" && THEMES.some(t => t[0] === cfg.rtheme)) ? cfg.rtheme : cfg.theme;
let fav = ls.get("fav", []);            // [{id,title,cover,chapters}]
let hist = ls.get("hist", {});          // {sid:{id,title,cover,pos,ct,p,t}}
let dl = ls.get("dl", {});              // {sid:{story,chapters,have:[pos],imgs:[file]}}
let acct = ls.get("acct", null);        // {token,user}
let stats = ls.get("stats", {});        // {sid:{title,cover,r,l}} giây
let days = ls.get("days", {});          // {"YYYY-MM-DD":[đọc,nghe]}
let imgHave = new Set(ls.get("imgs", []));
let queue = ls.get("queue", []);        // thao tác đồng bộ chưa gửi được
const saveImgs = () => ls.set("imgs", [...imgHave]);

const abs = u => !u ? "" : /^https?:/.test(u) ? u : cfg.base + (u[0] === "/" ? "" : "/") + u;
const cdn = (u, w) => /^https:\/\/res\.cloudinary\.com\//.test(u) ? u.replace("/image/upload/", `/image/upload/f_auto,q_auto:best,w_${w}/`) : u;
function hash(s) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}
const imgFull = (u, w) => cdn(abs(u), w);
const imgFile = full => hash(full) + "." + ((full.split("?")[0].match(/\.(jpg|jpeg|png|webp|gif)$/i) || [0, "jpg"])[1].toLowerCase());
// Ảnh: ưu tiên bản đã tải về máy
function img(u, w = 600) {
  if (!u) return "";
  const f = imgFull(u, w), n = imgFile(f);
  return native && imgHave.has(n) ? "/imgcache/" + n : f;
}
let imgId = 0; const imgPend = {};
window.__img = (id, ok) => { const p = imgPend[id]; delete imgPend[id]; if (p) p(ok); };
function cacheImg(u, w) {
  if (!native || !u) return Promise.resolve(null);
  const f = imgFull(u, w), n = imgFile(f);
  if (imgHave.has(n)) return Promise.resolve(n);
  return new Promise(res => { const id = ++imgId; imgPend[id] = ok => { if (ok) imgHave.add(n); res(ok ? n : null); }; AndroidHttp.cacheImage(id, f, n); });
}

let toastT;
function toast(msg) {
  const t = $("#toast"); t.textContent = msg; t.hidden = false;
  t.classList.remove("out"); t.style.animation = "none"; void t.offsetWidth; t.style.animation = "";
  clearTimeout(toastT);
  toastT = setTimeout(() => { t.classList.add("out"); toastT = setTimeout(() => { t.hidden = true; t.classList.remove("out"); }, 220); }, 2600);
}
function applyTheme() {
  const r = document.documentElement;
  r.dataset.theme = cfg.theme;
  r.style.setProperty("--size", cfg.size + "px");
  r.style.setProperty("--lh", cfg.lh);
  r.style.setProperty("--font", (FONTS[cfg.font] || FONTS.serif)[1]);
  if (window.__bgApply) window.__bgApply();
  applyBars();
}
const FONTS = {
  serif: ["Noto Serif (mặc định)", "'Noto Serif',Georgia,'Times New Roman',serif"],
  lora: ["Lora - mềm mại, sang trọng", "'Lora','Noto Serif',Georgia,serif"],
  crimson: ["Crimson Pro - gần giống Minion", "'Crimson Pro','Noto Serif',Georgia,serif"],
  plex: ["IBM Plex Serif - hiện đại, rõ nét", "'IBM Plex Serif','Noto Serif',Georgia,serif"],
  times: ["Liberation Serif - kiểu Times New Roman", "'Liberation Serif','Times New Roman','Noto Serif',serif"],
  grand: ["NVN Grand Hotel - chữ viết tay", "'NVN Grand Hotel','Noto Serif',Georgia,serif"],
  work: ["Work Sans - không chân, dễ đọc", "'Work Sans',system-ui,'Be Vietnam Pro',sans-serif"],
  sans: ["Không chân (hệ thống)", "system-ui,'Be Vietnam Pro',sans-serif"],
};
const fontOpts = () => Object.entries(FONTS).map(([k, f]) => `<option value="${k}">${f[0]}</option>`).join("");
const BARS = { dark: ["#15171b", 0], black: ["#000000", 0], sepia: ["#f3ecdc", 1], light: ["#fbfbfc", 1], march7: ["#fdeaf3", 1] };
function applyBars() {
  let key = cfg.theme;
  try { const t = stack[stack.length - 1]; if (t && t.classList.contains("rd") && t.style.display !== "none") key = t.dataset.theme || key; } catch {}
  const b = BARS[key] || BARS.dark;
  try { if (window.AndroidApp && window.AndroidApp.setBars) window.AndroidApp.setBars(b[0], !!b[1]); } catch {}
}
applyBars();
applyTheme();
const swatches = (cur, attr = "data-th") => THEMES.map(([k, c]) => `<button ${attr}="${k}" class="${cur === k ? "on" : ""}" style="background:${c};color:${k === "dark" || k === "black" ? "#fff" : "#000"}" aria-label="${k}">Aa</button>`).join("");

// ---------- HTTP ----------
let hid = 0; const pend = {};
window.__http = (id, status, body) => {
  const p = pend[id]; delete pend[id]; if (!p) return;
  if (status >= 200 && status < 300) { try { p.ok(JSON.parse(body)); } catch { p.err(new Error("Dữ liệu lỗi")); } }
  else { let m = ""; try { m = JSON.parse(body).error; } catch {} const e = new Error(m || (status ? "Lỗi " + status : "Không kết nối được mạng")); e.status = status; p.err(e); }
};
function api(path, method = "GET", body = null, auth = false) {
  const url = cfg.base + path, tk = auth && acct ? acct.token : "";
  if (native && window.AndroidHttp) return new Promise((ok, err) => { const id = ++hid; pend[id] = { ok, err }; AndroidHttp.request(id, method, url, body ? JSON.stringify(body) : "", tk); });
  return fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : {}, body: body ? JSON.stringify(body) : undefined })
    .then(async r => { const j = await r.json().catch(() => ({})); if (!r.ok) { const e = new Error(j.error || "Lỗi " + r.status); e.status = r.status; throw e; } return j; });
}

// ---------- IndexedDB (nội dung chương đã tải) ----------
const idb = new Promise((res, rej) => {
  const r = indexedDB.open("bnovel-reader", 1);
  r.onupgradeneeded = () => r.result.createObjectStore("ch");
  r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
});
const tx = (mode, fn) => idb.then(db => new Promise((res, rej) => {
  const t = db.transaction("ch", mode); const r = fn(t.objectStore("ch"));
  t.oncomplete = () => res(r && r.result); t.onerror = () => rej(t.error);
}));
const chGet = k => tx("readonly", s => s.get(k));
const chPut = (k, v) => tx("readwrite", s => s.put(v, k));
const chDel = k => tx("readwrite", s => s.delete(k));

// ---------- Hình nền ứng dụng (ảnh từ máy) ----------
// Ảnh được: cắt vừa tỉ lệ màn hình, thu nhỏ, làm mờ, rồi PHỦ một lớp màu giao diện (độ phủ tự tính theo độ sáng/độ tương phản của ảnh)
// => dù ảnh sáng, tối hay nhiều chi tiết thì chữ và bìa truyện vẫn rõ, không dính vào nền.
const BG_KEY = "__bg", THEME_BG = { dark: "#15171b", black: "#000000", sepia: "#f3ecdc", light: "#fbfbfc", march7: "#fdeaf3" };
let bgSrc = null, bgUrl = "", bgSig = "";
const hexRgb = h => { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const lumOf = (r, g, b) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
const clamp01 = (v, a, b) => Math.min(b, Math.max(a, v));
function bgAlpha() {
  const b = cfg.bg; if (!b) return 0.8;
  if (b.dim != null) return clamp01(b.dim, 0.5, 0.96);
  const L = lumOf(...hexRgb(THEME_BG[cfg.theme] || THEME_BG.dark));
  return +clamp01(0.62 + 0.4 * Math.abs((b.lum || 0.5) - L) + 0.5 * (b.std || 0.2), 0.6, 0.93).toFixed(2);
}
const loadBmp = async f => { try { return await createImageBitmap(f, { imageOrientation: "from-image" }); } catch { const u = URL.createObjectURL(f); try { const i = new Image(); i.src = u; await i.decode(); return i; } finally { setTimeout(() => URL.revokeObjectURL(u), 2000); } } };
const toBlob = (cv, q) => new Promise(r => cv.toBlob(r, "image/jpeg", q));
async function bgProcess(file) {
  const bmp = await loadBmp(file), bw = bmp.width, bh = bmp.height;
  const W = 720, H = Math.round(W * clamp01(innerHeight / Math.max(1, innerWidth), 1.2, 2.4));
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const c = cv.getContext("2d"), sc = Math.max(W / bw, H / bh);
  c.imageSmoothingQuality = "high";
  c.drawImage(bmp, (W - bw * sc) / 2, (H - bh * sc) / 2, bw * sc, bh * sc);
  const sm = document.createElement("canvas"); sm.width = 32; sm.height = 32;
  const sc2 = sm.getContext("2d"); sc2.drawImage(cv, 0, 0, 32, 32);
  const d = sc2.getImageData(0, 0, 32, 32).data, ls_ = [];
  for (let i = 0; i < d.length; i += 4) ls_.push(lumOf(d[i], d[i + 1], d[i + 2]));
  const mean = ls_.reduce((a, b) => a + b, 0) / ls_.length;
  const std = Math.sqrt(ls_.reduce((a, b) => a + (b - mean) * (b - mean), 0) / ls_.length);
  if (bmp.close) bmp.close();
  return { blob: await toBlob(cv, 0.86), lum: mean, std };
}
async function bgBuild(blob, level) {      // làm mờ bằng cách thu nhỏ nhiều bước, trình duyệt phóng lại sẽ mượt
  if (!level) return URL.createObjectURL(blob);
  const bmp = await createImageBitmap(blob), f = level === 1 ? 3 : 8;
  let w = bmp.width, h = bmp.height, src = bmp;
  const tw = Math.max(16, Math.round(w / f)), th = Math.max(16, Math.round(h / f));
  while (w > tw * 1.01) {
    w = Math.max(tw, Math.round(w / 2)); h = Math.max(th, Math.round(h / 2));
    const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
    const c = cv.getContext("2d"); c.imageSmoothingQuality = "high"; c.drawImage(src, 0, 0, w, h); src = cv;
  }
  if (bmp.close) bmp.close();
  return URL.createObjectURL(await toBlob(src, 0.9));
}
async function applyBg() {
  const root = document.documentElement, b = cfg.bg;
  if (!b || !b.on || !bgSrc) { root.removeAttribute("data-bg"); root.style.removeProperty("--bgurl"); root.style.removeProperty("--scrim"); return; }
  const sig = (b.blur || 0) + ":" + (bgSrc.size || 0);
  if (sig !== bgSig) {
    const old = bgUrl; bgUrl = await bgBuild(bgSrc, b.blur || 0); bgSig = sig;
    if (old) setTimeout(() => URL.revokeObjectURL(old), 3000);
  }
  const [r, g, bl] = hexRgb(THEME_BG[cfg.theme] || THEME_BG.dark);
  root.style.setProperty("--scrim", `rgba(${r},${g},${bl},${bgAlpha()})`);
  root.style.setProperty("--bgurl", `url("${bgUrl}")`);
  root.dataset.bg = "1";
}
async function bgSet(file) {
  const r = await bgProcess(file);
  await chPut(BG_KEY, r.blob); bgSrc = r.blob; bgSig = "";
  cfg.bg = { on: true, blur: cfg.bg ? cfg.bg.blur : 1, lum: r.lum, std: r.std, dim: null }; saveCfg();
  await applyBg();
}
async function bgClear() { cfg.bg = null; saveCfg(); bgSrc = null; bgSig = ""; try { await chDel(BG_KEY); } catch {} await applyBg(); }
window.__bgApply = () => { applyBg().catch(() => {}); };
(async () => { if (cfg.bg && cfg.bg.on) { try { bgSrc = await chGet(BG_KEY); } catch {} if (!bgSrc) { cfg.bg = null; saveCfg(); } applyBg().catch(() => {}); } })();

// ---------- Dữ liệu truyện ----------
let storiesCache = null;
async function stories() {
  if (storiesCache) return storiesCache;
  try { storiesCache = (await api("/api/stories")).stories; ls.set("stories", storiesCache); }
  catch (e) { storiesCache = ls.get("stories", null); if (!storiesCache) throw e; toast("Đang dùng dữ liệu đã lưu (không có mạng)"); }
  return storiesCache;
}
async function getToc(id) {
  try { return (await api("/api/chapters?story=" + id)).chapters; }
  catch (e) { if (dl[id]) return dl[id].chapters; throw e; }
}
const memo = {};
async function getChapter(sid, pos) {
  const k = sid + ":" + pos;
  if (memo[k]) return memo[k];
  try { const c = await chGet(k); if (c) return c; } catch {}
  if (window.AndroidDl) { try { const t = window.AndroidDl.readChapter(+sid, +pos); if (t) return JSON.parse(t); } catch {} }
  const c = (await api(`/api/chapter?story=${sid}&pos=${pos}`)).chapter;
  memo[k] = c; return c;
}
const IMG_RE = /^!\[\]\((.+)\)$/;
const renderContent = text => String(text || "").split(/\n+/).map(l => l.trim()).filter(Boolean).map((l, i) => {
  const m = l.match(IMG_RE);
  return m ? `<img data-p="${i}" src="${esc(img(m[1], 1400))}" alt="">` : `<p data-p="${i}">${esc(l)}</p>`;
}).join("");
const imgsOf = text => String(text || "").split(/\n+/).map(l => (l.trim().match(IMG_RE) || [])[1]).filter(Boolean);

// ---------- Thống kê thời gian ----------
const dayKey = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
let statDirty = false;
// kind: 0 = đọc (không bấm nghe), 1 = nghe
function addTime(story, kind, sec) {
  if (!(sec > 0)) return;
  const s = stats[story.id] || (stats[story.id] = { title: story.title, cover: story.cover, r: 0, l: 0 });
  s.title = story.title; s.cover = story.cover;
  if (kind) s.l += sec; else s.r += sec;
  const d = days[dayKey()] || (days[dayKey()] = [0, 0]); d[kind] += sec;
  statDirty = true;
}
setInterval(() => { if (statDirty) { statDirty = false; ls.set("stats", stats); ls.set("days", days); } }, 5000);
document.addEventListener("visibilitychange", () => { if (document.hidden && statDirty) { statDirty = false; ls.set("stats", stats); ls.set("days", days); } });
const fmt = sec => { if (sec < 60) return Math.round(sec) + "s"; const m = Math.round(sec / 60), hh = Math.floor(m / 60); return hh ? `${hh}h ${m % 60}m` : `${m}m`; };

// ---------- Đồng bộ tài khoản web ----------
const saveQ = () => ls.set("queue", queue);
function pushOp(method, path, body) {
  if (!acct) return;
  api(path, method, body, true).catch(e => { if (e.status === 401) return; queue.push({ method, path, body }); saveQ(); });
}
let pushT = {};
function pushHist(sid, pos) {
  if (!acct) return;
  clearTimeout(pushT[sid]);
  pushT[sid] = setTimeout(() => pushOp("PUT", "/api/history", { story: sid, pos }), 2500);
}
let syncing = false;
async function sync(manual) {
  if (!acct || syncing) return;
  syncing = true; setSyncIcon(true);
  try {
    try { const r = await api("/api/token-refresh", "POST", {}, true); acct.token = r.token; acct.user = r.user; ls.set("acct", acct); }
    catch (e) { if (e.status === 401) { acct = null; ls.set("acct", null); toast("Phiên liên kết đã hết hạn, hãy liên kết lại"); return; } throw e; }
    const q = queue; queue = []; saveQ();
    for (const o of q) { try { await api(o.path, o.method, o.body, true); } catch { queue.push(o); } }
    saveQ();
    const [fr, hr] = await Promise.all([api("/api/follows", "GET", null, true), api("/api/history", "GET", null, true)]);
    const sf = fr.follows || [], sids = new Set(sf.map(f => f.id));
    for (const f of fav) if (!sids.has(f.id)) await api("/api/follow?story=" + f.id, "PUT", {}, true).catch(() => {});
    const localOnly = fav.filter(f => !sids.has(f.id));
    fav = sf.map(f => ({ id: f.id, title: f.title, cover: f.cover, chapters: f.chapters })).concat(localOnly);
    ls.set("fav", fav);
    const sh = hr.history || [], shIds = new Set(sh.map(x => x.id));
    for (const x of sh) {
      const t = Date.parse(x.updated_at) || 0, l = hist[x.id];
      if (!l || t > l.t + 1000) hist[x.id] = { id: x.id, title: x.title, cover: x.cover, pos: x.chapter_pos, ct: x.chapter_title || "", p: l && l.pos === x.chapter_pos ? l.p : 0, t };
      else if (l.t > t + 1000) api("/api/history", "PUT", { story: x.id, pos: l.pos }, true).catch(() => {});
    }
    for (const l of Object.values(hist)) if (!shIds.has(l.id)) api("/api/history", "PUT", { story: l.id, pos: l.pos }, true).catch(() => {});
    ls.set("hist", hist);
    if (manual) toast("Đã đồng bộ với tài khoản " + acct.user.name);
    if (tab === "lib" && !stack.length) renderLib(); else if (tab === "set" && !stack.length) renderSettings();
  } catch (e) { if (manual) toast("Đồng bộ lỗi: " + e.message); }
  finally { syncing = false; setSyncIcon(false); }
}
function setSyncIcon(on) { const b = $("#syncb"); if (b) b.classList.toggle("spin", on); }

// ---------- Điều hướng ----------
const app = $("#app"), view = $("#view");
// ảnh bìa hiện mờ dần khi tải xong (load/error không nổi bọt nên bắt ở pha capture)
["load", "error"].forEach(ev => document.addEventListener(ev, e => { if (e.target && e.target.tagName === "IMG") e.target.classList.add("ld"); }, true));
if (document.fonts && document.fonts.addEventListener) document.fonts.addEventListener("loadingdone", () => { if (window.__fontsDone) window.__fontsDone(); });
const stack = []; let tab = "lib", sheetEl = null, bg = null;
function push(el) { el.classList.add("screen"); app.append(el); stack.push(el); updateMini(); applyBars(); return el; }
function pop() { const el = stack.pop(); if (el) { if (el.onclose) el.onclose(); el.classList.add("out"); setTimeout(() => el.remove(), 240); } updateMini(); applyBars(); }
function openSheet(html) {
  closeSheet();
  sheetEl = h(`<div class="back"><div class="sheet">${html}</div></div>`);
  sheetEl.addEventListener("click", e => { if (e.target === sheetEl) closeSheet(); });
  document.body.append(sheetEl); return $(".sheet", sheetEl);
}
function closeSheet() { if (sheetEl) { const e = sheetEl; sheetEl = null; e.classList.add("closing"); setTimeout(() => e.remove(), 220); } }
window.__back = () => {
  try {
    if (sheetEl) { closeSheet(); return true; }
    const t = stack[stack.length - 1];
    if (t) { if (t._leave) t._leave(); else pop(); return true; }
    if (tab !== "lib") { go("lib"); return true; }
    return false;
  } catch (e) { // lỗi JS không được làm thoát app: gỡ màn hình trên cùng rồi coi như đã xử lý
    const el = stack.pop(); if (el) { try { el.remove(); } catch {} try { updateMini(); } catch {} return true; }
    return false;
  }
};

// mini player (khi thoát trang đọc mà sách nói vẫn chạy)
function updateMini() {
  const m = $("#mini");
  document.body.classList.toggle("hasmini", !!bg);
  if (!bg) { m.hidden = true; return; }
  m.style.bottom = stack.length ? "0px" : $("#tabs").offsetHeight + "px";
  const a = bg._api; m.hidden = false;
  $("#mt1").textContent = a.title(); $("#mt2").textContent = a.ch(); $("#mpl").textContent = a.playing() ? "⏸" : "▶";
}
function closeBg() { const e = bg; if (!e) return; bg = null; updateMini(); if (e.onclose) e.onclose(); e.remove(); }
$("#mpl").onclick = () => { if (bg) bg._api.toggle(); };
$("#mx").onclick = closeBg;
$("#mini .mt").onclick = () => { if (!bg) return; const e = bg; bg = null; e.style.display = ""; stack.push(e); updateMini(); };

const titles = { lib: "Tủ sách", home: "Khám phá", genre: "Thể loại", stat: "Thống kê", set: "Cài đặt" };
function go(t) {
  tab = t;
  $("#ttl").textContent = titles[t];
  $("#syncb").hidden = !acct || t !== "lib";
  $$("#tabs button").forEach(b => b.classList.toggle("on", b.dataset.tab === t));
  view.scrollTop = 0;
  view.classList.remove("swap"); void view.offsetWidth; view.classList.add("swap");
  ({ lib: renderLib, home: renderHome, genre: renderGenres, stat: renderStats, set: renderSettings })[t]();
}
$("#tabs").addEventListener("click", e => { const b = e.target.closest("[data-tab]"); if (b) { while (stack.length) pop(); go(b.dataset.tab); } });
$("#syncb").onclick = () => sync(true);
view.addEventListener("scroll", () => $("#top").classList.toggle("sc", view.scrollTop > 6), { passive: true });
app.addEventListener("click", e => {
  const c = e.target.closest("[data-id]"); if (c && !e.target.closest("[data-del]")) openStory(+c.dataset.id);
  const r = e.target.closest("[data-resume]"); if (r && !e.target.closest("[data-del]")) resume(+r.dataset.resume);
});

const card = (s, mode) => `<button class="card" ${mode === "resume" ? `data-resume="${s.id}"` : `data-id="${s.id}"`}><div class="cvw"><img class="cv" loading="lazy" src="${esc(img(s.cover, 400))}" alt="">
  <span class="bd">${fav.some(f => f.id === s.id) ? "♥" : ""}${dl[s.id] ? "⬇" : ""}</span></div><b>${esc(s.title)}</b>
  <small>${esc(s.ct || (s.chapters ? s.chapters + " chương" : ""))}</small></button>`;
const grid = (l, mode) => l.map(s => card(s, mode)).join("");
const skel = (n = 9) => Array.from({ length: n }, () => `<div class="card sk"><div class="cvw"><div class="cv"></div></div><b></b><small></small></div>`).join("");

// ---------- Tủ sách (trang chủ) ----------
let libTab = "all";
function shelf() {
  const m = new Map();
  fav.forEach(f => m.set(f.id, { id: f.id, title: f.title, cover: f.cover, chapters: f.chapters, t: 0 }));
  Object.values(hist).forEach(x => { const e = m.get(x.id) || { id: x.id, title: x.title, cover: x.cover, t: 0 }; Object.assign(e, { t: x.t, ct: x.ct }); m.set(x.id, e); });
  Object.values(dl).forEach(d => { if (!m.has(d.story.id)) m.set(d.story.id, { id: d.story.id, title: d.story.title, cover: d.story.cover, t: 0 }); });
  return [...m.values()].sort((a, b) => b.t - a.t);
}
function renderLib() {
  const tabs = [["all", "Tất cả"], ["hist", "Đang đọc"], ["fav", "Theo dõi"], ["dl", "Đã tải"]];
  let body = "";
  const empty = `<p class="empty">Kệ sách còn trống.<br>Qua tab <b>Khám phá</b> để chọn truyện, bấm ♡ để thêm vào đây.</p>`;
  if (libTab === "all") { const l = shelf(); body = l.length ? `<div class="grid">${grid(l)}</div>` : empty; }
  if (libTab === "fav") body = fav.length ? `<div class="grid">${grid(fav)}</div>` : `<p class="empty">Chưa theo dõi truyện nào</p>`;
  if (libTab === "hist") {
    const l = Object.values(hist).sort((a, b) => b.t - a.t);
    body = l.length ? l.map(s => `<div class="li" data-resume="${s.id}"><img src="${esc(img(s.cover, 400))}" alt=""><div class="t"><b>${esc(s.title)}</b><small>${esc(s.ct || "")}</small></div><button class="x" data-del="${s.id}">✕</button></div>`).join("") : `<p class="empty">Chưa có lịch sử đọc</p>`;
  }
  if (libTab === "dl") {
    const l = Object.values(dl);
    body = l.length ? l.map(d => `<div class="li" data-id="${d.story.id}"><img src="${esc(img(d.story.cover, 400))}" alt=""><div class="t"><b>${esc(d.story.title)}</b><small>${d.have.length}/${d.chapters.length} chương</small></div><button class="x" data-del="${d.story.id}">🗑</button></div>`).join("") : `<p class="empty">Chưa tải truyện nào.<br>Mở truyện rồi bấm ⬇ để đọc offline (cả chữ lẫn ảnh).</p>`;
  }
  view.innerHTML = `<div class="chips" style="margin-bottom:12px">${tabs.map(([k, n]) => `<button class="chip ${k === libTab ? "on" : ""}" data-lt="${k}">${n}</button>`).join("")}</div>${body}`;
  $$("[data-lt]", view).forEach(b => b.onclick = () => { libTab = b.dataset.lt; renderLib(); });
  $$("[data-del]", view).forEach(b => b.onclick = async e => {
    e.stopPropagation(); const id = +b.dataset.del;
    if (libTab === "hist") { delete hist[id]; ls.set("hist", hist); if (acct) pushOp("DELETE", "/api/history?story=" + id); }
    if (libTab === "dl") { if (!confirm("Xóa các chương đã tải của truyện này?")) return; await deleteDl(id); }
    renderLib();
  });
}
async function deleteDl(id) {
  const d = dl[id]; if (!d) return;
  if (window.AndroidDl) { try { window.AndroidDl.remove(+id); } catch {} delete jobs[id]; }
  for (const p of d.have) { try { await chDel(id + ":" + p); } catch {} }
  const keep = new Set(); Object.values(dl).forEach(x => { if (x !== d) (x.imgs || []).forEach(n => keep.add(n)); });
  const del = (d.imgs || []).filter(n => !keep.has(n));
  del.forEach(n => imgHave.delete(n)); saveImgs();
  if (native && del.length) AndroidHttp.deleteImages(JSON.stringify(del));
  delete dl[id]; ls.set("dl", dl);
}

// ---------- Khám phá ----------
async function renderHome() {
  view.innerHTML = `<div class="search"><input id="q" type="search" placeholder="Tìm truyện..."></div><div id="list" class="grid">${skel()}</div>`;
  let all;
  try { all = await stories(); } catch (e) { $("#list").innerHTML = `<p class="err" style="grid-column:1/-1">${esc(e.message)}<br><button class="btn" id="retry">Thử lại</button></p>`; $("#retry").onclick = renderHome; return; }
  const draw = q => {
    const k = norm(q), f = k ? all.filter(s => norm(s.title + " " + (s.alts || "") + " " + (s.series || "")).includes(k)) : all;
    $("#list").innerHTML = f.length ? grid(f) : `<p class="empty" style="grid-column:1/-1">Không tìm thấy truyện</p>`;
  };
  draw(""); $("#q").oninput = e => draw(e.target.value);
}

// ---------- Thể loại ----------
async function renderGenres() {
  view.innerHTML = `<p class="load">Đang tải...</p>`;
  try {
    const g = (await api("/api/genres")).genres;
    view.innerHTML = `<div class="chips">${g.map(x => `<button class="chip" data-g="${esc(x.name)}">${esc(x.name)} (${x.n})</button>`).join("")}</div>`;
    $$(".chip", view).forEach(b => b.onclick = () => openList(b.dataset.g, "/api/stories?genre=" + encodeURIComponent(b.dataset.g)));
  } catch (e) { view.innerHTML = `<p class="err">${esc(e.message)}</p>`; }
}
async function openList(title, path) {
  const el = push(h(`<div><div class="bar"><button class="bk" aria-label="Quay lại">${ICON.back}</button><b>${esc(title)}</b></div><div class="body"><div class="grid">${skel()}</div></div></div>`));
  $(".bk", el).onclick = pop;
  try { const l = (await api(path)).stories; $(".grid", el).innerHTML = l.length ? grid(l) : `<p class="empty">Chưa có truyện</p>`; }
  catch (e) { $(".grid", el).innerHTML = `<p class="err">${esc(e.message)}</p>`; }
}

// ---------- Thống kê ----------
let statSort = "t";
function renderStats() {
  const list = Object.entries(stats).map(([id, s]) => ({ id: +id, ...s, t: s.r + s.l }));
  const R = list.reduce((a, s) => a + s.r, 0), L = list.reduce((a, s) => a + s.l, 0), T = R + L;
  const td = days[dayKey()] || [0, 0];
  const last = []; for (let i = 6; i >= 0; i--) { const d = new Date(Date.now() - i * 864e5); const k = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); last.push([d.getDate() + "/" + (d.getMonth() + 1), days[k] || [0, 0]]); }
  const mx = Math.max(60, ...last.map(([, v]) => v[0] + v[1]));
  const sorted = list.filter(s => s[statSort] > 0).sort((a, b) => b[statSort] - a[statSort]);
  const top = Math.max(1, ...sorted.map(s => s.t));
  view.innerHTML = `<div class="stc"><div class="sth">Tổng</div><div class="stbig">${fmt(T)} <small>Tổng thời gian</small></div>
    <div class="stbar"><i class="r" style="flex:${R || 0.0001}"></i><i class="l" style="flex:${L || 0.0001}"></i></div>
    <div class="stleg"><span><i class="dot r"></i>Đọc<br><b>${fmt(R)}</b></span><span style="text-align:right"><i class="dot l"></i>Nghe<br><b>${fmt(L)}</b></span></div></div>
    <div class="stc"><div class="sth">Hôm nay: đọc ${fmt(td[0])} · nghe ${fmt(td[1])}</div>
    <div class="days">${last.map(([n, v]) => `<div class="dy"><div class="col"><i class="l" style="height:${v[1] / mx * 100}%"></i><i class="r" style="height:${v[0] / mx * 100}%"></i></div><small>${n}</small></div>`).join("")}</div></div>
    <div class="strk"><b>Xếp hạng</b><div class="seg">${[["t", "Tổng"], ["r", "Đọc"], ["l", "Nghe"]].map(([k, n]) => `<button data-s="${k}" class="${statSort === k ? "on" : ""}">${n}</button>`).join("")}</div></div>
    ${sorted.length ? sorted.map(s => `<div class="stc sti" data-id="${s.id}"><img src="${esc(img(s.cover, 400))}" alt=""><div class="t"><div class="tl"><b>${esc(s.title)}</b><span>${fmt(s[statSort])}</span></div>
      <div class="tl"><small>Đọc ${fmt(s.r)}</small><small>Nghe ${fmt(s.l)}</small></div>
      <div class="stbar sm" style="width:${s.t / top * 100}%"><i class="r" style="flex:${s.r || 0.0001}"></i><i class="l" style="flex:${s.l || 0.0001}"></i></div></div></div>`).join("") : `<p class="empty">Chưa có dữ liệu.<br>Thời gian đọc và nghe sẽ được ghi lại khi bạn dùng app.</p>`}`;
  $$("[data-s]", view).forEach(b => b.onclick = () => { statSort = b.dataset.s; renderStats(); });
}

// ---------- Cài đặt ----------
function renderSettings() {
  view.innerHTML = `<div class="set">
    <h4>Tài khoản B-novel</h4>
    ${acct ? `<div class="r"><label>Đã liên kết: <b>${esc(acct.user.name)}</b></label></div><p class="muted">Truyện theo dõi và lịch sử đọc được đồng bộ với web.</p>
      <div class="r"><button class="btn solid" id="syncnow">Đồng bộ ngay</button><button class="btn danger" id="unlink">Hủy liên kết</button></div>`
    : `<p class="muted">Trên web: vào <b>Tài khoản → Tạo mã liên kết</b>, rồi nhập mã 8 ký tự vào đây để đồng bộ.</p>
      <div class="r"><input id="lc" maxlength="9" autocapitalize="characters" placeholder="MÃ LIÊN KẾT" style="flex:1;text-transform:uppercase"><button class="btn solid" id="linkgo">Liên kết</button></div>`}
    <h4>Giao diện ứng dụng</h4><div class="themes">${swatches(cfg.theme)}</div>
    <h4>Hình nền ứng dụng</h4>
    <div class="r bgr"><div class="bgprev" id="bgprev" style="${cfg.bg && bgUrl ? `background-image:url('${bgUrl}')` : ""}">${cfg.bg ? "" : "Chưa có"}</div>
      <div class="bgbtns"><button class="btn solid" id="bgpick">Chọn ảnh từ máy</button>${cfg.bg ? `<button class="btn" id="bgdel">Xóa ảnh</button>` : ""}</div></div>
    <input type="file" id="bgf" accept="image/*" hidden>
    ${cfg.bg ? `<div class="r"><label>Làm mờ ảnh</label><select id="bgb"><option value="0">Không</option><option value="1">Nhẹ</option><option value="2">Mạnh</option></select></div>
    <div class="r"><label>Độ phủ nền: <span id="bgdv">${Math.round(bgAlpha() * 100)}%</span></label><input id="bgd" type="range" min="50" max="96" value="${Math.round(bgAlpha() * 100)}"></div>
    <div class="chips"><button class="chip ${cfg.bg.dim == null ? "on" : ""}" id="bgauto">Độ phủ tự động</button></div>` : ""}
    <p class="muted">Ảnh được tự cắt vừa màn hình, làm mờ và phủ màu giao diện để chữ và bìa truyện luôn rõ, dù chọn ảnh nào.</p>
    <h4>Giao diện khi đọc truyện</h4><div class="themes">${swatches(cfg.rtheme === "app" ? "" : cfg.rtheme, "data-rth")}</div>
    <div class="chips"><button class="chip ${cfg.rtheme === "app" ? "on" : ""}" id="rtApp">Theo giao diện ứng dụng</button></div>
    <h4>Chữ khi đọc</h4>
    <div class="r"><label>Chế độ đọc</label><select id="md"><option value="scroll">Cuộn dọc</option><option value="page">Vuốt ngang (lật trang)</option></select></div>
    <div class="r"><label>Cỡ chữ: <span id="sv">${cfg.size}</span>px</label><input id="sz" type="range" min="14" max="30" value="${cfg.size}"></div>
    <div class="r"><label>Giãn dòng: <span id="lv">${cfg.lh}</span></label><input id="lh" type="range" min="1.4" max="2.4" step="0.1" value="${cfg.lh}"></div>
    <div class="r"><label>Font</label><select id="fn">${fontOpts()}</select></div>
    <h4>Sách nói</h4>
    <div class="r"><label>Tốc độ mặc định: <span id="rv">${fmtRate(cfg.rate)}</span></label><input id="rt" type="range" min="0.1" max="2" step="0.01" value="${cfg.rate}"></div>
    ${native ? `<div class="r"><button class="btn" id="ttsset">Cài đặt giọng nói của máy</button></div>` : ""}
    <h4>Máy chủ</h4>
    <div class="r"><input id="bs" style="flex:1" value="${esc(cfg.base)}"></div>
    <div class="r"><button class="btn" id="bsok">Lưu địa chỉ</button><button class="btn" id="bsrs">Mặc định</button></div>
    <h4>Dữ liệu</h4>
    <div class="r"><button class="btn danger" id="clr">Xóa toàn bộ truyện đã tải</button></div>
    <div class="r"><button class="btn danger" id="clrst">Xóa thống kê</button></div>
    <h4>Ứng dụng</h4>
    <div class="r"><label>Phiên bản: <b>${esc(APP_VER || "web")}</b></label>${native ? `<button class="btn" id="chkupd">Kiểm tra cập nhật</button>` : ""}</div>
    <p class="empty">B-novel Reader</p></div>`;
  $("#fn").value = cfg.font; $("#md").value = cfg.mode;
  $("#bgpick").onclick = () => $("#bgf").click();
  $("#bgf").onchange = async e => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    toast("Đang xử lý ảnh...");
    try { await bgSet(f); renderSettings(); toast("Đã đặt hình nền"); } catch { toast("Không đọc được ảnh này"); }
  };
  if ($("#bgdel")) $("#bgdel").onclick = async () => { await bgClear(); renderSettings(); };
  if ($("#bgb")) {
    $("#bgb").value = String(cfg.bg.blur || 0);
    $("#bgb").onchange = async e => { cfg.bg.blur = +e.target.value; saveCfg(); await applyBg(); renderSettings(); };
    let bgT;
    $("#bgd").oninput = e => { cfg.bg.dim = +e.target.value / 100; $("#bgdv").textContent = e.target.value + "%"; clearTimeout(bgT); bgT = setTimeout(() => { saveCfg(); applyBg(); }, 60); };
    $("#bgd").onchange = () => renderSettings();
    $("#bgauto").onclick = () => { cfg.bg.dim = null; saveCfg(); applyBg(); renderSettings(); };
  }
  $$("[data-th]", view).forEach(b => b.onclick = () => { cfg.theme = b.dataset.th; saveCfg(); applyTheme(); renderSettings(); });
  $$("[data-rth]", view).forEach(b => b.onclick = () => { cfg.rtheme = b.dataset.rth; saveCfg(); renderSettings(); });
  $("#rtApp").onclick = () => { cfg.rtheme = "app"; saveCfg(); renderSettings(); };
  $("#sz").oninput = e => { cfg.size = +e.target.value; $("#sv").textContent = cfg.size; saveCfg(); applyTheme(); };
  $("#lh").oninput = e => { cfg.lh = +e.target.value; $("#lv").textContent = cfg.lh; saveCfg(); applyTheme(); };
  $("#fn").onchange = e => { cfg.font = e.target.value; saveCfg(); applyTheme(); };
  $("#md").onchange = e => { cfg.mode = e.target.value; saveCfg(); };
  $("#rt").oninput = e => { cfg.rate = clampRate(e.target.value); $("#rv").textContent = fmtRate(cfg.rate); saveCfg(); };
  if ($("#ttsset")) $("#ttsset").onclick = () => AndroidTTS.openSettings();
  if ($("#syncnow")) $("#syncnow").onclick = () => sync(true);
  if ($("#chkupd")) $("#chkupd").onclick = () => checkUpdate(true);
  if ($("#unlink")) $("#unlink").onclick = () => { if (!confirm("Hủy liên kết tài khoản? Dữ liệu trên máy vẫn được giữ.")) return; acct = null; ls.set("acct", null); renderSettings(); };
  if ($("#linkgo")) $("#linkgo").onclick = async () => {
    const code = $("#lc").value.trim(); if (!code) return;
    try {
      const r = await api("/api/link-redeem", "POST", { code });
      acct = { token: r.token, user: r.user }; ls.set("acct", acct); toast("Đã liên kết với " + r.user.name); renderSettings(); sync(true);
    } catch (e) { toast(e.message); }
  };
  $("#bsok").onclick = () => { cfg.base = $("#bs").value.trim().replace(/\/+$/, "") || BASE0; saveCfg(); storiesCache = null; toast("Đã lưu"); };
  $("#bsrs").onclick = () => { cfg.base = BASE0; saveCfg(); storiesCache = null; renderSettings(); };
  $("#clr").onclick = async () => { if (!confirm("Xóa toàn bộ truyện đã tải (chữ và ảnh)?")) return; for (const id of Object.keys(dl)) await deleteDl(id); toast("Đã xóa"); };
  $("#clrst").onclick = () => { if (!confirm("Xóa toàn bộ thống kê?")) return; stats = {}; days = {}; ls.set("stats", stats); ls.set("days", days); toast("Đã xóa"); };
}

// ---------- Chi tiết truyện ----------
const jobs = {};
const nativeDl = native && window.AndroidDl ? window.AndroidDl : null;
const dlRedraw = {};   // id -> hàm vẽ lại trang truyện đang mở
// Gộp tiến độ do service tải nền ghi (file trên máy) vào dl[id]
function dlMerge(id) {
  if (!nativeDl) return null;
  let s; try { s = JSON.parse(nativeDl.snapshot(+id)); } catch { return null; }
  const d = dl[id];
  if (d && s) {
    const have = new Set(d.have); (s.have || []).forEach(p => have.add(p)); d.have = [...have];
    const im = new Set(d.imgs || []); (s.imgs || []).forEach(n => { im.add(n); imgHave.add(n); }); d.imgs = [...im];
    ls.set("dl", dl); saveImgs();
  }
  return s;
}
window.__dl = id => {
  const s = dlMerge(id); if (!s) return;
  if (s.state === "run" || s.state === "queued") jobs[id] = Object.assign(jobs[id] || { native: true }, { done: s.done, total: s.total });
  else if (jobs[id] && jobs[id].native) {
    delete jobs[id];
    if (s.state === "done") toast(s.failed ? `Tải xong, ${s.failed} chương lỗi (bấm tải lại để thử lại)` : "Đã tải xong (chữ + ảnh)");
    else if (s.state === "cancel") toast("Đã dừng tải");
    else if (s.state === "error") toast("Tải bị gián đoạn, thử lại sau");
    if (tab === "lib" && !stack.length) renderLib();
  }
  if (dlRedraw[id]) dlRedraw[id]();
};
async function openStory(id) {
  const el = push(h(`<div><div class="bar"><button class="bk" aria-label="Quay lại">${ICON.back}</button><b>Truyện</b></div><div class="body"><p class="load">Đang tải...</p></div></div>`));
  $(".bk", el).onclick = pop;
  const body = $(".body", el);
  let s, toc;
  try { [s, toc] = await Promise.all([api("/api/story?id=" + id).then(r => r.story), getToc(id)]); }
  catch (e) { if (dl[id]) { s = dl[id].story; toc = dl[id].chapters; } else { body.innerHTML = `<p class="err">${esc(e.message)}</p>`; return; } }
  let desc = true, asc = true;
  if (nativeDl) { const sn = dlMerge(id); if (sn && (sn.state === "run" || sn.state === "queued")) jobs[id] = { native: true, done: sn.done, total: sn.total }; }
  const draw = () => {
    const d = dl[id], have = new Set(d ? d.have : []), hs = hist[id], isFav = fav.some(f => f.id === id), job = jobs[id];
    const list = asc ? toc : [...toc].reverse();
    body.innerHTML = `<div class="hero" style="--cv:url('${esc(img(s.cover, 400))}')"><div class="dhead"><img src="${esc(img(s.cover, 400))}" alt=""><div><h2>${esc(s.title)}</h2>
      ${(s.authors || []).length ? `<p>Tác giả: ${esc(s.authors.join(", "))}</p>` : ""}
      ${(s.illustrators || []).length ? `<p>Họa sĩ: ${esc(s.illustrators.join(", "))}</p>` : ""}
      ${s.series ? `<p>Series: ${esc(s.series)}</p>` : ""}<p>${esc(s.status || "")} · ${toc.length} chương</p></div></div></div>
      <div class="acts"><button class="btn solid" id="read">${hs ? "▶ Đọc tiếp" : "▶ Đọc"}</button>
      <button class="btn" id="fv">${isFav ? "♥ Đang theo dõi" : "♡ Theo dõi"}</button>
      <button class="btn" id="dlb">${job ? "⏹ Đang tải " + (job.native ? job.done + "/" + job.total : (d ? d.have.length : 0) + "/" + toc.length) : d && d.have.length >= toc.length ? "✓ Đã tải" : "⬇ Tải xuống"}</button>
      ${s.series ? `<button class="btn" id="ser">Cùng series</button>` : ""}</div>
      <div class="chips" style="margin-bottom:10px">${(s.genres || []).map(g => `<button class="chip" data-g="${esc(g)}">${esc(g)}</button>`).join("")}</div>
      <div class="desc ${desc ? "cl" : ""}" id="ds">${esc(s.description || "")}</div>
      <button class="btn" id="mr" style="margin:8px 0">${desc ? "Xem thêm" : "Thu gọn"}</button>
      <div class="sec" style="display:flex;justify-content:space-between"><span>Danh sách chương (${toc.length})</span><button id="so">${asc ? "↓ Cũ nhất" : "↑ Mới nhất"}</button></div>
      ${list.map(c => `<div class="ch ${hs && hs.pos === c.position ? "cur" : ""}" data-pos="${c.position}"><span>${esc(c.title)}</span>${have.has(c.position) ? "<i>✓</i>" : ""}</div>`).join("")}`;
    $("#read", body).onclick = () => { const i = hs ? Math.max(0, toc.findIndex(c => c.position === hs.pos)) : 0; openReader(s, toc, i, hs ? hs.p : 0); };
    $("#fv", body).onclick = () => {
      fav = isFav ? fav.filter(f => f.id !== id) : [{ id, title: s.title, cover: s.cover, chapters: toc.length }, ...fav]; ls.set("fav", fav);
      pushOp(isFav ? "DELETE" : "PUT", "/api/follow?story=" + id, isFav ? null : {}); draw();
    };
    $("#dlb", body).onclick = () => startDownload(s, toc, draw);
    $("#mr", body).onclick = () => { desc = !desc; draw(); };
    $("#so", body).onclick = () => { asc = !asc; draw(); };
    if ($("#ser", body)) $("#ser", body).onclick = () => openList(s.series, "/api/stories?series=" + encodeURIComponent(s.series));
    $$(".chip", body).forEach(b => b.onclick = () => openList(b.dataset.g, "/api/stories?genre=" + encodeURIComponent(b.dataset.g)));
    $$(".ch", body).forEach(c => c.onclick = () => { const i = toc.findIndex(x => x.position === +c.dataset.pos); openReader(s, toc, i, 0); });
  };
  el.onclose = () => { if (dlRedraw[id] === draw) delete dlRedraw[id]; if (tab === "lib") renderLib(); };
  dlRedraw[id] = draw;
  draw();
}
// Tải offline: toàn bộ chữ + ảnh (ảnh lưu vào bộ nhớ máy)
async function startDownload(s, toc, redraw) {
  const id = s.id;
  if (jobs[id]) { if (jobs[id].native) nativeDl.cancel(+id); else jobs[id].cancel = true; return; }
  if (nativeDl) return startNativeDl(s, toc, redraw);
  const d = dl[id] || (dl[id] = { story: { id, title: s.title, cover: s.cover, description: s.description, authors: s.authors, illustrators: s.illustrators, genres: s.genres, status: s.status, series: s.series }, chapters: [], have: [], imgs: [] });
  d.chapters = toc.map(c => ({ position: c.position, title: c.title })); d.imgs = d.imgs || [];
  const todo = toc.filter(c => !d.have.includes(c.position));
  if (!todo.length) { toast("Đã tải đủ rồi"); return; }
  const job = jobs[id] = { cancel: false }; redraw();
  const cv = await cacheImg(s.cover, 400); if (cv && !d.imgs.includes(cv)) d.imgs.push(cv);
  let failed = 0;
  const worker = async () => {
    while (todo.length && !job.cancel) {
      const c = todo.shift();
      try {
        const ch = (await api(`/api/chapter?story=${id}&pos=${c.position}`)).chapter;
        for (const u of imgsOf(ch.content)) { const n = await cacheImg(u, 1400); if (n && !d.imgs.includes(n)) d.imgs.push(n); }
        await chPut(id + ":" + c.position, ch); d.have.push(c.position);
        if (d.have.length % 4 === 0) { ls.set("dl", dl); saveImgs(); redraw(); }
      } catch { failed++; if (failed > 5) job.cancel = true; }
    }
  };
  await Promise.all([worker(), worker(), worker()]);
  ls.set("dl", dl); saveImgs(); delete jobs[id]; redraw();
  toast(failed > 5 ? "Tải bị gián đoạn, thử lại sau" : job.cancel ? "Đã dừng tải" : "Đã tải xong (chữ + ảnh)");
}
// Chọn khoảng chương cần tải (theo số thứ tự trong danh sách chương)
function askRange(toc, have) {
  return new Promise(res => {
    const idxs = toc.map((c, i) => i).filter(i => !have.has(toc[i].position));
    const sh = openSheet(`<h3>Tải xuống</h3>
      <p class="muted">Truyện có ${toc.length} chương, còn ${idxs.length} chương chưa tải. Chọn khoảng chương cần tải:</p>
      <div class="stp"><label>Từ chương số</label><input id="dlf" type="number" inputmode="numeric" min="1" max="${toc.length}" value="${idxs[0] + 1}" style="width:96px"></div>
      <div class="stp"><label>Đến chương số</label><input id="dlt" type="number" inputmode="numeric" min="1" max="${toc.length}" value="${idxs[idxs.length - 1] + 1}" style="width:96px"></div>
      <p class="muted" id="dli"></p>
      <div style="display:flex;gap:10px;margin-top:14px"><button class="btn solid" id="dlgo" style="flex:1">⬇ Tải khoảng này</button><button class="btn" id="dlall" style="flex:1">Tất cả chưa tải</button></div>`);
    const f = $("#dlf", sh), t = $("#dlt", sh), info = $("#dli", sh);
    const val = () => {
      let a = Math.round(+f.value), b = Math.round(+t.value);
      if (!(a >= 1 && b >= 1)) return null;
      a = Math.min(a, toc.length); b = Math.min(b, toc.length);
      return a <= b ? [a, b] : [b, a];
    };
    const upd = () => { const r = val(); info.textContent = r ? `Từ “${toc[r[0] - 1].title}” đến “${toc[r[1] - 1].title}”` : ""; };
    f.oninput = t.oninput = upd; upd();
    $("#dlgo", sh).onclick = () => { const r = val(); if (!r) { toast("Nhập số chương hợp lệ"); return; } closeSheet(); res(r); };
    $("#dlall", sh).onclick = () => { closeSheet(); res([1, toc.length]); };
  });
}
// Tải nền bằng service Android: tắt app / khóa máy vẫn tải tiếp, có thông báo tiến độ
async function startNativeDl(s, toc, redraw) {
  const id = s.id;
  dlMerge(id);
  const have = new Set(dl[id] ? dl[id].have : []);
  if (toc.every(c => have.has(c.position))) { toast("Đã tải đủ rồi"); return; }
  const r = await askRange(toc, have);
  const pos = toc.slice(r[0] - 1, r[1]).filter(c => !have.has(c.position)).map(c => c.position);
  if (!pos.length) { toast("Các chương này đã tải rồi"); return; }
  const d = dl[id] || (dl[id] = { story: { id, title: s.title, cover: s.cover, description: s.description, authors: s.authors, illustrators: s.illustrators, genres: s.genres, status: s.status, series: s.series }, chapters: [], have: [], imgs: [] });
  d.chapters = toc.map(c => ({ position: c.position, title: c.title })); d.imgs = d.imgs || [];
  ls.set("dl", dl);
  try { native.requestNotificationPermission(); } catch {}
  let ok = false;
  try { ok = nativeDl.start(JSON.stringify({ id, base: cfg.base, title: s.title, cover: s.cover || "", pos })); } catch {}
  if (!ok) { toast("Không bắt đầu được tiến trình tải"); if (!d.have.length) { delete dl[id]; ls.set("dl", dl); } return; }
  jobs[id] = { native: true, done: 0, total: pos.length };
  dlRedraw[id] = redraw; redraw();
  toast("Đang tải nền: có thể thoát app, tiến độ hiện ở thanh thông báo");
}
async function resume(id) {
  const hs = hist[id]; if (!hs) return openStory(id);
  try {
    const toc = await getToc(id);
    const st = dl[id] ? dl[id].story : { id, title: hs.title, cover: hs.cover };
    openReader(st, toc, Math.max(0, toc.findIndex(c => c.position === hs.pos)), hs.p);
  } catch (e) { toast(e.message); }
}

// ---------- Trình đọc + sách nói ----------
function openReader(story, toc, startIdx, startP) {
  if (bg) closeBg();
  const el = push(h(`<div class="rd hide" data-theme="${rKey()}">
    <div class="rtop bar"><button class="bk" aria-label="Quay lại">${ICON.back}</button><b class="rt"></b></div>
    <div class="rscroll"></div><div class="pgnum" hidden><span class="pgl"></span><span class="pgr"></span></div><div class="rhead"></div>
    <div class="rdim"></div>
    <div class="tts" hidden>
      <div class="grab" aria-label="Kéo xuống để thu gọn"></div>
      <div class="tr tmain"><button id="tpc" aria-label="Chương trước">${ICON.skipPrev}</button><button id="tp" aria-label="Câu trước">${ICON.rew}</button><button id="tpl" class="pl" aria-label="Phát/Dừng">${ICON.play}</button><button id="tn" aria-label="Câu sau">${ICON.fwd}</button><button id="tnc" aria-label="Chương sau">${ICON.skipNext}</button></div>
      <div class="tr topt">
        <label class="tsel" aria-label="Hẹn giờ tắt">${ICON.timer}<span id="tsl">Hẹn giờ</span><select id="ts"><option value="0">Tắt hẹn giờ</option><option value="15">15 phút</option><option value="30">30 phút</option><option value="60">60 phút</option><option value="90">90 phút</option></select></label>
        <button id="tspd" class="spd" aria-label="Tốc độ">1,00x</button>
        <button id="tx" aria-label="Tắt sách nói">${ICON.power}</button>
        <button id="tvc" aria-label="Giọng đọc">${ICON.voice}</button>
        <button id="tset" aria-label="Cài đặt đọc">${ICON.gear}</button>
      </div>
      <div class="tts-more" hidden>
        <div class="tr tr3"><small>Tốc độ</small><button id="trm" aria-label="Giảm 0,01">−</button><input id="tr" type="range" min="0.1" max="2" step="0.01"><button id="trp" aria-label="Tăng 0,01">+</button><b id="trv"></b></div>
        <div class="tr tr2"><select id="tv"></select></div>
      </div>
    </div>
    <div class="tinfo"><small id="tcnt"></small><small id="tst"></small><small id="tpg"></small></div>
    <div class="rbot">
      <div class="rinfo"><span id="rpct">0,0%</span><span id="rpch"></span></div>
      <div class="rsl"><button id="bp">Trước</button><input id="rsl" type="range" min="0" max="1" step="1" value="0"><button id="bn">Tiếp</button></div>
      <div class="rbtns"><button id="bt" aria-label="Mục lục">${ICON.list}</button><button id="bm" aria-label="Chế độ đọc"></button><button id="bh" aria-label="Nghe">${ICON.phones}</button><button id="ba" aria-label="Cài đặt đọc">${ICON.gear}</button></div>
    </div>
  </div>`));
  const scroll = $(".rscroll", el), ttsEl = $(".tts", el), pgnum = $(".pgnum", el), pgl = $(".pgl", el), pgr = $(".pgr", el), rhead = $(".rhead", el);
  let text = null, hclip = null, hcols = null, W = 300, H = 400, page = 0, pages = 1, curCh = null;
  let idx = startIdx, tok = 0, saveT, lastAct = Date.now(), swipedAt = 0, anim = 0;
  const curTitle = () => toc[idx] ? toc[idx].title : "";
  const sl = $("#rsl", el), rpct = $("#rpct", el), rpch = $("#rpch", el), rbot = $(".rbot", el);
  let sliding = false;
  const fmtPct = v => v.toFixed(1).replace(".", ",") + "%";
  const setRbh = () => { el.style.setProperty("--rbh", (rbot.offsetHeight || 120) + "px"); el.style.setProperty("--ih", ($(".tinfo", el).offsetHeight || 28) + "px"); };
  const applyRead = () => {            // độ sáng + màu chữ riêng của trang đọc
    $(".rdim", el).style.opacity = cfg.dim || 0;
    if (cfg.rfg) el.style.setProperty("--rfg", cfg.rfg); else el.style.removeProperty("--rfg");
  };
  sl.max = Math.max(1, toc.length - 1); sl.disabled = toc.length < 2;
  function chapFrac() {
    if (!curCh) return 0;
    if (isPage()) return pages > 1 ? page / (pages - 1) : 1;
    const m = scroll.scrollHeight - scroll.clientHeight; return m > 0 ? Math.min(1, Math.max(0, scroll.scrollTop / m)) : 1;
  }
  function updProg() {
    const pct = fmtPct(Math.min(100, (idx + chapFrac()) / Math.max(1, toc.length) * 100));
    rpct.textContent = pct;
    if (!sliding) { rpch.textContent = curTitle(); sl.value = idx; }
    $("#tpg", el).textContent = `${idx + 1}/${toc.length}  ${pct}`;
  }
  const isPage = () => cfg.mode === "page";
  const rIcon = () => isPage() ? ICON.pageH : ICON.scrollV;
  const show = () => el.classList.toggle("hide");
  const modeLabel = () => { $("#bm", el).innerHTML = rIcon(); };
  modeLabel();
  $(".rt", el).textContent = story.title;

  // ---- vị trí đang đọc ----
  const firstVisible = () => {
    const top = scroll.getBoundingClientRect().top + 40;
    for (const p of $$("[data-p]", text || scroll)) if (p.getBoundingClientRect().bottom > top) return +p.dataset.p;
    return 0;
  };
  const anchorH = () => {
    if (!hclip) return 0;
    const cr = hclip.getBoundingClientRect();
    for (const p of $$("[data-p]", hcols)) if ([...p.getClientRects()].some(r => r.right > cr.left + 2 && r.left < cr.right - 2)) return +p.dataset.p;
    return 0;
  };
  const currentP = () => (isPage() ? anchorH() : firstVisible());
  const saveHist = p => {
    const c = toc[idx]; if (!c) return;
    hist[story.id] = { id: story.id, title: story.title, cover: story.cover, pos: c.position, ct: c.title, p: p == null ? currentP() : p, t: Date.now() };
    ls.set("hist", hist);
  };
  scroll.addEventListener("scroll", () => { if (isPage()) return; updProg(); clearTimeout(saveT); saveT = setTimeout(() => saveHist(), 400); }, { passive: true });

  // ---- lật trang ngang ----
  function pageOf(elm) {
    const r = elm.getClientRects()[0]; if (!r || !hclip) return 0;
    const cr = hclip.getBoundingClientRect();
    return Math.floor((r.left - cr.left + hclip.scrollLeft) / W + 0.001);
  }
  // cuộn mượt tới vị trí x (ease-out)
  function animTo(x, ms = 280) {
    cancelAnimationFrame(anim);
    if (!hclip) return;
    const from = hclip.scrollLeft, d = x - from, t0 = performance.now();
    if (!d) return;
    const step = t => {
      if (!hclip) return;
      const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3);
      hclip.scrollLeft = k < 1 ? from + d * e : x;
      if (k < 1) anim = requestAnimationFrame(step);
    };
    anim = requestAnimationFrame(step);
  }
  function hGo(n, animate) {
    page = Math.max(0, Math.min(pages - 1, n));
    if (animate) animTo(page * W); else { cancelAnimationFrame(anim); hclip.scrollLeft = page * W; }
    pgl.textContent = `${page + 1}/${pages}`;
    pgr.textContent = `${idx + 1}/${toc.length}  ${(page / pages * 100).toFixed(1).replace(".", ",")}%`;
    rhead.textContent = curTitle(); updProg();
    clearTimeout(saveT); saveT = setTimeout(() => saveHist(), 400);
  }
  function layoutH(p, atEnd) {
    W = Math.max(200, Math.min(scroll.clientWidth - 32, 720)); H = Math.max(200, scroll.clientHeight - 72);
    hclip.style.cssText = `width:${W}px;height:${H}px;margin:34px auto 0`;
    hcols.style.cssText = `height:${H}px;column-width:${W}px;column-gap:0;--hh:${H}px`;
    pages = Math.max(1, Math.round(hclip.scrollWidth / W));
    let n = 0;
    if (atEnd) n = pages - 1;
    else if (p) { const t = $(`[data-p="${p}"]`, hcols); if (t) n = pageOf(t); }
    pgnum.hidden = false; hGo(n);
  }
  const hNext = () => { if (page < pages - 1) hGo(page + 1, true); else if (idx < toc.length - 1) goTo(idx + 1); else { toast("Hết truyện"); animTo(page * W, 200); } };
  const hPrev = () => { if (page > 0) hGo(page - 1, true); else if (idx > 0) goTo(idx - 1, { end: true }); else animTo(page * W, 200); };

  scroll.addEventListener("click", e => {
    if (e.target.closest("button") || Date.now() - swipedAt < 350) return;
    if (isPage()) { const x = e.clientX / window.innerWidth; if (x < 0.3) hPrev(); else if (x > 0.7) hNext(); else show(); }
    else show();
  });
  let drag = null;
  scroll.addEventListener("touchstart", e => {
    if (!isPage() || !hclip || e.touches.length !== 1) { drag = null; return; }
    cancelAnimationFrame(anim);
    const t = e.touches[0];
    drag = { x: t.clientX, y: t.clientY, base: hclip.scrollLeft, mode: 0, lx: t.clientX, lt: Date.now(), v: 0 };
  }, { passive: true });
  scroll.addEventListener("touchmove", e => {
    if (!drag || !hclip) return;
    const t = e.touches[0], dx = t.clientX - drag.x, dy = t.clientY - drag.y;
    if (!drag.mode) { if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return; drag.mode = Math.abs(dx) > Math.abs(dy) ? 1 : 2; }
    if (drag.mode !== 1) return;
    const now = Date.now();
    if (now > drag.lt) drag.v = (t.clientX - drag.lx) / (now - drag.lt);
    drag.lx = t.clientX; drag.lt = now;
    hclip.scrollLeft = drag.base - dx;
  }, { passive: true });
  const endDrag = (e, cancel) => {
    const d = drag; drag = null;
    if (!d || d.mode !== 1 || !hclip) return;
    swipedAt = Date.now();
    const dx = e.changedTouches[0].clientX - d.x;
    const fast = Math.abs(d.v) > 0.45 && Math.sign(d.v) === Math.sign(dx);
    if (!cancel && (Math.abs(dx) > W * 0.2 || fast)) { dx < 0 ? hNext() : hPrev(); }
    else animTo(page * W, 200);
  };
  scroll.addEventListener("touchend", e => endDrag(e, false), { passive: true });
  scroll.addEventListener("touchcancel", e => endDrag(e, true), { passive: true });
  ["touchstart", "click", "scroll"].forEach(ev => el.addEventListener(ev, () => { lastAct = Date.now(); }, { capture: true, passive: true }));

  // ---- vẽ chương ----
  function paint(ch, p, atEnd) {
    curCh = ch;
    const paras = renderContent(ch.content), title = esc(ch.title || curTitle());
    if (isPage()) {
      scroll.className = "rscroll hm";
      scroll.innerHTML = `<div class="hclip fi"><div class="hcols"><h2 class="rch">${title}</h2>${paras}</div></div>`;
      hclip = $(".hclip", scroll); hcols = $(".hcols", scroll); text = hcols;
      layoutH(p, atEnd);
      $$("img", hcols).forEach(i => i.addEventListener("load", () => relayout(true), { once: true }));
    } else {
      scroll.className = "rscroll"; hclip = hcols = null; pgnum.hidden = true;
      scroll.innerHTML = `<div class="rbody"><h2 class="rch">${title}</h2><div class="rtext">${paras}</div><div class="rend">${idx < toc.length - 1 ? `<button class="btn solid" id="en">Chương sau →</button>` : `<p class="empty">Hết truyện</p>`}</div></div>`;
      text = $(".rtext", scroll); scroll.scrollTop = 0;
      if (p) { const t = $(`[data-p="${p}"]`, text); if (t) t.scrollIntoView({ block: "start" }); }
      if ($("#en", el)) $("#en", el).onclick = () => goTo(idx + 1);
      updProg();
    }
    try { tts.rewrap(); } catch {}
  }
  function relayout(keepPage) {
    if (!curCh || !text) return;
    if (isPage() && keepPage && hclip) { const p = anchorH(); const pc = page; layoutH(p); if (!p) hGo(pc); }
    else paint(curCh, currentP());
  }
  let rsT; const onResize = () => { clearTimeout(rsT); rsT = setTimeout(() => { setRbh(); relayout(); }, 200); };
  window.__fontsDone = () => relayout(true);
  window.addEventListener("resize", onResize);

  async function load(i, p = 0, atEnd = false) {
    const my = ++tok; idx = i; curCh = null; text = null; updProg();
    const c = toc[i]; $(".rt", el).textContent = story.title + " · " + c.title;
    scroll.className = "rscroll"; pgnum.hidden = true;
    scroll.innerHTML = `<div class="rbody"><p class="load">Đang tải...</p></div>`;
    let ch;
    try { ch = await getChapter(story.id, c.position); }
    catch (e) { if (my === tok) { scroll.innerHTML = `<div class="rbody"><p class="err">${esc(e.message)}<br><button class="btn" id="rtry">Thử lại</button></p></div>`; $("#rtry", el).onclick = () => load(i, p, atEnd); } return false; }
    if (my !== tok) return false;
    paint(ch, p, atEnd);
    saveHist(p); pushHist(story.id, c.position); updateMini();
    if (i + 1 < toc.length) getChapter(story.id, toc[i + 1].position).catch(() => {});
    return true;
  }
  async function goTo(i, o = {}) {
    if (i < 0 || i >= toc.length) return false;
    const was = o.play || tts.playing;
    tts.halt(was);
    const ok = await load(i, 0, !!o.end);
    if (ok && was) tts.start(0); else if (!ok) tts.ui();
    return ok;
  }
  sl.addEventListener("input", () => { sliding = true; const c = toc[+sl.value]; rpch.textContent = c ? c.title : ""; });
  sl.addEventListener("change", () => { sliding = false; const i = +sl.value; if (i !== idx) goTo(i); else updProg(); });
  $("#bp", el).onclick = () => goTo(idx - 1);
  $("#bn", el).onclick = () => goTo(idx + 1);
  $("#bt", el).onclick = () => {
    const s = openSheet(`<h3>Danh sách chương</h3>${toc.map((c, i) => `<div class="ch ${i === idx ? "cur" : ""}" data-i="${i}"><span>${esc(c.title)}</span>${dl[story.id] && dl[story.id].have.includes(c.position) ? "<i>✓</i>" : ""}</div>`).join("")}`);
    sheetEl.dataset.theme = el.dataset.theme;
    $$(".ch", s).forEach(c => c.onclick = () => { closeSheet(); goTo(+c.dataset.i); });
    const cur = $(".cur", s); if (cur) cur.scrollIntoView({ block: "center" });
  };
  let lastP = 0;
  $("#bm", el).onclick = () => {
    lastP = currentP();                       // vị trí theo chế độ cũ
    cfg.mode = isPage() ? "scroll" : "page"; saveCfg(); modeLabel();
    if (curCh) paint(curCh, lastP);
    toast(isPage() ? "Vuốt ngang: chạm mép trái/phải hoặc vuốt để lật trang" : "Chế độ cuộn dọc");
  };
  $("#ba", el).onclick = () => {
    const FG = [["", "Mặc định"], ["#ffffff", "Trắng"], ["#000000", "Đen"], ["#e9d8a6", "Vàng nhạt"], ["#b8b8b8", "Xám"]];
    const s = openSheet(`<h3>Cài đặt đọc</h3>
      <div class="stp bri"><label>Độ sáng</label><input id="bri" type="range" min="30" max="100" step="1" value="${Math.round((1 - (cfg.dim || 0)) * 100)}"></div>
      <div class="themes">${swatches(cfg.rtheme === "app" ? "" : cfg.rtheme, "data-rth")}</div>
      <div class="chips"><button class="chip ${cfg.rtheme === "app" ? "on" : ""}" id="rtapp">Theo giao diện ứng dụng</button></div>
      <div class="stp"><label>Màu chữ</label></div>
      <div class="chips" id="fgc">${FG.map(([v, n]) => `<button class="chip ${(cfg.rfg || "") === v ? "on" : ""}" data-fg="${v}">${n}</button>`).join("")}</div>
      <div class="stp"><label>Chế độ</label><select id="md"><option value="scroll">Cuộn dọc</option><option value="page">Vuốt ngang</option></select></div>
      <div class="stp"><label>Cỡ chữ</label><button id="s1">−</button><b id="sv">${cfg.size}</b><button id="s2">+</button></div>
      <div class="stp"><label>Giãn dòng</label><button id="l1">−</button><b id="lv">${cfg.lh}</b><button id="l2">+</button></div>
      <div class="stp"><label>Font</label><select id="fn">${fontOpts()}</select></div>`);
    $("#bri", s).oninput = e => { cfg.dim = +(1 - e.target.value / 100).toFixed(2); applyRead(); };
    $("#bri", s).onchange = () => saveCfg();
    $$("[data-fg]", s).forEach(b => b.onclick = () => { cfg.rfg = b.dataset.fg; saveCfg(); applyRead(); $$("[data-fg]", s).forEach(x => x.classList.toggle("on", x === b)); });
    $("#fn", s).value = cfg.font; $("#md", s).value = cfg.mode;
    const upd = () => { saveCfg(); applyTheme(); $("#sv", s).textContent = cfg.size; $("#lv", s).textContent = cfg.lh; setTimeout(() => relayout(), 30); };
    $("#s1", s).onclick = () => { cfg.size = Math.max(14, cfg.size - 1); upd(); };
    $("#s2", s).onclick = () => { cfg.size = Math.min(30, cfg.size + 1); upd(); };
    $("#l1", s).onclick = () => { cfg.lh = Math.max(1.4, +(cfg.lh - 0.1).toFixed(1)); upd(); };
    $("#l2", s).onclick = () => { cfg.lh = Math.min(2.4, +(cfg.lh + 0.1).toFixed(1)); upd(); };
    $("#fn", s).onchange = e => { cfg.font = e.target.value; upd(); };
    $("#md", s).onchange = e => { lastP = currentP(); cfg.mode = e.target.value; saveCfg(); modeLabel(); if (curCh) paint(curCh, lastP); };
    sheetEl.dataset.theme = el.dataset.theme;
    const setRT = k => {
      cfg.rtheme = k; saveCfg(); el.dataset.theme = rKey(); if (sheetEl) sheetEl.dataset.theme = el.dataset.theme; applyBars();
      $$("[data-rth]", s).forEach(x => x.classList.toggle("on", x.dataset.rth === cfg.rtheme));
      $("#rtapp", s).classList.toggle("on", cfg.rtheme === "app");
    };
    $$("[data-rth]", s).forEach(b => b.onclick = () => setRT(b.dataset.rth));
    $("#rtapp", s).onclick = () => setRT("app");
  };

  // ---- kéo bảng nghe xuống/lên (kiểu vBook): kéo xuống để vừa nghe vừa đọc, kéo lên hoặc chạm thanh dưới để mở lại ----
  (() => {
    const tinfo = $(".tinfo", el); let d = null, moved = 0;
    const hiddenOff = () => el.classList.contains("hide") ? (parseFloat(el.style.getPropertyValue("--rbh")) || 0) : 0;
    const minOff = () => ttsEl.offsetHeight + (parseFloat(el.style.getPropertyValue("--ih")) || 28) + 4;
    const setMin = v => {
      cfg.ttsMin = v; saveCfg();
      ttsEl.style.transition = ""; ttsEl.classList.toggle("min", v); ttsEl.style.transform = "";
    };
    const start = e => {
      if (ttsEl.hidden || e.touches.length !== 1 || e.target.closest("input,select,.tsel,.tts-more")) { d = null; return; }
      const t = e.touches[0], isMin = ttsEl.classList.contains("min");
      d = { y: t.clientY, t0: Date.now(), min: isMin, lo: hiddenOff(), hi: hiddenOff() + minOff(), on: false };
      d.base = isMin ? d.hi : d.lo;
    };
    const move = e => {
      if (!d) return; const dy = e.touches[0].clientY - d.y;
      if (!d.on) { if (Math.abs(dy) < 8) return; d.on = true; ttsEl.style.transition = "none"; }
      e.preventDefault(); moved = Date.now();
      ttsEl.style.transform = `translateY(${Math.min(d.hi, Math.max(d.lo, d.base + dy))}px)`;
    };
    const end = e => {
      const x = d; d = null; if (!x) return;
      if (!x.on) { if (e.currentTarget === tinfo && e.type === "touchend") { moved = Date.now(); setMin(!x.min); } return; }
      const dy = e.changedTouches[0].clientY - x.y, fast = Math.abs(dy) / Math.max(1, Date.now() - x.t0) > 0.5;
      const pos = Math.min(x.hi, Math.max(x.lo, x.base + dy));
      setMin(fast ? dy > 0 : pos > (x.lo + x.hi) / 2);
    };
    [ttsEl, tinfo].forEach(n => {
      n.addEventListener("touchstart", start, { passive: true });
      n.addEventListener("touchmove", move, { passive: false });
      n.addEventListener("touchend", end); n.addEventListener("touchcancel", end);
      n.addEventListener("click", ev => { if (Date.now() - moved < 350) { ev.stopPropagation(); ev.preventDefault(); } }, true);
    });
    $(".grab", el).addEventListener("click", () => setMin(true));
  })();

  // ---- Sách nói ----
  const web = !native && "speechSynthesis" in window ? window.speechSynthesis : null;
  const tts = (() => {
    const pl = $("#tpl", el), vs = $("#tv", el), rs = $("#tr", el), ss = $("#ts", el), st = $("#tst", el);
    let chunks = [], pos = 0, gen = 0, sleepT = null, hl = -2, webVoices = [], since = 0, flushT = null;
    const wrapped = new Map();
    const cnt = () => { $("#tcnt", el).textContent = chunks.length ? `${pos + 1}/${chunks.length}` : ""; };
    const tlab = () => { $("#tsl", el).textContent = ss.value === "0" ? "Hẹn giờ" : ss.value + " phút"; };
    const T = { playing: false };
    const flush = () => { // cộng thời gian NGHE (tính theo đồng hồ, không phụ thuộc timer nền)
      if (!since) return; const now = Date.now(); addTime(story, 1, Math.min((now - since) / 1000, 120)); since = now;
    };
    const split = t => {
      const out = [], arr = t.match(/[^.!?…。！？]+[.!?…。！？"”’)\]]*\s*/g) || [t]; let cur = "";
      for (const x of arr) {
        if ((cur + x).length > 220 && cur) { out.push(cur.trim()); cur = ""; }
        cur += x;
        while (cur.length > 300) { let k = cur.lastIndexOf(",", 300); if (k < 100) k = cur.lastIndexOf(" ", 300); if (k < 1) k = 300; out.push(cur.slice(0, k + 1).trim()); cur = cur.slice(k + 1); }
      }
      if (cur.trim()) out.push(cur.trim());
      return out;
    };
    const build = () => {
      const l = []; const t = curTitle().trim(); if (t) l.push({ t, p: -1 });
      $$("p[data-p]", text).forEach(p => split(p.textContent.replace(/\s+/g, " ").trim()).forEach(x => { if (/[\p{L}\p{N}]/u.test(x)) l.push({ t: x, p: +p.dataset.p }); }));
      return l;
    };
    const unwrap = () => { wrapped.forEach((html, p) => { if (p.isConnected) p.innerHTML = html; }); wrapped.clear(); };
    const wrap = () => {        // bọc từng câu trong <span> để tô sáng đúng câu đang đọc
      unwrap(); if (!text) return;
      const byP = {};
      chunks.forEach((c, i) => { if (c.p >= 0) (byP[c.p] = byP[c.p] || []).push(i); });
      for (const k in byP) {
        const pe = $(`p[data-p="${k}"]`, text); if (!pe) continue;
        const src = pe.textContent.replace(/\s+/g, " ").trim(), orig = pe.innerHTML; let cur = 0, html = "", ok = true;
        for (const i of byP[k]) {
          const at = src.indexOf(chunks[i].t, cur);
          if (at < 0) { ok = false; break; }
          html += esc(src.slice(cur, at)) + `<span class="ts" data-c="${i}">${esc(chunks[i].t)}</span>`; cur = at + chunks[i].t.length;
        }
        if (!ok) continue;
        wrapped.set(pe, orig); pe.innerHTML = html + esc(src.slice(cur));
      }
    };
    const hi = i => {
      hl = i; $$(".tts-cur,.tts-on", text || scroll).forEach(e => e.classList.remove("tts-cur", "tts-on"));
      if (i < 0 || !chunks[i] || !text) return;
      let e = $(`.ts[data-c="${i}"]`, text);
      if (e) e.classList.add("tts-cur");
      else { e = chunks[i].p >= 0 && $(`p[data-p="${chunks[i].p}"]`, text); if (!e) return; e.classList.add("tts-on"); }
      if (isPage() && hclip) { const n = pageOf(e); if (n !== page) hGo(n); }
      else { const r = e.getBoundingClientRect(), s = scroll.getBoundingClientRect(), pb = (ttsEl.hidden ? 0 : ttsEl.classList.contains("min") ? 0 : ttsEl.offsetHeight) + 80; if (r.top < s.top + 70 || r.bottom > s.bottom - pb) e.scrollIntoView({ block: "center", behavior: "smooth" }); }
    };
    T.rewrap = () => { if (!chunks.length) return; wrap(); if (hl >= 0) hi(hl); };
    T.active = () => T.playing || !ttsEl.hidden;
    T.ui = () => { pl.innerHTML = T.playing ? ICON.pause : ICON.play; $("#bh", el).style.color = ttsEl.hidden ? "" : "var(--accent)"; cnt(); updateMini(); };
    const nativeVoices = () => { try { return JSON.parse(native.getVoices()); } catch { return []; } };
    const fillVoices = list => {
      vs.innerHTML = `<option value="">${native ? "Giọng Google mặc định (chị Google)" : "Giọng mặc định"}</option>` + list.map(v => `<option value="${esc(v.name)}">${esc(v.label)}</option>`).join("");
      if (list.some(v => v.name === cfg.voice)) vs.value = cfg.voice;
      if (native) native.setVoice(vs.value);
    };
    const loadWeb = () => {
      webVoices = web.getVoices().filter(v => /^vi/i.test(v.lang)).sort((a, b) => /google/i.test(b.name) - /google/i.test(a.name));
      fillVoices(webVoices.map(v => ({ name: v.name, label: v.name })));
      if (!cfg.voice && webVoices[0]) vs.value = webVoices[0].name;
    };
    const engineStart = from => {
      if (native) return native.speak(JSON.stringify(chunks.map(c => c.t)), from, cfg.rate, gen, story.title, curTitle(), imgFull(story.cover, 400));
      web.cancel(); const g = gen;
      const at = i => {
        if (g !== gen || !T.playing) return;
        if (i >= chunks.length) return T.finished();
        pos = i; hi(i); cnt(); flush();
        const u = new SpeechSynthesisUtterance(chunks[i].t); u.lang = "vi-VN"; u.rate = cfg.rate;
        const v = webVoices.find(x => x.name === vs.value); if (v) u.voice = v;
        u.onend = () => at(i + 1);
        u.onerror = ev => { if (ev.error === "canceled" || ev.error === "interrupted") return; if (g === gen) { T.halt(); T.ui(); st.textContent = "Lỗi đọc"; } };
        web.speak(u);
      };
      at(from);
    };
    // chỉ số câu đầu tiên đang hiện trên màn hình (để bấm nghe là đọc từ chỗ đang đọc, không về đầu chương)
    T.visibleIdx = () => {
      if (!text) return 0;
      if (!chunks.length) { chunks = build(); wrap(); }
      let first = -1;
      const spans = $$(".ts", text);
      if (isPage() && hclip) {
        const cr = hclip.getBoundingClientRect();
        for (const sp of spans) if ([...sp.getClientRects()].some(r => r.right > cr.left + 2 && r.left < cr.right - 2)) { first = +sp.dataset.c; break; }
      } else {
        const top = scroll.getBoundingClientRect().top + 40;
        for (const sp of spans) if (sp.getBoundingClientRect().bottom > top) { first = +sp.dataset.c; break; }
      }
      if (first < 0) { const cp = currentP(); first = chunks.findIndex(c => c.p >= cp && c.p >= 0); }
      if (first < 0) return 0;
      const atTop = isPage() ? page === 0 : scroll.scrollTop < 40;
      return atTop ? 0 : first;       // ở đầu chương thì đọc cả tên chương
    };
    T.start = from => {
      if (!text) return;
      flush(); if (!chunks.length) { chunks = build(); wrap(); }
      if (!chunks.length) { st.textContent = "Chương này chưa có nội dung"; return; }
      pos = Math.min(Math.max(0, from), chunks.length - 1); gen++; T.playing = true; since = Date.now(); st.textContent = ""; T.ui(); engineStart(pos);
      clearInterval(flushT); flushT = setInterval(flush, 15000);
    };
    T.pause = () => { flush(); since = 0; T.playing = false; gen++; if (native) native.pause(); else if (web) web.cancel(); T.ui(); };
    T.halt = silent => { flush(); since = 0; T.playing = false; gen++; unwrap(); chunks = []; if (!silent) { if (native) native.pause(); else if (web) web.cancel(); } hi(-1); hl = -2; };
    T.stopAll = () => {
      T.halt(true); if (native) native.stop(); else if (web) web.cancel(); clearTimeout(sleepT); sleepT = null; clearInterval(flushT); ss.value = "0"; tlab(); ttsEl.hidden = true; $(".tts-more", el).hidden = true; T.ui();
    };
    T.finished = async () => {
      hi(-1); hl = -2; flush();
      if (idx >= toc.length - 1) { T.pause(); st.textContent = "Đã hết truyện"; return; }
      st.textContent = "Đang chuyển chương..."; chunks = []; T.playing = false; gen++;
      const ok = await goTo(idx + 1, { play: true });
      if (!ok) { T.pause(); st.textContent = "Không tải được chương kế"; }
    };
    const paraStart = dir => {
      const cur = chunks[pos] ? chunks[pos].p : -1;
      if (dir > 0) { for (let i = pos + 1; i < chunks.length; i++) if (chunks[i].p !== cur) return i; return -1; }
      let j = pos; while (j > 0 && chunks[j - 1].p === cur) j--;
      if (j < pos) return j; if (j === 0) return 0;
      const pp = chunks[j - 1].p; while (j > 0 && chunks[j - 1].p === pp) j--; return j;
    };
    const toggle = () => T.playing ? T.pause() : T.start(pos);
    T.toggle = toggle;
    pl.onclick = toggle;
    $("#tn", el).onclick = () => { if (pos + 1 >= chunks.length) T.finished(); else T.start(pos + 1); };
    $("#tp", el).onclick = () => T.start(Math.max(0, pos - 1));
    $("#tnc", el).onclick = () => { if (idx < toc.length - 1) goTo(idx + 1, { play: true }); else toast("Hết truyện"); };
    $("#tpc", el).onclick = () => { if (idx > 0) goTo(idx - 1, { play: true }); else T.start(0); };
    const more = $(".tts-more", el);
    $("#tspd", el).onclick = $("#tvc", el).onclick = () => { more.hidden = !more.hidden; };
    $("#tset", el).onclick = () => $("#ba", el).click();
    $("#tx", el).onclick = () => { T.stopAll(); if (bg === el) closeBg(); };
    const rv = $("#trv", el);
    const setRate = v => { cfg.rate = clampRate(v); rs.value = String(cfg.rate); rv.textContent = fmtRate(cfg.rate); $("#tspd", el).textContent = cfg.rate.toFixed(2).replace(".", ",") + "x"; };
    setRate(cfg.rate);
    rs.oninput = () => setRate(rs.value);                                   // kéo: chỉ cập nhật số hiển thị
    rs.onchange = () => { saveCfg(); if (T.playing) T.start(pos); };        // thả tay: áp dụng ngay
    let nudgeT;
    const nudge = d => { setRate(cfg.rate + d); saveCfg(); clearTimeout(nudgeT); nudgeT = setTimeout(() => { if (T.playing) T.start(pos); }, 450); };
    $("#trm", el).onclick = () => nudge(-0.01);
    $("#trp", el).onclick = () => nudge(0.01);
    vs.onchange = () => { cfg.voice = vs.value; saveCfg(); if (native) native.setVoice(vs.value); if (T.playing) T.start(pos); };
    ss.onchange = () => { clearTimeout(sleepT); const m = +ss.value; tlab(); if (m > 0) sleepT = setTimeout(() => { T.pause(); st.textContent = "Đã hết giờ hẹn"; ss.value = "0"; tlab(); }, m * 60000); };
    $("#bh", el).onclick = () => {
      if (!ttsEl.hidden) { T.stopAll(); return; }
      if (!native && !web) { toast("Máy không hỗ trợ đọc truyện"); return; }
      ttsEl.hidden = false; el.classList.remove("hide"); ttsEl.classList.toggle("min", !!cfg.ttsMin); setRbh();
      if (native) {
        native.requestNotificationPermission();
        if (!native.hasGoogleTts() && confirm("Máy chưa cài Google TTS (giọng chị Google).\nMở Google Play để cài?")) { native.installGoogleTts(); ttsEl.hidden = true; return; }
      }
      T.start(T.visibleIdx());
    };
    if (native) {
      fillVoices(nativeVoices());
      window.__ttsNative = {
        onStart(g, i) { if (g !== gen || !T.playing) return; pos = i; hi(i); cnt(); flush(); },
        onDone(g) { if (g === gen && T.playing) T.finished(); },
        onError(g, m) { if (g === gen && T.playing) { T.pause(); st.textContent = m === "nolang" ? "Máy chưa có giọng tiếng Việt" : "Lỗi đọc"; if (m === "nolang" && confirm("Máy chưa cài giọng tiếng Việt cho Google TTS.\nMở cài đặt giọng nói để tải?")) native.openSettings(); } },
        onCmd(c) {
          if (ttsEl.hidden) return;
          if (c === "toggle") toggle();
          else if (c === "play") { if (!T.playing) T.start(pos); }
          else if (c === "pause") { if (T.playing) T.pause(); }
          else if (c === "next") goTo(idx + 1, { play: true });
          else if (c === "prev") goTo(idx - 1, { play: true });
        },
        onExternalStop() { if (!ttsEl.hidden || bg === el) { T.stopAll(); if (bg === el) closeBg(); } }
      };
    } else if (web) { loadWeb(); web.onvoiceschanged = loadWeb; }
    T.ui();
    return T;
  })();

  // ---- thời gian ĐỌC (không tính lúc đang nghe) ----
  let lastTick = Date.now();
  const readT = setInterval(() => {
    const now = Date.now(), dt = Math.min(now - lastTick, 5000); lastTick = now;
    if (el.style.display === "none" || document.hidden || tts.playing || now - lastAct > 180000 || !curCh) return;
    addTime(story, 0, dt / 1000);
  }, 1000);

  el._api = { title: () => story.title, ch: curTitle, playing: () => tts.playing, toggle: () => tts.toggle() };
  el._leave = () => {
    if (tts.active()) { const i = stack.indexOf(el); if (i >= 0) stack.splice(i, 1); el.style.display = "none"; bg = el; updateMini(); applyBars(); }
    else pop();
  };
  $(".bk", el).onclick = el._leave;
  const onVis = () => { if (document.hidden && curCh) saveHist(); };   // lưu vị trí khi app xuống nền
  document.addEventListener("visibilitychange", onVis);
  el.onclose = () => {
    ls.set("last", null); document.removeEventListener("visibilitychange", onVis);
    tts.stopAll(); clearInterval(readT); clearTimeout(saveT); window.removeEventListener("resize", onResize); window.__fontsDone = null;
    if (curCh) saveHist(); delete window.__ttsNative; updateMini();
    if (tab === "lib" && !stack.length) renderLib();
  };
  ls.set("last", { id: story.id });
  applyRead(); setRbh();
  load(idx, startP).then(() => { if (!startP) toast(isPage() ? "Chạm mép trái/phải hoặc vuốt để lật trang · chạm giữa để mở menu" : "Chạm vào giữa màn hình để hiện/ẩn menu"); });
}

// ---------- Cập nhật app (GitHub Releases) ----------
const REPO = "tombin20/bnovel-reader";
const verNum = v => String(v || "").replace(/^[^\d]*/, "").split(".").map(x => parseInt(x, 10) || 0);
const isNewer = (a, b) => { const x = verNum(a), y = verNum(b); for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d > 0; } return false; };
const rawGet = url => new Promise((ok, err) => { const id = ++hid; pend[id] = { ok, err }; AndroidHttp.request(id, "GET", url, "", ""); });
// Markdown rút gọn của ghi chú phát hành: tiêu đề (#), gạch đầu dòng (- hoặc *), **đậm**, `mã`
const mdInline = t => esc(t).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/`(.+?)`/g, "<code>$1</code>");
function mdLite(md) {
  const out = []; let inList = false;
  for (const raw of String(md || "").split(/\r?\n/)) {
    const l = raw.trim(), li = l.match(/^[-*•]\s+(.*)/);
    if (li) { if (!inList) { out.push("<ul>"); inList = true; } out.push(`<li>${mdInline(li[1])}</li>`); continue; }
    if (inList) { out.push("</ul>"); inList = false; }
    if (!l) continue;
    const hd = l.match(/^#{1,6}\s+(.*)/);
    out.push(hd ? `<h5>${mdInline(hd[1])}</h5>` : `<p>${mdInline(l)}</p>`);
  }
  if (inList) out.push("</ul>");
  return out.join("");
}
// Hộp thoại cập nhật to, có tóm tắt thay đổi. Tắt/để sau đều được, nhưng lần mở app sau sẽ hiện lại.
function showUpdate(u) {
  if (sheetEl && sheetEl.querySelector(".upd-hero")) return;
  const notes = mdLite(u.notes) || "<p>Bản mới có nhiều cải tiến và sửa lỗi.</p>";
  const sh = openSheet(`
    <div class="upd-hero">
      <button class="upd-x" id="updx" aria-label="Đóng">✕</button>
      <div class="upd-ic"><svg viewBox="0 0 24 24"><path d="M12 19V5M5 12l7-7 7 7"/></svg></div>
      <h3>Có bản cập nhật mới!</h3>
      <div class="upd-ver"><span>${esc(APP_VER)}</span><i>→</i><b>${esc(String(u.tag).replace(/^v/i, ""))}</b></div>
    </div>
    <div class="upd-body"><h4>Có gì mới</h4><div class="upd-notes">${notes}</div></div>
    <div class="upd-actions">
      <button class="btn solid" id="updgo">⬇ Cập nhật ngay</button>
      <button class="btn" id="updlater">Để sau</button>
    </div>`);
  sh.classList.add("upd");
  $("#updx", sh).onclick = $("#updlater", sh).onclick = closeSheet;
  $("#updgo", sh).onclick = () => { window.AndroidApp.openUrl(u.url); closeSheet(); };
}
async function checkUpdate(manual) {
  if (!native || !window.AndroidApp || !APP_VER) { if (manual) toast("Chỉ dùng được trong app Android"); return; }
  let info = null;
  try {
    const r = await rawGet(`https://api.github.com/repos/${REPO}/releases/latest`);
    const tag = r.tag_name || "", apk = (r.assets || []).find(a => /\.apk$/i.test(a.name));
    if (tag && apk && isNewer(tag, APP_VER)) info = { tag, url: apk.browser_download_url, notes: r.body || "" };
    ls.set("updInfo", info);   // nhớ lại để lần sau mất mạng vẫn nhắc được
  } catch (e) {
    info = ls.get("updInfo", null);
    if (info && !isNewer(info.tag, APP_VER)) info = null;
    if (!info) { if (manual) toast("Không kiểm tra được: " + e.message); return; }
  }
  if (!info) { if (manual) toast("Bạn đang dùng bản mới nhất (" + APP_VER + ")"); return; }
  showUpdate(info);
}

// ---------- Khởi động ----------
if (nativeDl) Object.keys(dl).forEach(id => { const sn = dlMerge(id); if (sn && (sn.state === "run" || sn.state === "queued")) jobs[id] = { native: true, done: sn.done, total: sn.total }; });
go("lib");
if (acct) sync(false);
// Tắt hẳn app khi đang đọc -> mở lại tự vào đúng truyện, chương, trang lần trước
{
  const last = ls.get("last", null);
  if (last && last.id && hist[last.id]) { ls.set("last", null); resume(last.id); }   // xóa trước để nếu lỗi không bị lặp mãi
}
if (native) {
  setTimeout(() => checkUpdate(false), 1500);                       // mỗi lần mở app
  let hiddenAt = 0;                                                 // và khi quay lại app sau >= 10 phút
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) hiddenAt = Date.now();
    else if (hiddenAt && Date.now() - hiddenAt > 10 * 60 * 1000) { hiddenAt = 0; checkUpdate(false); }
  });
}
})();
