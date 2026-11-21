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
  chevDown: SV('<path d="M6 9l6 6 6-6"/>'),
  close: SV('<path d="M6 6l12 12M18 6L6 18"/>'),
  music: SV('<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>'),
  sort: SV('<path d="M8 5v14M4.5 8.5L8 5l3.5 3.5M16 19V5M12.5 15.5L16 19l3.5-3.5"/>'),
  download: SV('<circle cx="12" cy="12" r="9"/><path d="M12 7v7M8.8 11.5L12 14.7l3.2-3.2"/>'),
  check: SV('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  stop: SV('<rect x="7" y="7" width="10" height="10" rx="1.5" fill="currentColor"/>'),
  bookmark: SV('<path d="M7 4h10v16l-5-3.6L7 20z"/>'),
  bookmarkOn: SV('<path fill="currentColor" d="M7 4h10v16l-5-3.6L7 20z"/>'),
  filter: SV('<path d="M4 5.5h16l-6.2 7.3v5.4l-3.6 1.8v-7.2z"/>'),
  more: SV('<circle cx="12" cy="5" r="1.7" fill="currentColor"/><circle cx="12" cy="12" r="1.7" fill="currentColor"/><circle cx="12" cy="19" r="1.7" fill="currentColor"/>'),
  user: SV('<circle cx="12" cy="8" r="4"/><path d="M4 20c1.5-4 4.5-5.5 8-5.5s6.5 1.5 8 5.5"/>'),
  search: SV('<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>'),
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

// ---------- Nhạc nền khi nghe ----------
const music = (() => {
  const au = new Audio(); au.preload = "auto";
  let list = ls.get("music", []), cur = -1, url = "";
  const save = () => ls.set("music", list);
  const vol = () => { au.volume = Math.min(1, Math.max(0, cfg.musicVol == null ? 0.25 : cfg.musicVol)); };
  async function playIdx(i, tries = 0) {
    if (!list.length || tries > list.length) return;
    cur = ((i % list.length) + list.length) % list.length;
    let b = null; try { b = await chGet(list[cur].k); } catch {}
    if (!b) { list.splice(cur, 1); save(); return playIdx(cur, tries + 1); }
    const old = url; url = URL.createObjectURL(b); au.src = url; vol();
    if (old) URL.revokeObjectURL(old);
    try { await au.play(); } catch {}
  }
  au.onended = () => playIdx(cur + 1);
  au.onerror = () => { if (list.length > 1) playIdx(cur + 1); };
  return {
    get list() { return list; },
    on() { return !!cfg.musicOn && list.length > 0; },
    start() { if (!this.on()) return; vol(); if (au.src && cur >= 0) { if (au.paused) au.play().catch(() => {}); } else playIdx(0); },
    pause() { try { au.pause(); } catch {} },
    setVol() { vol(); },
    async add(files) {
      for (const f of files) { const k = "mus:" + Date.now() + "_" + Math.random().toString(36).slice(2, 7); await chPut(k, f); list.push({ k, name: (f.name || "Bài nhạc").replace(/\.[^.]+$/, "") }); }
      save();
    },
    async remove(i) { const x = list[i]; if (!x) return; try { await chDel(x.k); } catch {} list.splice(i, 1); save(); if (i === cur) { au.pause(); au.removeAttribute("src"); cur = -1; } else if (i < cur) cur--; }
  };
})();
function openMusic(theme) {
  const draw = () => {
    s.innerHTML = `<div class="set"><h3>Nhạc nền</h3>
      <div class="r"><label>Phát nhạc nền khi nghe truyện</label><input type="checkbox" id="mon" ${cfg.musicOn ? "checked" : ""}></div>
      <div class="r"><label>Âm lượng: <span id="mvv">${Math.round((cfg.musicVol == null ? 0.25 : cfg.musicVol) * 100)}%</span></label><input id="mv" type="range" min="0" max="100" value="${Math.round((cfg.musicVol == null ? 0.25 : cfg.musicVol) * 100)}"></div>
      ${music.list.length ? music.list.map((m, i) => `<div class="li mus"><div class="t"><b>${esc(m.name)}</b></div><button class="x" data-mx="${i}">✕</button></div>`).join("") : `<p class="empty">Chưa có bài nhạc nào</p>`}
      <div class="r"><button class="btn solid" id="madd">+ Chọn nhạc từ máy</button></div>
      <input type="file" id="mf" accept="audio/*" multiple hidden>
      <p class="muted">Nhạc phát lặp lại, tự dừng khi bạn dừng nghe. Nên chọn nhạc không lời.</p></div>`;
    $("#mon", s).onchange = e => { cfg.musicOn = e.target.checked; saveCfg(); };
    $("#mv", s).oninput = e => { cfg.musicVol = +e.target.value / 100; $("#mvv", s).textContent = e.target.value + "%"; music.setVol(); };
    $("#mv", s).onchange = () => saveCfg();
    $$("[data-mx]", s).forEach(b => b.onclick = async () => { await music.remove(+b.dataset.mx); draw(); });
    $("#madd", s).onclick = () => $("#mf", s).click();
    $("#mf", s).onchange = async e => { const fs = [...(e.target.files || [])]; if (!fs.length) return; toast("Đang thêm nhạc..."); try { await music.add(fs); if (!cfg.musicOn) { cfg.musicOn = true; saveCfg(); } } catch { toast("Không thêm được"); } draw(); };
  };
  const s = openSheet(""); if (theme) sheetEl.dataset.theme = theme; draw();
}

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
  try { const c = await chGet("pf:" + k); if (c) { memo[k] = c; return c; } } catch {}
  if (window.AndroidDl) { try { const t = window.AndroidDl.readChapter(+sid, +pos); if (t) return JSON.parse(t); } catch {} }
  const c = (await api(`/api/chapter?story=${sid}&pos=${pos}`)).chapter;
  memo[k] = c; cachePf(k, c); return c;
}
// lưu tạm các chương đã đọc / tải trước để đọc lại không cần mạng (giữ tối đa 80 chương gần nhất)
async function cachePf(k, c) {
  try {
    const key = "pf:" + k; await chPut(key, c);
    const l = ls.get("pfk", []).filter(x => x !== key); l.push(key);
    while (l.length > 80) { const o = l.shift(); try { await chDel(o); } catch {} }
    ls.set("pfk", l);
  } catch {}
}
const wifiOk = () => { const c = navigator.connection; if (!c) return true; if (c.saveData) return false; return c.type ? (c.type === "wifi" || c.type === "ethernet") : true; };
const IMG_RE = /^!\[\]\((.+)\)$/;
const renderContent = text => String(text || "").split(/\n+/).map(l => l.trim()).filter(Boolean).map((l, i) => {
  const m = l.match(IMG_RE);
  return m ? `<div class="pimg" data-p="${i}"><img src="${esc(img(m[1], 1400))}" alt=""></div>` : `<p data-p="${i}">${esc(l)}</p>`;
}).join("");
const imgOnly = text => { const l = String(text || "").split(/\n+/).map(x => x.trim()).filter(Boolean); return l.length > 0 && l.every(x => IMG_RE.test(x)); };
const imgsOf = text => String(text || "").split(/\n+/).map(l => (l.trim().match(IMG_RE) || [])[1]).filter(Boolean);

// ---------- Thống kê thời gian ----------
const dayKey = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
let statDirty = false, statSyncDirty = false, statsErr = "";
// kind: 0 = đọc (không bấm nghe), 1 = nghe
function addTime(story, kind, sec) {
  if (!(sec > 0)) return;
  const s = stats[story.id] || (stats[story.id] = { title: story.title, cover: story.cover, r: 0, l: 0 });
  s.title = story.title; s.cover = story.cover;
  if (kind) s.l += sec; else s.r += sec;
  const d = days[dayKey()] || (days[dayKey()] = [0, 0]); d[kind] += sec;
  statDirty = true; statSyncDirty = true;
}
setInterval(() => { if (statDirty) { statDirty = false; ls.set("stats", stats); ls.set("days", days); } }, 5000);
document.addEventListener("visibilitychange", () => {
  if (document.hidden && statDirty) { statDirty = false; ls.set("stats", stats); ls.set("days", days); }
  if (document.hidden && acct && statSyncDirty) { statSyncDirty = false; syncStats(); }
});
setInterval(() => { if (acct && statSyncDirty && !document.hidden) { statSyncDirty = false; syncStats(); } }, 300000);
// Gộp thống kê từ nơi khác vào máy này: mỗi số lấy giá trị LỚN HƠN (không bao giờ làm mất hay cộng đôi thời gian)
function mergeStats(sv, dv) {
  let ch = false;
  for (const [id, x] of Object.entries(sv || {})) {
    const l = stats[id], r = +x.r || 0, li = +x.l || 0;
    if (!l) { stats[id] = { title: x.title || "", cover: x.cover || "", r, l: li }; ch = true; continue; }
    if (r > l.r) { l.r = r; ch = true; } if (li > l.l) { l.l = li; ch = true; }
    if (!l.title && x.title) { l.title = x.title; l.cover = x.cover || l.cover; ch = true; }
  }
  for (const [k, v] of Object.entries(dv || {})) {
    const l = days[k], a = +v[0] || 0, b = +v[1] || 0;
    if (!l) { days[k] = [a, b]; ch = true; continue; }
    if (a > l[0]) { l[0] = a; ch = true; } if (b > l[1]) { l[1] = b; ch = true; }
  }
  if (ch) { ls.set("stats", stats); ls.set("days", days); }
  return ch;
}
// Đồng bộ thống kê với tài khoản (máy chủ cần có GET/PUT /api/stats)
async function syncStats() {
  if (!acct) return;
  try {
    const r = await api("/api/stats", "GET", null, true);
    mergeStats(r.stats, r.days);
    await api("/api/stats", "PUT", { stats, days }, true);
    ls.set("statsSync", Date.now()); statsErr = "";
  } catch (e) { statsErr = (e.status === 404 || e.status === 405) ? "nosrv" : (e.message || "lỗi"); }
}
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
      if (!l || t > l.t + 1000) hist[x.id] = { id: x.id, title: x.title, cover: x.cover, pos: x.chapter_pos, ct: x.chapter_title || "", p: l && l.pos === x.chapter_pos ? l.p : 0, t, n: l && l.n, pc: l && l.pos === x.chapter_pos ? l.pc : undefined };
      else if (l.t > t + 1000) api("/api/history", "PUT", { story: x.id, pos: l.pos }, true).catch(() => {});
    }
    for (const l of Object.values(hist)) if (!shIds.has(l.id)) api("/api/history", "PUT", { story: l.id, pos: l.pos }, true).catch(() => {});
    ls.set("hist", hist);
    await syncStats();
    if (manual) toast(statsErr === "nosrv" ? "Đã đồng bộ truyện. Máy chủ chưa hỗ trợ đồng bộ thống kê" : statsErr ? "Đã đồng bộ truyện, thống kê lỗi: " + statsErr : "Đã đồng bộ với tài khoản " + acct.user.name);
    if (tab === "lib" && !stack.length) renderLib(); else if (tab === "set" && !stack.length) renderSettings();
  } catch (e) { if (manual) toast("Đồng bộ lỗi: " + e.message); }
  finally { syncing = false; setSyncIcon(false); }
}
function setSyncIcon(on) { const b = $("#syncb"); if (b) b.classList.toggle("spin", on); }

// ---------- Sách nói: bỏ qua đoạn + từ điển phát âm ----------
function skipFn() {
  const rs = (cfg.skip || "").split("\n").map(x => x.trim()).filter(Boolean).map(l => {
    if (/^re:/i.test(l)) { try { return { re: new RegExp(l.slice(3), "i") }; } catch { return null; } }
    return { s: l.toLowerCase() };
  }).filter(Boolean);
  return t => { const lo = t.toLowerCase(); return rs.some(r => r.re ? r.re.test(t) : lo.includes(r.s)); };
}
function pronFn() {
  const pairs = (cfg.pron || "").split("\n").map(l => { const i = l.indexOf("="); return i > 0 ? [l.slice(0, i).trim(), l.slice(i + 1).trim()] : null; }).filter(x => x && x[0]).sort((a, b) => b[0].length - a[0].length);
  if (!pairs.length) return t => t;
  const re = new RegExp("(?<![\\p{L}\\p{N}])(" + pairs.map(x => x[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")(?![\\p{L}\\p{N}])", "giu");
  const map = new Map(pairs.map(x => [x[0].toLowerCase(), x[1]]));
  return t => t.replace(re, m => { const v = map.get(m.toLowerCase()); return v == null ? m : v; });
}
function openTtsRules(theme) {
  const s = openSheet(`<div class="set"><h3>Phát âm & bỏ qua đoạn</h3>
    <div class="stp"><label>Từ điển phát âm</label></div>
    <p class="muted">Mỗi dòng: <b>từ=cách đọc</b>. Chỉ đổi giọng đọc, chữ trên màn hình giữ nguyên.</p>
    <textarea id="pr" rows="6" placeholder="Hikigaya=Hích-ki-ga-ya&#10;Yukinoshita=Du-ki-nô-si-ta">${esc(cfg.pron || "")}</textarea>
    <div class="stp"><label>Bỏ qua đoạn chứa</label></div>
    <p class="muted">Mỗi dòng một cụm từ (ví dụ: dịch giả, nguồn:). Bắt đầu bằng <b>re:</b> để dùng biểu thức chính quy.</p>
    <textarea id="sk" rows="5" placeholder="dịch giả&#10;re:^\\[Ghi chú.*\\]$">${esc(cfg.skip || "")}</textarea>
    <div class="r"><button class="btn solid" id="prok">Lưu</button></div></div>`);
  if (theme) sheetEl.dataset.theme = theme;
  $("#prok", s).onclick = () => { cfg.pron = $("#pr", s).value.trim(); cfg.skip = $("#sk", s).value.trim(); saveCfg(); closeSheet(); if (window.__ttsRules) window.__ttsRules(); toast("Đã lưu"); };
}

// ---------- Đánh dấu / ghi chú, nhãn tủ sách ----------
let bm = ls.get("bm", {});                 // {sid:[{pos,ct,p,txt,note,t}]}
const saveBm = () => ls.set("bm", bm);
function copyText(t) {
  const fb = () => { const a = document.createElement("textarea"); a.value = t; a.style.cssText = "position:fixed;opacity:0"; document.body.append(a); a.select(); try { document.execCommand("copy"); } catch {} a.remove(); };
  try { if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t).catch(fb); } catch {}
  fb();
}

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
    if (t) { if (t._api && t._api.collapse && t._api.collapse()) return true; if (t._leave) t._leave(); else pop(); return true; }
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
$("#mini .mt").onclick = () => { if (!bg) return; const e = bg; bg = null; e.style.display = ""; stack.push(e); updateMini(); applyBars(); try { e._api.relayout(); } catch {} };

const titles = { lib: "Tủ sách", home: "Khám phá", stat: "Thống kê", set: "Cài đặt" };
function go(t) {
  tab = t;
  const lib = t === "lib";
  $("#ttl").textContent = titles[t]; $("#ttl").hidden = lib; $("#top").classList.toggle("libtop", lib);
  $("#ltabs").hidden = !lib; $("#avt").hidden = !lib; $("#srchb").hidden = !lib; $("#moreb").hidden = !lib; $("#syncb").hidden = true;
  $$("#tabs button").forEach(b => b.classList.toggle("on", b.dataset.tab === t));
  view.scrollTop = 0;
  view.classList.remove("swap"); void view.offsetWidth; view.classList.add("swap");
  ({ lib: renderLib, home: renderHome, stat: renderStats, set: renderSettings })[t]();
}
$("#tabs").addEventListener("click", e => { const b = e.target.closest("[data-tab]"); if (b) { while (stack.length) pop(); go(b.dataset.tab); } });
$("#syncb").onclick = () => sync(true);
view.addEventListener("scroll", () => $("#top").classList.toggle("sc", view.scrollTop > 6), { passive: true });
app.addEventListener("click", e => {
  const c = e.target.closest("[data-id]"); if (c && !e.target.closest("[data-del]")) openStory(+c.dataset.id);
  const r = e.target.closest("[data-resume]"); if (r && !e.target.closest("[data-del]")) resume(+r.dataset.resume);
});

const card = (s, mode) => {
  const bd = (fav.some(f => f.id === s.id) && !(tab === "lib" && libTab === "shelf") ? "♥" : "") + (dl[s.id] ? "⬇" : "");
  return `<button class="card" ${mode === "resume" ? `data-resume="${s.id}"` : `data-id="${s.id}"`}><div class="cvw"><img class="cv" loading="lazy" src="${esc(img(s.cover, 400))}" alt="">${bd ? `<span class="bd">${bd}</span>` : ""}</div><b>${esc(s.title)}</b></button>`;
};
const grid = (l, mode) => l.map(s => card(s, mode)).join("");
const skel = (n = 9) => Array.from({ length: n }, () => `<div class="card sk"><div class="cvw"><div class="cv"></div></div><b></b></div>`).join("");

// ---------- Tủ sách (trang chủ) ----------
let libTab = "shelf", libQ = "", libSort = "recent", libSearch = false;
function shelf() {
  const m = new Map();
  fav.forEach(f => m.set(f.id, { id: f.id, title: f.title, cover: f.cover, chapters: f.chapters, t: 0 }));
  Object.values(hist).forEach(x => { const e = m.get(x.id) || { id: x.id, title: x.title, cover: x.cover, t: 0 }; Object.assign(e, { t: x.t, ct: x.ct }); m.set(x.id, e); });
  Object.values(dl).forEach(d => { if (!m.has(d.story.id)) m.set(d.story.id, { id: d.story.id, title: d.story.title, cover: d.story.cover, t: 0 }); });
  return [...m.values()].sort((a, b) => b.t - a.t);
}
const progOf = x => { const h = hist[x.id], n = x.chapters || (dl[x.id] && dl[x.id].chapters.length) || 0; return h && n ? h.pos / n : 0; };
const tOf = x => (x.t != null ? x.t : (hist[x.id] ? hist[x.id].t : 0));
function libSortL(l, keepOrder) {          // lọc theo ô tìm kiếm + sắp xếp
  const q = norm(libQ); const r = q ? l.filter(x => norm(x.title).includes(q)) : l.slice();
  if (libSort === "name") r.sort((a, b) => String(a.title).localeCompare(String(b.title), "vi"));
  else if (libSort === "prog") r.sort((a, b) => progOf(b) - progOf(a));
  else if (!keepOrder) r.sort((a, b) => tOf(b) - tOf(a));
  return r;
}
function renderAvatar() {
  const b = $("#avt"); if (!b) return;
  const u = acct && acct.user, pic = u && (u.avatar || u.picture || u.avatar_url);
  b.innerHTML = pic ? `<img src="${esc(pic)}" alt="">` : u && u.name ? esc(String(u.name).trim().charAt(0).toUpperCase()) : ICON.user;
}
function openLibMenu() {
  const opt = (k, n) => `<button data-sort="${k}">${libSort === k ? "✓ " : ""}${n}</button>`;
  const sh = openSheet(`<h3>Sắp xếp kệ sách</h3><div class="menu">${opt("recent", "Đọc gần đây")}${opt("name", "Tên A → Z")}${opt("prog", "Tiến độ đọc")}${acct ? `<button id="lsync">⟳ Đồng bộ với tài khoản</button>` : ""}</div>`);
  $$("[data-sort]", sh).forEach(b => b.onclick = () => { libSort = b.dataset.sort; closeSheet(); renderLib(); });
  if ($("#lsync", sh)) $("#lsync", sh).onclick = () => { closeSheet(); sync(true); };
}
// màn hình Tải xuống (bấm avatar): chỉ dùng được khi đã đăng nhập
function openDownloads() {
  const el = push(h(`<div><div class="bar"><button class="bk" aria-label="Quay lại">${ICON.back}</button><div class="dltab"><b>Tải xuống</b></div></div><div class="body"></div></div>`));
  $(".bk", el).onclick = pop;
  const body = $(".body", el);
  const draw = () => {
    const l = Object.values(dl);
    if (!l.length) {
      body.innerHTML = acct
        ? `<p class="empty">Chưa tải truyện nào.<br>Mở một truyện rồi bấm <b>⬇ Tải xuống</b> để đọc offline.</p>`
        : `<p class="empty">Tải truyện để đọc offline cần đăng nhập.<br>Liên kết tài khoản B-novel trong Cài đặt để dùng tính năng này.</p><div style="display:flex;justify-content:center"><button class="btn solid" id="dlgo">Đến phần liên kết</button></div>`;
      if ($("#dlgo", body)) $("#dlgo", body).onclick = () => { while (stack.length) pop(); go("set"); };
      return;
    }
    body.innerHTML = l.map(d => `<div class="li" data-id="${d.story.id}"><img src="${esc(img(d.story.cover, 400))}" alt=""><div class="t"><b>${esc(d.story.title)}</b><small>${d.have.length}/${d.chapters.length} chương${jobs[d.story.id] ? " · đang tải..." : ""}</small></div><button class="x" data-del="${d.story.id}">🗑</button></div>`).join("")
      + (acct ? "" : `<p class="muted" style="text-align:center;margin-top:14px">Cần đăng nhập để tải thêm truyện.</p>`);
    $$("[data-del]", body).forEach(b => b.onclick = async e => { e.stopPropagation(); if (!confirm("Xóa các chương đã tải của truyện này?")) return; await deleteDl(+b.dataset.del); draw(); });
  };
  draw();
}
function renderLib() {
  $$("#ltabs button").forEach(b => b.classList.toggle("on", b.dataset.lt === libTab));
  renderAvatar();
  const noMatch = `<p class="empty">Không tìm thấy truyện nào</p>`;
  const bodyHtml = () => {
    if (libTab === "shelf") {
      const l = libSortL(fav);
      return l.length ? `<div class="grid">${grid(l)}</div>` : (libQ ? noMatch : `<p class="empty">Kệ sách còn trống.<br>Mở một truyện rồi bấm <b>♡ Theo dõi</b> để thêm vào đây.</p>`);
    }
    const ids = new Set(fav.map(f => f.id)), l = libSortL(Object.values(hist).filter(x => !ids.has(x.id)));
    return l.length ? l.map(x => `<div class="li" data-resume="${x.id}"><img src="${esc(img(x.cover, 400))}" alt=""><div class="t"><b>${esc(x.title)}</b><small>${esc(x.ct || "")}</small></div><button class="x" data-fol="${x.id}" aria-label="Theo dõi">♡</button><button class="x" data-del="${x.id}" aria-label="Xóa">✕</button></div>`).join("")
      : (libQ ? noMatch : `<p class="empty">Chưa có truyện nào.<br>Truyện bạn đã đọc nhưng chưa theo dõi sẽ hiện ở đây.</p>`);
  };
  view.innerHTML = `${libSearch ? `<div class="libsearch"><input id="libq" type="search" placeholder="Tìm theo tên truyện" value="${esc(libQ)}"></div>` : ""}<div id="libbody">${bodyHtml()}</div>`;
  const bindBody = () => {
    $$("[data-del]", view).forEach(b => b.onclick = e => {
      e.stopPropagation(); const id = +b.dataset.del; delete hist[id]; ls.set("hist", hist);
      if (acct) pushOp("DELETE", "/api/history?story=" + id); renderLib();
    });
    $$("[data-fol]", view).forEach(b => b.onclick = e => {
      e.stopPropagation(); const id = +b.dataset.fol, x = hist[id]; if (!x || fav.some(f => f.id === id)) return;
      fav = [{ id, title: x.title, cover: x.cover, chapters: x.n }, ...fav]; ls.set("fav", fav);
      pushOp("PUT", "/api/follow?story=" + id, {}); toast("Đã thêm vào kệ sách"); renderLib();
    });
  };
  bindBody();
  const q = $("#libq"); let qT;
  if (q) q.oninput = e => { libQ = e.target.value; clearTimeout(qT); qT = setTimeout(() => { $("#libbody").innerHTML = bodyHtml(); bindBody(); }, 120); };
}
$("#avt").onclick = openDownloads;
$("#srchb").onclick = () => { libSearch = !libSearch; if (!libSearch) libQ = ""; renderLib(); if (libSearch) setTimeout(() => { const q = $("#libq"); if (q) q.focus(); }, 60); };
$("#moreb").onclick = openLibMenu;
$$("#ltabs button").forEach(b => b.onclick = () => { libTab = b.dataset.lt; renderLib(); });
$("#srchb").innerHTML = ICON.search; $("#moreb").innerHTML = ICON.more;
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

// ---------- Khám phá (có bộ lọc thể loại + series) ----------
const exF = { genres: new Set(), series: "" };
let genresCache = null; const genreIds = {};
async function getGenres() { if (!genresCache) genresCache = (await api("/api/genres")).genres || []; return genresCache; }
async function idsOfGenre(g) { if (!genreIds[g]) genreIds[g] = new Set(((await api("/api/stories?genre=" + encodeURIComponent(g))).stories || []).map(x => x.id)); return genreIds[g]; }
async function renderHome() {
  view.innerHTML = `<div class="exbar"><div class="search"><input id="q" type="search" placeholder="Tìm truyện..."></div><button id="flt" class="fbtn" aria-label="Lọc">${ICON.filter}<i class="fb" hidden></i></button></div><div id="fchips" class="chips fch" hidden></div><div id="list" class="grid">${skel()}</div>`;
  let all;
  try { all = await stories(); } catch (e) { $("#list").innerHTML = `<p class="err" style="grid-column:1/-1">${esc(e.message)}<br><button class="btn" id="retry">Thử lại</button></p>`; $("#retry").onclick = renderHome; return; }
  let tok = 0;
  const nF = () => exF.genres.size + (exF.series ? 1 : 0);
  const chips = () => {
    const box = $("#fchips"), n = nF(); $(".fb", view).hidden = !n; $(".fb", view).textContent = n;
    box.hidden = !n;
    box.innerHTML = [...exF.genres].map(g => `<button class="chip on" data-rg="${esc(g)}">${esc(g)} ✕</button>`).join("") + (exF.series ? `<button class="chip on" data-rs="1">Series: ${esc(exF.series)} ✕</button>` : "") + (n > 1 ? `<button class="chip" data-clr="1">Xóa lọc</button>` : "");
    $$("[data-rg]", box).forEach(b => b.onclick = () => { exF.genres.delete(b.dataset.rg); draw(); });
    if ($("[data-rs]", box)) $("[data-rs]", box).onclick = () => { exF.series = ""; draw(); };
    if ($("[data-clr]", box)) $("[data-clr]", box).onclick = () => { exF.genres.clear(); exF.series = ""; draw(); };
  };
  async function draw() {
    const my = ++tok; chips();
    const k = norm($("#q").value); let f = all;
    if (exF.series) f = f.filter(s => s.series === exF.series);
    if (exF.genres.size) {
      $("#list").innerHTML = skel();
      try { const sets = await Promise.all([...exF.genres].map(idsOfGenre)); f = f.filter(s => sets.every(set => set.has(s.id))); }
      catch (e) { if (my === tok) $("#list").innerHTML = `<p class="err" style="grid-column:1/-1">${esc(e.message)}</p>`; return; }
    }
    if (my !== tok) return;
    if (k) f = f.filter(s => norm(s.title + " " + (s.alts || "") + " " + (s.series || "")).includes(k));
    $("#list").innerHTML = f.length ? grid(f) : `<p class="empty" style="grid-column:1/-1">Không tìm thấy truyện</p>`;
  }
  draw(); $("#q").oninput = () => draw();
  $("#flt").onclick = async () => {
    const sel = { genres: new Set(exF.genres), series: exF.series };
    const sc = {}; all.forEach(s => { if (s.series) sc[s.series] = (sc[s.series] || 0) + 1; });
    const seriesList = Object.entries(sc).sort((a, b) => String(a[0]).localeCompare(String(b[0]), "vi"));
    let gl = []; try { gl = await getGenres(); } catch {}
    const sh = openSheet(`<div class="set"><h3>Lọc truyện</h3>
      <div class="stp"><label>Thể loại</label></div><div class="chips" id="gch"></div>
      ${seriesList.length ? `<div class="stp"><label>Series</label></div>${seriesList.length > 10 ? `<input id="sq" type="search" placeholder="Tìm series..." style="width:100%;margin-bottom:8px">` : ""}<div class="chips" id="sch"></div>` : ""}
      <div class="r"><button class="btn" id="fclr">Xóa lọc</button><button class="btn solid" id="fok">Xem kết quả</button></div></div>`);
    const drawG = () => {
      $("#gch", sh).innerHTML = gl.length ? gl.map(x => `<button class="chip ${sel.genres.has(x.name) ? "on" : ""}" data-g="${esc(x.name)}">${esc(x.name)} (${x.n})</button>`).join("") : `<p class="muted">Không tải được danh sách thể loại</p>`;
      $$("#gch [data-g]", sh).forEach(b => b.onclick = () => { const g = b.dataset.g; sel.genres.has(g) ? sel.genres.delete(g) : sel.genres.add(g); b.classList.toggle("on"); });
    };
    const drawS = () => {
      if (!$("#sch", sh)) return; const q = $("#sq", sh) ? norm($("#sq", sh).value) : "";
      $("#sch", sh).innerHTML = seriesList.filter(([n]) => !q || norm(n).includes(q)).map(([n, c]) => `<button class="chip ${sel.series === n ? "on" : ""}" data-s="${esc(n)}">${esc(n)} (${c})</button>`).join("") || `<p class="muted">Không có series phù hợp</p>`;
      $$("#sch [data-s]", sh).forEach(b => b.onclick = () => { sel.series = sel.series === b.dataset.s ? "" : b.dataset.s; drawS(); });
    };
    drawG(); drawS(); if ($("#sq", sh)) $("#sq", sh).oninput = drawS;
    $("#fclr", sh).onclick = () => { sel.genres.clear(); sel.series = ""; drawG(); drawS(); };
    $("#fok", sh).onclick = () => { exF.genres = sel.genres; exF.series = sel.series; closeSheet(); draw(); };
  };
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
  const sorted = list.filter(s => s[statSort] > 0).sort((a, b) => b[statSort] - a[statSort]);
  const top = Math.max(1, ...sorted.map(s => s.t));
  const ss = ls.get("statsSync", 0), hhmm = ss ? new Date(ss).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }) : "";
  const note = !acct ? "Thống kê chỉ lưu trên máy này. Liên kết tài khoản (Cài đặt) hoặc dùng Sao lưu để không bị mất khi cài lại app."
    : statsErr === "nosrv" ? "Máy chủ chưa hỗ trợ đồng bộ thống kê, hãy dùng Sao lưu trong Cài đặt."
    : ss ? "Đã đồng bộ với tài khoản · " + hhmm : "Chưa đồng bộ, bấm nút đồng bộ ở Cài đặt.";
  view.innerHTML = `<p class="muted stnote">${esc(note)}</p><div class="stc"><div class="sth">Tổng</div><div class="stbig">${fmt(T)} <small>Tổng thời gian</small></div>
    <div class="stbar"><i class="r" style="flex:${R || 0.0001}"></i><i class="l" style="flex:${L || 0.0001}"></i></div>
    <div class="stleg"><span><i class="dot r"></i>Đọc<br><b>${fmt(R)}</b></span><span style="text-align:right"><i class="dot l"></i>Nghe<br><b>${fmt(L)}</b></span></div></div>
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
    <h4>Dữ liệu</h4>
    <div class="r"><button class="btn solid" id="bkexp">Sao lưu dữ liệu</button><button class="btn" id="bkimp">Khôi phục từ file</button></div>
    <input type="file" id="bkf" accept=".json,application/json,text/plain" hidden>
    <p class="muted">Sao lưu gồm thống kê thời gian, lịch sử, truyện theo dõi và cài đặt. Lưu vào Drive/Zalo/Keep để khôi phục khi cài lại app hoặc đổi máy.</p>
    <div class="r"><button class="btn danger" id="clr">Xóa toàn bộ truyện đã tải</button></div>
    <div class="r"><button class="btn danger" id="clrst">Xóa thống kê</button></div>
    <h4>Máy chủ</h4>
    <div class="r"><input id="bs" style="flex:1" value="${esc(cfg.base)}"></div>
    <div class="r"><button class="btn" id="bsok">Lưu địa chỉ</button><button class="btn" id="bsrs">Mặc định</button></div>
    <h4>Ứng dụng</h4>
    <div class="r"><label>Phiên bản: <b>${esc(APP_VER || "web")}</b></label>${native ? `<button class="btn" id="chkupd">Kiểm tra cập nhật</button>` : ""}</div>
    <p class="empty">B-novel Reader</p></div>`;
  $("#bkexp").onclick = () => {
    const c = Object.assign({}, cfg); delete c.bg;
    const txt = JSON.stringify({ app: "bnovel-reader", v: 1, t: Date.now(), cfg: c, fav, hist, stats, days, bm });
    if (native && window.AndroidApp && AndroidApp.shareText) AndroidApp.shareText("Sao lưu B-novel Reader", txt);
    else { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([txt], { type: "application/json" })); a.download = "bnovel-backup.json"; a.click(); }
    try { navigator.clipboard && navigator.clipboard.writeText(txt); } catch {}
  };
  $("#bkimp").onclick = () => $("#bkf").click();
  $("#bkf").onchange = async e => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    try {
      const o = JSON.parse(await f.text()); if (o.app !== "bnovel-reader") throw 0;
      mergeStats(o.stats, o.days);
      for (const x of Object.values(o.hist || {})) { const l = hist[x.id]; if (!l || x.t > l.t) hist[x.id] = x; }
      const ids = new Set(fav.map(x => x.id)); for (const x of o.fav || []) if (!ids.has(x.id)) fav.push(x);
      ls.set("hist", hist); ls.set("fav", fav);
      for (const [sid, arr] of Object.entries(o.bm || {})) { const cur = bm[sid] || (bm[sid] = []); for (const b of arr) if (!cur.some(c => c.pos === b.pos && c.p === b.p)) cur.push(b); }
      saveBm();
      if (o.cfg) { const keep = { base: cfg.base, bg: cfg.bg }; Object.assign(cfg, o.cfg, keep); saveCfg(); applyTheme(); }
      toast("Đã khôi phục dữ liệu"); renderSettings();
      if (acct) syncStats();
    } catch { toast("File sao lưu không hợp lệ"); }
  };
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
  $("#clrst").onclick = () => { if (!confirm("Xóa toàn bộ thống kê?")) return; stats = {}; days = {}; ls.set("stats", stats); ls.set("days", days); if (acct) pushOp("PUT", "/api/stats", { stats: {}, days: {} }); toast("Đã xóa"); };
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
  const el = push(h(`<div class="sp"><div class="sp-top"><button class="bk" aria-label="Quay lại">${ICON.back}</button><b class="sp-t"></b><button id="spm" aria-label="Thêm">${ICON.more}</button></div><div class="body"><p class="load" style="padding-top:90px">Đang tải...</p></div></div>`));
  $(".bk", el).onclick = pop;
  const body = $(".body", el);
  let s, toc;
  try { [s, toc] = await Promise.all([api("/api/story?id=" + id).then(r => r.story), getToc(id)]); }
  catch (e) { if (dl[id]) { s = dl[id].story; toc = dl[id].chapters; } else { body.innerHTML = `<p class="err" style="padding-top:90px">${esc(e.message)}</p>`; return; } }
  let descCl = true, asc = true, q = "";
  if (nativeDl) { const sn = dlMerge(id); if (sn && (sn.state === "run" || sn.state === "queued")) jobs[id] = { native: true, done: sn.done, total: sn.total }; }
  $(".sp-t", el).textContent = s.title;
  // ảnh nền phía sau: ưu tiên ảnh nền của truyện (như trên web), không có thì dùng bìa
  const bgU = s.banner || s.background || s.backdrop || s.bg_image || s.background_url || s.cover;
  const authors = s.authors || [], illus = s.illustrators || [], alts = s.alts || s.alt_titles || s.altTitles || s.other_names;
  const altTxt = Array.isArray(alts) ? alts.join(", ") : (alts || "");
  const rows = [illus.length ? `Họa sĩ: ${esc(illus.join(", "))}` : "", altTxt ? `Tên khác: ${esc(altTxt)}` : "", s.series ? `Series: <a id="ser">${esc(s.series)}</a>` : "", s.status ? `Tình trạng: ${esc(s.status)}` : "", `Số chương: ${toc.length}`].filter(Boolean);
  body.innerHTML = `<div class="sp-bg"><img src="${esc(img(bgU, 900))}" alt=""></div>
    <div class="sp-hero"><img class="sp-cv" src="${esc(img(s.cover, 500))}" alt=""><h1>${esc(s.title)}</h1>
      ${authors.length ? `<div class="pills"><span class="pill">${ICON.user}${esc(authors.join(", "))}</span></div>` : ""}
      ${(s.genres || []).length ? `<div class="chips sp-tags">${(s.genres || []).map(g => `<button class="chip" data-g="${esc(g)}">${esc(g)}</button>`).join("")}</div>` : ""}</div>
    <div class="spc"><h3>Thông tin</h3><div class="inf">${rows.join("<br>")}</div></div>
    ${s.description ? `<div class="spc"><h3>Giới thiệu</h3><div class="desc cl" id="ds">${esc(s.description)}</div><button class="more" id="mr">Xem thêm</button></div>` : ""}
    <div class="spc"><div class="chh"><h3>Mục lục (${toc.length} chương)</h3><button id="so" aria-label="Đảo thứ tự">${ICON.sort}</button></div>
      <div class="chs"><input id="chq" type="search" placeholder="Tìm kiếm ${toc.length} chương"></div><div id="chl"></div></div>`;
  el.insertAdjacentHTML("beforeend", `<div class="fabs"><button id="fv"></button><button id="dlb"></button><button id="read" class="big" aria-label="Đọc">${ICON.play}</button></div>`);
  const drawList = () => {
    const hs = hist[id], d = dl[id], have = new Set(d ? d.have : []), k = norm(q);
    let list = asc ? toc : [...toc].reverse(); if (k) list = list.filter(c => norm(c.title).includes(k));
    $("#chl", body).innerHTML = list.length ? list.map(c => `<div class="ch ${hs && hs.pos === c.position ? "cur" : ""}" data-pos="${c.position}"><span>${esc(c.title)}</span>${have.has(c.position) ? "<i>✓</i>" : ""}</div>`).join("") : `<p class="empty">Không có chương phù hợp</p>`;
    $$(".ch", body).forEach(c => c.onclick = () => { const i = toc.findIndex(x => x.position === +c.dataset.pos); openReader(s, toc, i, 0); });
  };
  const refresh = () => {                  // cập nhật nút nổi + danh sách chương (khi theo dõi / tải xuống / đọc xong)
    const d = dl[id], isFav = fav.some(f => f.id === id), job = jobs[id];
    $("#fv", el).innerHTML = isFav ? ICON.bookmarkOn : ICON.bookmark; $("#fv", el).setAttribute("aria-label", isFav ? "Bỏ theo dõi" : "Theo dõi"); $("#fv", el).classList.toggle("on", isFav);
    $("#dlb", el).innerHTML = job ? `<span class="fp">${job.native ? job.done + "/" + job.total : (d ? d.have.length : 0) + "/" + toc.length}</span>` : d && d.have.length >= toc.length ? ICON.check : ICON.download;
    $("#dlb", el).classList.toggle("on", !!job || !!(d && d.have.length >= toc.length));
    drawList();
  };
  $("#read", el).onclick = () => { const hs = hist[id], i = hs ? Math.max(0, toc.findIndex(c => c.position === hs.pos)) : 0; openReader(s, toc, i, hs ? hs.p : 0); };
  $("#fv", el).onclick = () => {
    const isFav = fav.some(f => f.id === id);
    fav = isFav ? fav.filter(f => f.id !== id) : [{ id, title: s.title, cover: s.cover, chapters: toc.length }, ...fav]; ls.set("fav", fav);
    pushOp(isFav ? "DELETE" : "PUT", "/api/follow?story=" + id, isFav ? null : {}); refresh(); toast(isFav ? "Đã bỏ theo dõi" : "Đã thêm vào kệ sách");
  };
  $("#dlb", el).onclick = () => startDownload(s, toc, refresh);
  if ($("#mr", body)) $("#mr", body).onclick = () => { descCl = !descCl; $("#ds", body).classList.toggle("cl", descCl); $("#mr", body).textContent = descCl ? "Xem thêm" : "Thu gọn"; };
  $("#so", body).onclick = () => { asc = !asc; drawList(); };
  $("#chq", body).oninput = e => { q = e.target.value; drawList(); };
  if ($("#ser", body)) $("#ser", body).onclick = () => openList(s.series, "/api/stories?series=" + encodeURIComponent(s.series));
  $$(".chip[data-g]", body).forEach(b => b.onclick = () => openList(b.dataset.g, "/api/stories?genre=" + encodeURIComponent(b.dataset.g)));
  $("#spm", el).onclick = () => {
    const sh = openSheet(`<h3>${esc(s.title)}</h3><div class="menu">${s.series ? `<button id="m-ser">Cùng series</button>` : ""}<button id="m-cp">Sao chép tên truyện</button></div>`);
    if ($("#m-ser", sh)) $("#m-ser", sh).onclick = () => { closeSheet(); openList(s.series, "/api/stories?series=" + encodeURIComponent(s.series)); };
    $("#m-cp", sh).onclick = () => { closeSheet(); copyText(s.title); toast("Đã sao chép"); };
  };
  body.addEventListener("scroll", () => el.classList.toggle("scr", body.scrollTop > 250), { passive: true });
  el.onclose = () => { if (dlRedraw[id] === refresh) delete dlRedraw[id]; if (tab === "lib") renderLib(); };
  dlRedraw[id] = refresh;
  refresh();
}
// Tải offline: toàn bộ chữ + ảnh (ảnh lưu vào bộ nhớ máy)
async function startDownload(s, toc, redraw) {
  const id = s.id;
  if (jobs[id]) { if (jobs[id].native) nativeDl.cancel(+id); else jobs[id].cancel = true; return; }
  if (!acct) { if (confirm("Tải truyện xuống cần đăng nhập (liên kết tài khoản B-novel).\nĐến Cài đặt để liên kết ngay?")) { while (stack.length) pop(); go("set"); } return; }
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
    <div class="rtop bar"><button class="bk" aria-label="Quay lại">${ICON.back}</button><b class="rt"></b><button id="rsb" aria-label="Tìm trong chương">${ICON.search}</button></div>
    <div class="rsearch" hidden><input type="search" placeholder="Tìm trong chương" enterkeyhint="search"><span class="scnt"></span><button class="sp" aria-label="Trước">▲</button><button class="sn" aria-label="Sau">▼</button><button class="sx" aria-label="Đóng">✕</button></div>
    <div class="rscroll"></div><div class="pgnum" hidden><span class="pgl"></span><span class="pgr"></span></div><div class="rhead"></div>
    <div class="rdim"></div><div class="rwarm"></div>
    <div class="ply" hidden>
      <div class="ply-top"><button id="tdn" aria-label="Thu nhỏ">${ICON.chevDown}</button><button id="tx" aria-label="Dừng nghe">${ICON.close}</button></div>
      <div class="ply-body">
        <div class="ply-cv"><img id="tcv" alt=""></div>
        <div class="ply-meta"><b id="ptt"></b><small id="pau"></small></div>
        <div class="ply-seek"><input id="tsk" type="range" min="0" max="1000" value="0" aria-label="Vị trí nghe"></div>
        <div class="ply-info"><small id="tch"></small><small id="tcnt"></small></div>
        <div class="ply-info"><small id="tst"></small><small id="tpg"></small></div>
        <div class="ply-ctl"><button id="tp" aria-label="Câu trước">${ICON.rew}</button><button id="tpc" aria-label="Chương trước">${ICON.skipPrev}</button><button id="tpl" class="pl" aria-label="Phát/Dừng">${ICON.play}</button><button id="tnc" aria-label="Chương sau">${ICON.skipNext}</button><button id="tn" aria-label="Câu sau">${ICON.fwd}</button></div>
      </div>
      <div class="ply-more" hidden>
        <div class="m-spd"><div class="tr tr3"><small>Tốc độ</small><button id="trm" aria-label="Giảm 0,01">−</button><input id="tr" type="range" min="0.1" max="2" step="0.01"><button id="trp" aria-label="Tăng 0,01">+</button><b id="trv"></b></div></div>
        <div class="m-set"><div class="tr tr2"><select id="tv"></select></div>
          <div class="tr tr4"><button id="trule" class="btn">Phát âm / bỏ qua</button>${native ? `<button id="ttsdev" class="btn">Giọng nói của máy</button>` : ""}</div></div>
      </div>
      <div class="ply-bar">
        <button id="ptoc" class="pbi" aria-label="Mục lục">${ICON.list}<span>Mục lục</span></button>
        <label class="pbi tsel" aria-label="Hẹn giờ tắt">${ICON.timer}<span id="tsl">Hẹn giờ</span><select id="ts"><option value="0">Tắt hẹn giờ</option><option value="15">15 phút</option><option value="30">30 phút</option><option value="60">60 phút</option><option value="90">90 phút</option><option value="c1">Hết chương này</option><option value="c2">Sau 2 chương</option><option value="c3">Sau 3 chương</option></select></label>
        <button id="tspd" class="pbi" aria-label="Tốc độ"><b id="tspv">1,00x</b><span>Tốc độ</span></button>
        <button id="tmus" class="pbi" aria-label="Nhạc nền">${ICON.music}<span>Nhạc nền</span></button>
        <button id="tset" class="pbi" aria-label="Cài đặt nghe">${ICON.gear}<span>Cài đặt</span></button>
      </div>
    </div>
    <div class="tbub"><button class="bcv" id="bcv" aria-label="Mở trình phát"><img id="bimg" alt=""></button><div class="bctl"><button id="bpp" aria-label="Phát/Dừng"></button><button id="bnx" aria-label="Câu sau">${ICON.fwd}</button><button id="bcl" aria-label="Dừng nghe">${ICON.close}</button></div></div>
    <div class="rbot">
      <div class="rinfo"><span id="rpct">0,0%</span><span id="rpch"></span></div>
      <div class="rsl"><button id="bp">Trước</button><input id="rsl" type="range" min="0" max="1" step="1" value="0"><button id="bn">Tiếp</button></div>
      <div class="rbtns"><button id="bt" aria-label="Mục lục">${ICON.list}</button><button id="bm" aria-label="Chế độ đọc"></button><button id="bh" aria-label="Nghe">${ICON.phones}</button><button id="ba" aria-label="Cài đặt đọc">${ICON.gear}</button></div>
    </div>
  </div>`));
  const scroll = $(".rscroll", el), ttsEl = $(".ply", el), pgnum = $(".pgnum", el), pgl = $(".pgl", el), pgr = $(".pgr", el), rhead = $(".rhead", el);
  let text = null, hclip = null, hcols = null, W = 300, H = 400, page = 0, pages = 1, curCh = null;
  let idx = startIdx, tok = 0, saveT, lastAct = Date.now(), swipedAt = 0, anim = 0;
  const curTitle = () => toc[idx] ? toc[idx].title : "";
  const sl = $("#rsl", el), rpct = $("#rpct", el), rpch = $("#rpch", el), rbot = $(".rbot", el);
  let sliding = false;
  const fmtPct = v => v.toFixed(1).replace(".", ",") + "%";
  const setRbh = () => { el.style.setProperty("--rbh", (rbot.offsetHeight || 120) + "px"); };
  const applyRead = () => {            // độ sáng + màu chữ riêng của trang đọc
    $(".rdim", el).style.opacity = cfg.dim || 0;
    const hr = new Date().getHours(), warmOn = cfg.warm > 0 && (!cfg.warmAuto || hr >= 19 || hr < 6);
    $(".rwarm", el).style.opacity = warmOn ? cfg.warm / 100 * 0.5 : 0;
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
    $("#tpg", el).textContent = `${idx + 1}/${toc.length}  ${pct}`; $("#tch", el).textContent = curTitle();
  }
  const isPage = () => cfg.mode === "page";
  const rIcon = () => isPage() ? ICON.pageH : ICON.scrollV;
  const show = () => el.classList.toggle("hide");
  const modeLabel = () => { $("#bm", el).innerHTML = rIcon(); };
  modeLabel();
  $(".rt", el).textContent = story.title;

  // ---- giữ lâu một đoạn: nghe từ đây / đánh dấu / sao chép ----
  let lpT = 0, lpAt = 0, lpPt = null;
  scroll.addEventListener("touchstart", e => {
    if (autoOn) autoStop();
    if (e.touches.length !== 1) return;
    const t = e.touches[0]; lpPt = { x: t.clientX, y: t.clientY }; clearTimeout(lpT);
    lpT = setTimeout(() => { lpT = 0; if (!lpPt) return; lpAt = Date.now(); longPress(lpPt.x, lpPt.y); }, 520);
  }, { passive: true });
  scroll.addEventListener("touchmove", e => { if (lpPt && Math.hypot(e.touches[0].clientX - lpPt.x, e.touches[0].clientY - lpPt.y) > 10) { clearTimeout(lpT); lpPt = null; } }, { passive: true });
  ["touchend", "touchcancel"].forEach(ev => scroll.addEventListener(ev, () => { clearTimeout(lpT); lpPt = null; }, { passive: true }));
  scroll.addEventListener("contextmenu", e => e.preventDefault());
  function longPress(x, y) {
    if (!text) return;
    const e0 = document.elementFromPoint(x, y), pe = e0 && e0.closest && e0.closest("p[data-p]");
    if (!pe || !text.contains(pe)) return;
    if (navigator.vibrate) navigator.vibrate(15);
    const pIdx = +pe.dataset.p, c = toc[idx], snip = pe.textContent.replace(/\s+/g, " ").trim();
    const ci = tts.ensure() ? tts.indexAt(x, y, pIdx) : -1;
    const has = !!bmFind(c.position, pIdx);
    const s = openSheet(`<h3>${esc(snip.slice(0, 70))}${snip.length > 70 ? "…" : ""}</h3><div class="menu">
      <button id="m1">▶ Nghe từ đây</button><button id="m2">🔖 ${has ? "Sửa / xóa đánh dấu" : "Đánh dấu / ghi chú"}</button><button id="m3">📋 Sao chép đoạn</button></div>`);
    sheetEl.dataset.theme = el.dataset.theme;
    $("#m1", s).onclick = () => { closeSheet(); tts.startAt(ci < 0 ? 0 : ci); };
    $("#m2", s).onclick = () => { closeSheet(); editBm(pIdx, snip); };
    $("#m3", s).onclick = () => { closeSheet(); copyText(snip); toast("Đã sao chép"); };
  }

  // ---- đánh dấu / ghi chú ----
  const bmFind = (pos, p) => (bm[story.id] || []).find(b => b.pos === pos && b.p === p);
  function markBm() {
    if (!text || !toc[idx]) return;
    $$("p.bmk", text).forEach(p => p.classList.remove("bmk"));
    (bm[story.id] || []).filter(b => b.pos === toc[idx].position).forEach(b => { const p = $(`p[data-p="${b.p}"]`, text); if (p) p.classList.add("bmk"); });
  }
  function editBm(pIdx, snip) {
    const c = toc[idx], ex = bmFind(c.position, pIdx);
    const s = openSheet(`<h3>${ex ? "Đánh dấu" : "Thêm đánh dấu"}</h3><p class="muted">${esc(snip.slice(0, 140))}${snip.length > 140 ? "…" : ""}</p>
      <textarea id="bmn" rows="3" placeholder="Ghi chú (không bắt buộc)">${esc(ex ? ex.note : "")}</textarea>
      <div class="r"><button class="btn solid" id="bms">Lưu</button>${ex ? `<button class="btn danger" id="bmd">Xóa</button>` : ""}</div>`);
    sheetEl.dataset.theme = el.dataset.theme;
    $("#bms", s).onclick = () => {
      const arr = bm[story.id] || (bm[story.id] = []), o = { pos: c.position, ct: c.title, p: pIdx, txt: snip.slice(0, 140), note: $("#bmn", s).value.trim(), t: Date.now() };
      const i = arr.findIndex(b => b.pos === o.pos && b.p === o.p); if (i >= 0) arr[i] = o; else arr.push(o);
      saveBm(); markBm(); closeSheet(); toast("Đã lưu đánh dấu");
    };
    if (ex) $("#bmd", s).onclick = () => { bm[story.id] = bm[story.id].filter(b => b !== ex); if (!bm[story.id].length) delete bm[story.id]; saveBm(); markBm(); closeSheet(); toast("Đã xóa đánh dấu"); };
  }
  function jumpTo(pos, p) {
    const i = toc.findIndex(c => c.position === pos); if (i < 0) return;
    if (i !== idx) return goTo(i, { p });
    const t = text && $(`[data-p="${p}"]`, text); if (!t) return;
    if (isPage() && hclip) hGo(pageOf(t), true); else t.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  // ---- tự cuộn ----
  let autoOn = false, autoRaf = 0, autoLast = 0, autoAcc = 0;
  function autoStop() { if (!autoOn) return; autoOn = false; cancelAnimationFrame(autoRaf); autoRaf = 0; toast("Đã dừng tự cuộn"); }
  function autoStart() {
    if (isPage()) { toast("Tự cuộn chỉ dùng ở chế độ cuộn dọc"); return false; }
    autoOn = true; autoLast = performance.now(); autoAcc = 0;
    const step = t => {
      if (!autoOn) return;
      autoAcc += (cfg.auto || 40) * Math.min(100, t - autoLast) / 1000; autoLast = t;
      const px = Math.floor(autoAcc);
      if (px >= 1) {
        autoAcc -= px; const b = scroll.scrollTop; scroll.scrollTop = b + px;
        if (scroll.scrollTop + scroll.clientHeight >= scroll.scrollHeight - 2) {
          if (idx < toc.length - 1) { goTo(idx + 1).then(ok => { if (ok && autoOn) { autoLast = performance.now(); autoRaf = requestAnimationFrame(step); } else autoOn = false; }); return; }
          autoOn = false; toast("Hết truyện"); return;
        }
      }
      autoRaf = requestAnimationFrame(step);
    };
    autoRaf = requestAnimationFrame(step); return true;
  }

  // ---- tìm trong chương ----
  const sbar = $(".rsearch", el), sin = $("input", sbar), scnt = $(".scnt", sbar);
  let sRanges = [], sI = -1;
  function searchClear() { sRanges = []; sI = -1; if (window.CSS && CSS.highlights) { CSS.highlights.delete("sres"); CSS.highlights.delete("scur"); } scnt.textContent = ""; }
  function searchClose() { searchClear(); sbar.hidden = true; }
  function searchRun() {
    searchClear(); const q = sin.value.trim().toLowerCase(); if (!q || !text) return;
    const w = document.createTreeWalker(text, NodeFilter.SHOW_TEXT); let n;
    while ((n = w.nextNode()) && sRanges.length < 500) {
      const d = n.data.toLowerCase(); let i = 0;
      while ((i = d.indexOf(q, i)) >= 0) { const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + q.length); sRanges.push(r); i += q.length; }
    }
    if (!sRanges.length) { scnt.textContent = "0"; return; }
    if (window.CSS && CSS.highlights && window.Highlight) CSS.highlights.set("sres", new Highlight(...sRanges));
    sGo(0);
  }
  function sGo(i) {
    if (!sRanges.length) return; sI = (i + sRanges.length) % sRanges.length;
    const r = sRanges[sI]; scnt.textContent = `${sI + 1}/${sRanges.length}`;
    if (window.CSS && CSS.highlights && window.Highlight) CSS.highlights.set("scur", new Highlight(r));
    if (isPage() && hclip) hGo(pageOf(r), true);
    else { const rr = r.getBoundingClientRect(), sc = scroll.getBoundingClientRect(); scroll.scrollBy({ top: rr.top - sc.top - sc.height * 0.3, behavior: "smooth" }); }
  }
  $("#rsb", el).onclick = () => { el.classList.add("hide"); sbar.hidden = false; sin.focus(); sin.select(); };
  let sT; sin.addEventListener("input", () => { clearTimeout(sT); sT = setTimeout(searchRun, 250); });
  sin.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); if (sRanges.length && sin.dataset.q === sin.value) sGo(sI + 1); else { sin.dataset.q = sin.value; searchRun(); } sin.blur(); } });
  $(".sn", sbar).onclick = () => sGo(sI + 1); $(".sp", sbar).onclick = () => sGo(sI - 1); $(".sx", sbar).onclick = searchClose;

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
    hist[story.id] = { id: story.id, title: story.title, cover: story.cover, pos: c.position, ct: c.title, p: p == null ? currentP() : p, t: Date.now(), n: toc.length, pc: +Math.min(100, (idx + chapFrac()) / Math.max(1, toc.length) * 100).toFixed(1) };
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
    if (e.target.closest("button") || Date.now() - swipedAt < 350 || Date.now() - lpAt < 700) return;
    if (isPage()) { const x = e.clientX / window.innerWidth; if (cfg.edge === false) show(); else if (x < 0.3) hPrev(); else if (x > 0.7) hNext(); else show(); }
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
    curCh = ch; searchClose();
    const paras = renderContent(ch.content), onlyImg = imgOnly(ch.content);
    const title = onlyImg ? "" : `<h2 class="rch">${esc(ch.title || curTitle())}</h2>`;     // chương chỉ có ảnh (minh họa): bỏ tiêu đề, ảnh nằm giữa trang
    if (isPage()) {
      scroll.className = "rscroll hm";
      scroll.innerHTML = `<div class="hclip fi"><div class="hcols">${title}${paras}</div></div>`;
      hclip = $(".hclip", scroll); hcols = $(".hcols", scroll); text = hcols;
      layoutH(p, atEnd);          // mỗi ảnh là một trang cao cố định nên không phụ thuộc lúc ảnh tải xong, không bị nhảy trang
    } else {
      scroll.className = "rscroll"; hclip = hcols = null; pgnum.hidden = true;
      scroll.style.setProperty("--sh", Math.max(300, scroll.clientHeight - 40) + "px");
      scroll.innerHTML = `<div class="rbody">${title}<div class="rtext">${paras}</div><div class="rend">${idx < toc.length - 1 ? `<button class="btn solid" id="en">Chương sau →</button>` : `<p class="empty">Hết truyện</p>`}</div></div>`;
      text = $(".rtext", scroll); scroll.scrollTop = 0;
      if (p) { const t = $(`[data-p="${p}"]`, text); if (t) t.scrollIntoView({ block: "start" }); }
      if ($("#en", el)) $("#en", el).onclick = () => goTo(idx + 1);
      updProg();
    }
    try { tts.rewrap(); } catch {}
    markBm();
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
    const nPf = +cfg.prefetch || 0;
    if (nPf > 1 && wifiOk()) (async () => { for (let k = 2; k <= nPf; k++) { const nc = toc[i + k]; if (!nc || !el.isConnected || my !== tok) break; try { await getChapter(story.id, nc.position); } catch { break; } await new Promise(r => setTimeout(r, 600)); } })();
    return true;
  }
  async function goTo(i, o = {}) {
    if (i < 0 || i >= toc.length) return false;
    const was = o.play || tts.playing;
    tts.halt(was);
    const ok = await load(i, o.p || 0, !!o.end);
    if (ok && was) tts.start(0); else if (!ok) tts.ui();
    return ok;
  }
  sl.addEventListener("input", () => { sliding = true; const c = toc[+sl.value]; rpch.textContent = c ? c.title : ""; });
  sl.addEventListener("change", () => { sliding = false; const i = +sl.value; if (i !== idx) goTo(i); else updProg(); });
  $("#bp", el).onclick = () => goTo(idx - 1);
  $("#bn", el).onclick = () => goTo(idx + 1);
  $("#bt", el).onclick = () => {
    const s = openSheet(`<h3>Mục lục</h3><div class="seg" id="tsg"><button data-t="c" class="on">Chương</button><button data-t="b" id="tbb"></button></div><div id="tl"></div>`);
    sheetEl.dataset.theme = el.dataset.theme;
    const nb = () => (bm[story.id] || []).length;
    const drawC = () => {
      $("#tl", s).innerHTML = toc.map((c, i) => `<div class="ch ${i === idx ? "cur" : ""}" data-i="${i}"><span>${esc(c.title)}</span>${dl[story.id] && dl[story.id].have.includes(c.position) ? "<i>✓</i>" : ""}</div>`).join("");
      $$(".ch", s).forEach(c => c.onclick = () => { closeSheet(); goTo(+c.dataset.i); });
      const cur = $(".cur", s); if (cur) cur.scrollIntoView({ block: "center" });
    };
    const drawB = () => {
      const l = (bm[story.id] || []).slice().sort((a, b) => a.pos - b.pos || a.p - b.p);
      $("#tl", s).innerHTML = l.length ? l.map((b, i) => `<div class="ch bmi" data-k="${i}"><div><b>${esc(b.ct || "")}</b><small>${esc(b.txt)}</small>${b.note ? `<em>${esc(b.note)}</em>` : ""}</div><button class="x" data-bx="${i}">✕</button></div>`).join("") : `<p class="empty">Chưa có đánh dấu.<br>Giữ lâu một đoạn trong truyện để đánh dấu hoặc ghi chú.</p>`;
      $$(".bmi", s).forEach(c => c.onclick = e => { if (e.target.closest("[data-bx]")) return; const b = l[+c.dataset.k]; closeSheet(); jumpTo(b.pos, b.p); });
      $$("[data-bx]", s).forEach(x => x.onclick = () => { const b = l[+x.dataset.bx]; bm[story.id] = bm[story.id].filter(v => v !== b); if (!bm[story.id].length) delete bm[story.id]; saveBm(); markBm(); $("#tbb", s).textContent = `Đánh dấu (${nb()})`; drawB(); });
    };
    $("#tbb", s).textContent = `Đánh dấu (${nb()})`;
    $$("#tsg button", s).forEach(b => b.onclick = () => { $$("#tsg button", s).forEach(x => x.classList.toggle("on", x === b)); b.dataset.t === "c" ? drawC() : drawB(); });
    drawC();
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
      <div class="stp"><label>Font</label><select id="fn">${fontOpts()}</select></div>
      <div class="stp"><label>Lọc ánh sáng xanh</label><input id="wm" type="range" min="0" max="100" step="5" value="${cfg.warm || 0}"></div>
      <div class="chips"><button class="chip ${cfg.warmAuto ? "on" : ""}" id="wma">Tự bật 19h–6h</button><button class="chip ${cfg.awake !== false ? "on" : ""}" id="awk">Giữ màn hình sáng</button><button class="chip ${cfg.edge !== false ? "on" : ""}" id="edg">Chạm mép lật trang</button></div>
      <div class="stp"><label>Tải trước chương (Wi-Fi)</label><select id="rpf"><option value="0">Tắt</option><option value="2">2 chương</option><option value="5">5 chương</option><option value="10">10 chương</option></select></div>
      <div class="stp"><label>Tự cuộn</label><input id="aus" type="range" min="10" max="200" step="5" value="${cfg.auto || 40}"><button class="chip" id="aub">${autoOn ? "Dừng" : "Bắt đầu"}</button></div>`);
    $("#rpf", s).value = String(cfg.prefetch || 0); $("#rpf", s).onchange = e => { cfg.prefetch = +e.target.value; saveCfg(); };
    $("#wm", s).oninput = e => { cfg.warm = +e.target.value; applyRead(); };
    $("#wm", s).onchange = () => saveCfg();
    $("#wma", s).onclick = e => { cfg.warmAuto = !cfg.warmAuto; if (cfg.warmAuto && !cfg.warm) { cfg.warm = 40; $("#wm", s).value = 40; } saveCfg(); applyRead(); e.target.classList.toggle("on", cfg.warmAuto); };
    $("#awk", s).onclick = e => { cfg.awake = cfg.awake === false; saveCfg(); keepOn(); e.target.classList.toggle("on", cfg.awake !== false); };
    $("#edg", s).onclick = e => { cfg.edge = cfg.edge === false; saveCfg(); e.target.classList.toggle("on", cfg.edge !== false); };
    $("#aus", s).oninput = e => { cfg.auto = +e.target.value; };
    $("#aus", s).onchange = () => saveCfg();
    $("#aub", s).onclick = () => { if (autoOn) { autoOn = false; cancelAnimationFrame(autoRaf); toast("Đã dừng tự cuộn"); closeSheet(); return; } closeSheet(); el.classList.add("hide"); autoStart(); };
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

  // ---- Sách nói ----
  const web = !native && "speechSynthesis" in window ? window.speechSynthesis : null;
  const tts = (() => {
    const pl = $("#tpl", el), vs = $("#tv", el), rs = $("#tr", el), ss = $("#ts", el), st = $("#tst", el);
    let chunks = [], pos = 0, gen = 0, sleepT = null, sleepCh = 0, hl = -2, webVoices = [], since = 0, flushT = null;
    const wrapped = new Map();
    let seeking = false, moved = 0;
    const tsk = $("#tsk", el);
    const cnt = () => {
      $("#tcnt", el).textContent = chunks.length ? `${pos + 1}/${chunks.length}` : "";
      if (!seeking) tsk.value = chunks.length > 1 ? Math.round(pos / (chunks.length - 1) * 1000) : 0;
    };
    tsk.addEventListener("input", () => { seeking = true; if (chunks.length > 1) $("#tcnt", el).textContent = `${Math.round(tsk.value / 1000 * (chunks.length - 1)) + 1}/${chunks.length}`; });
    tsk.addEventListener("change", () => { seeking = false; if (chunks.length > 1) T.start(Math.round(tsk.value / 1000 * (chunks.length - 1))); else cnt(); });
    $("#ptt", el).textContent = story.title; $("#pau", el).textContent = (story.authors || []).join(", ") || story.author || "";
    $("#tcv", el).src = img(story.cover, 700); $("#bimg", el).src = img(story.cover, 200);
    const tlab = () => { $("#tsl", el).textContent = ss.value === "0" ? "Hẹn giờ" : ss.value[0] === "c" ? ss.selectedOptions[0].text.replace("Sau ", "") : ss.value + " phút"; };
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
      const sk = skipFn(), pr = pronFn();
      const l = []; const t = curTitle().trim(); if (t) l.push({ t, p: -1, s: pr(t) });
      $$("p[data-p]", text).forEach(p => {
        const raw = p.textContent.replace(/\s+/g, " ").trim();
        if (sk(raw)) return;
        split(raw).forEach(x => { if (/[\p{L}\p{N}]/u.test(x)) l.push({ t: x, p: +p.dataset.p, s: pr(x) }); });
      });
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
      else { const r = e.getBoundingClientRect(), s = scroll.getBoundingClientRect(), pb = 90; if (r.top < s.top + 70 || r.bottom > s.bottom - pb) e.scrollIntoView({ block: "center", behavior: "smooth" }); }
    };
    T.rewrap = () => { if (!chunks.length) return; wrap(); if (hl >= 0) hi(hl); };
    T.active = () => T.playing || !ttsEl.hidden;
    T.ui = () => { pl.innerHTML = T.playing ? ICON.pause : ICON.play; $("#bpp", el).innerHTML = T.playing ? ICON.pause : ICON.play; $("#bh", el).style.color = ttsEl.hidden ? "" : "var(--accent)"; cnt(); updateMini(); };
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
      if (native) return native.speak(JSON.stringify(chunks.map(c => c.s || c.t)), from, cfg.rate, gen, story.title, curTitle(), imgFull(story.cover, 400));
      web.cancel(); const g = gen;
      const at = i => {
        if (g !== gen || !T.playing) return;
        if (i >= chunks.length) return T.finished();
        pos = i; hi(i); cnt(); flush();
        const u = new SpeechSynthesisUtterance(chunks[i].s || chunks[i].t); u.lang = "vi-VN"; u.rate = cfg.rate;
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
      searchClose(); pos = Math.min(Math.max(0, from), chunks.length - 1); gen++; T.playing = true; since = Date.now(); st.textContent = ""; T.ui(); engineStart(pos); music.start();
      clearInterval(flushT); flushT = setInterval(flush, 15000);
    };
    T.pause = () => { flush(); since = 0; T.playing = false; gen++; music.pause(); if (native) native.pause(); else if (web) web.cancel(); T.ui(); };
    T.halt = silent => { flush(); since = 0; T.playing = false; gen++; unwrap(); chunks = []; if (!silent) { music.pause(); if (native) native.pause(); else if (web) web.cancel(); } hi(-1); hl = -2; };
    T.stopAll = () => {
      T.halt(true); if (native) native.stop(); else if (web) web.cancel(); clearTimeout(sleepT); sleepT = null; sleepCh = 0; music.pause(); clearInterval(flushT); ss.value = "0"; tlab(); ttsEl.hidden = true; $(".ply-more", el).hidden = true; T.ui();
    };
    T.finished = async () => {
      hi(-1); hl = -2; flush();
      if (idx >= toc.length - 1) { T.pause(); st.textContent = "Đã hết truyện"; return; }
      const stop = sleepCh > 0 && --sleepCh === 0;
      st.textContent = "Đang chuyển chương..."; chunks = []; T.playing = false; gen++;
      if (stop) { music.pause(); ss.value = "0"; tlab(); await goTo(idx + 1); st.textContent = "Đã hết giờ hẹn"; T.ui(); return; }
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
    const more = $(".ply-more", el);
    const openMore = k => {
      if (!more.hidden && more.dataset.k === k) { more.hidden = true; return; }
      more.hidden = false; more.dataset.k = k; $(".m-spd", more).hidden = k !== "spd"; $(".m-set", more).hidden = k !== "set";
    };
    $("#tspd", el).onclick = () => openMore("spd");
    $("#tset", el).onclick = () => openMore("set");
    $("#ptoc", el).onclick = () => $("#bt", el).click();
    $("#tx", el).onclick = () => { T.stopAll(); if (bg === el) closeBg(); };
    const rv = $("#trv", el);
    const setRate = v => { cfg.rate = clampRate(v); rs.value = String(cfg.rate); rv.textContent = fmtRate(cfg.rate); $("#tspv", el).textContent = cfg.rate.toFixed(2).replace(".", ",") + "x"; };
    setRate(cfg.rate);
    rs.oninput = () => setRate(rs.value);                                   // kéo: chỉ cập nhật số hiển thị
    rs.onchange = () => { saveCfg(); if (T.playing) T.start(pos); };        // thả tay: áp dụng ngay
    let nudgeT;
    const nudge = d => { setRate(cfg.rate + d); saveCfg(); clearTimeout(nudgeT); nudgeT = setTimeout(() => { if (T.playing) T.start(pos); }, 450); };
    $("#trm", el).onclick = () => nudge(-0.01);
    $("#trp", el).onclick = () => nudge(0.01);
    vs.onchange = () => { cfg.voice = vs.value; saveCfg(); if (native) native.setVoice(vs.value); if (T.playing) T.start(pos); };
    ss.onchange = () => { clearTimeout(sleepT); sleepCh = ss.value[0] === "c" ? +ss.value.slice(1) : 0; const m = +ss.value; tlab(); if (m > 0) sleepT = setTimeout(() => { T.pause(); st.textContent = "Đã hết giờ hẹn"; ss.value = "0"; tlab(); }, m * 60000); };
    // ---- bong bóng thu nhỏ: kéo đi khắp màn hình, tự dính cạnh; chạm ảnh bìa để mở lại trình phát ----
    const bub = $(".tbub", el); let bubT = 0;
    if (cfg.bubY) bub.style.top = cfg.bubY + "px";
    const dockSoon = () => { clearTimeout(bubT); bubT = setTimeout(() => bub.classList.add("dock"), 3500); };
    const setMin = v => { ttsEl.classList.toggle("min", v); if (v) { bub.classList.remove("dock"); dockSoon(); } else clearTimeout(bubT); };
    T.collapse = () => { if (ttsEl.hidden || ttsEl.classList.contains("min")) return false; setMin(true); return true; };
    $("#tdn", el).onclick = () => setMin(true);
    $("#bcv", el).onclick = () => { if (bub.classList.contains("dock")) { bub.classList.remove("dock"); dockSoon(); } else setMin(false); };
    $("#bpp", el).onclick = () => { dockSoon(); T.toggle(); };
    $("#bnx", el).onclick = () => { dockSoon(); $("#tn", el).click(); };
    $("#bcl", el).onclick = () => $("#tx", el).click();
    (() => {
      let d = null;
      bub.addEventListener("touchstart", e => { if (e.touches.length !== 1) return; const t = e.touches[0], r = bub.getBoundingClientRect(); d = { x: t.clientX, y: t.clientY, l: r.left, t: r.top, on: false }; }, { passive: true });
      bub.addEventListener("touchmove", e => {
        if (!d) return; const t = e.touches[0], dx = t.clientX - d.x, dy = t.clientY - d.y;
        if (!d.on) { if (Math.hypot(dx, dy) < 8) return; d.on = true; bub.style.transition = "none"; bub.classList.remove("dock"); clearTimeout(bubT); }
        e.preventDefault(); const pr = el.getBoundingClientRect();
        bub.style.left = Math.max(0, Math.min(pr.width - bub.offsetWidth, d.l - pr.left + dx)) + "px"; bub.style.right = "auto";
        bub.style.top = Math.max(70, Math.min(pr.height - 130, d.t - pr.top + dy)) + "px";
      }, { passive: false });
      const end = () => {
        const x = d; d = null; if (!x || !x.on) return; moved = Date.now();
        const pr = el.getBoundingClientRect(), r = bub.getBoundingClientRect(), left = r.left + r.width / 2 < pr.left + pr.width / 2, top = bub.style.top;
        const near = left ? r.left - pr.left < 48 : pr.right - r.right < 48;      // kéo sát mép màn hình thì thu lại ngay
        bub.style.transition = ""; bub.style.left = ""; bub.style.right = ""; bub.classList.toggle("l", left); bub.classList.toggle("r", !left); bub.style.top = top;
        cfg.bubY = parseInt(top); saveCfg();
        if (near) { clearTimeout(bubT); bub.classList.add("dock"); } else dockSoon();
      };
      bub.addEventListener("touchend", end); bub.addEventListener("touchcancel", end);
      bub.addEventListener("click", ev => { if (Date.now() - moved < 350) { ev.stopPropagation(); ev.preventDefault(); } }, true);
    })();
    const showPanel = collapsed => {
      if (!native && !web) { toast("Máy không hỗ trợ đọc truyện"); return false; }
      ttsEl.hidden = false; setMin(!!collapsed);
      if (native) {
        native.requestNotificationPermission();
        if (!native.hasGoogleTts() && confirm("Máy chưa cài Google TTS (giọng chị Google).\nMở Google Play để cài?")) { native.installGoogleTts(); ttsEl.hidden = true; return false; }
      }
      return true;
    };
    $("#bh", el).onclick = () => {
      if (!ttsEl.hidden) { if (ttsEl.classList.contains("min")) setMin(false); else T.stopAll(); return; }
      if (!showPanel(false)) return;
      T.start(T.visibleIdx());
    };
    T.ensure = () => { if (!text) return false; if (!chunks.length) { chunks = build(); wrap(); } return chunks.length > 0; };
    T.indexAt = (x, y, pIdx) => {
      const e0 = document.elementFromPoint(x, y), sp = e0 && e0.closest && e0.closest(".ts");
      if (sp && text.contains(sp)) return +sp.dataset.c;
      const i = chunks.findIndex(c => c.p >= pIdx && c.p >= 0); return i < 0 ? 0 : i;
    };
    T.startAt = i => { if (ttsEl.hidden && !showPanel(true)) return; T.start(i); };
    T.rebuild = () => {              // đổi quy tắc phát âm / bỏ qua đoạn
      if (!chunks.length) return; const cp = chunks[pos] ? chunks[pos].p : -1, was = T.playing;
      unwrap(); chunks = build(); wrap(); let ni = chunks.findIndex(c => c.p >= cp && c.p >= 0); if (ni < 0) ni = 0; pos = ni; cnt();
      if (was) T.start(ni);
    };
    window.__ttsRules = () => T.rebuild();
    $("#tmus", el).onclick = () => openMusic(el.dataset.theme);
    if ($("#ttsdev", el)) $("#ttsdev", el).onclick = () => { try { AndroidTTS.openSettings(); } catch {} };
    $("#trule", el).onclick = () => openTtsRules(el.dataset.theme);
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

  el._api = { title: () => story.title, ch: curTitle, playing: () => tts.playing, toggle: () => tts.toggle(), collapse: () => tts.collapse(), relayout: () => { setRbh(); relayout(true); } };
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
  const keepOn = () => { try { if (native && window.AndroidApp && AndroidApp.keepScreenOn) AndroidApp.keepScreenOn(cfg.awake !== false); } catch {} };
  keepOn(); const warmT = setInterval(() => { if (el.isConnected) applyRead(); }, 60000);
  const prevClose = el.onclose; el.onclose = () => { clearInterval(warmT); autoOn = false; cancelAnimationFrame(autoRaf); try { if (native && window.AndroidApp && AndroidApp.keepScreenOn) AndroidApp.keepScreenOn(false); } catch {} delete window.__ttsRules; if (prevClose) prevClose(); };
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
