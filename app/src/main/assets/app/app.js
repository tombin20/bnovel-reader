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
const native = window.AndroidTTS || null;

let cfg = Object.assign({ base: BASE0, theme: "dark", size: 19, font: "serif", lh: 1.8, mode: "scroll", rate: 1, voice: "" }, ls.get("cfg", {}));
const saveCfg = () => ls.set("cfg", cfg);
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
  clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 2600);
}
function applyTheme() {
  const r = document.documentElement;
  r.dataset.theme = cfg.theme;
  r.style.setProperty("--size", cfg.size + "px");
  r.style.setProperty("--lh", cfg.lh);
  r.style.setProperty("--font", cfg.font === "sans" ? "system-ui,'Be Vietnam Pro',sans-serif" : "'Noto Serif',Georgia,'Times New Roman',serif");
}
applyTheme();
const swatches = cur => THEMES.map(([k, c]) => `<button data-th="${k}" class="${cur === k ? "on" : ""}" style="background:${c}" aria-label="${k}"></button>`).join("");

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
const stack = []; let tab = "lib", sheetEl = null, bg = null;
function push(el) { el.classList.add("screen"); app.append(el); stack.push(el); updateMini(); return el; }
function pop() { const el = stack.pop(); if (el) { if (el.onclose) el.onclose(); el.remove(); } updateMini(); }
function openSheet(html) {
  closeSheet();
  sheetEl = h(`<div class="back"><div class="sheet">${html}</div></div>`);
  sheetEl.addEventListener("click", e => { if (e.target === sheetEl) closeSheet(); });
  document.body.append(sheetEl); return $(".sheet", sheetEl);
}
function closeSheet() { if (sheetEl) { sheetEl.remove(); sheetEl = null; } }
window.__back = () => {
  if (sheetEl) { closeSheet(); return true; }
  const t = stack[stack.length - 1];
  if (t) { if (t._leave) t._leave(); else pop(); return true; }
  if (tab !== "lib") { go("lib"); return true; }
  return false;
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
  ({ lib: renderLib, home: renderHome, genre: renderGenres, stat: renderStats, set: renderSettings })[t]();
}
$("#tabs").addEventListener("click", e => { const b = e.target.closest("[data-tab]"); if (b) { while (stack.length) pop(); go(b.dataset.tab); } });
$("#syncb").onclick = () => sync(true);
app.addEventListener("click", e => {
  const c = e.target.closest("[data-id]"); if (c && !e.target.closest("[data-del]")) openStory(+c.dataset.id);
  const r = e.target.closest("[data-resume]"); if (r && !e.target.closest("[data-del]")) resume(+r.dataset.resume);
});

const card = (s, mode) => `<button class="card" ${mode === "resume" ? `data-resume="${s.id}"` : `data-id="${s.id}"`}><div class="cvw"><img class="cv" loading="lazy" src="${esc(img(s.cover, 400))}" alt="">
  <span class="bd">${fav.some(f => f.id === s.id) ? "♥" : ""}${dl[s.id] ? "⬇" : ""}</span></div><b>${esc(s.title)}</b>
  <small>${esc(s.ct || (s.chapters ? s.chapters + " chương" : ""))}</small></button>`;
const grid = (l, mode) => l.map(s => card(s, mode)).join("");

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
  for (const p of d.have) { try { await chDel(id + ":" + p); } catch {} }
  const keep = new Set(); Object.values(dl).forEach(x => { if (x !== d) (x.imgs || []).forEach(n => keep.add(n)); });
  const del = (d.imgs || []).filter(n => !keep.has(n));
  del.forEach(n => imgHave.delete(n)); saveImgs();
  if (native && del.length) AndroidHttp.deleteImages(JSON.stringify(del));
  delete dl[id]; ls.set("dl", dl);
}

// ---------- Khám phá ----------
async function renderHome() {
  view.innerHTML = `<div class="search"><input id="q" type="search" placeholder="Tìm truyện..."></div><div id="list" class="grid"><p class="load">Đang tải...</p></div>`;
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
  const el = push(h(`<div><div class="bar"><button class="bk">←</button><b>${esc(title)}</b></div><div class="body"><div class="grid"><p class="load">Đang tải...</p></div></div></div>`));
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
    <h4>Giao diện</h4><div class="themes">${swatches(cfg.theme)}</div>
    <h4>Chữ khi đọc</h4>
    <div class="r"><label>Chế độ đọc</label><select id="md"><option value="scroll">Cuộn dọc</option><option value="page">Vuốt ngang (lật trang)</option></select></div>
    <div class="r"><label>Cỡ chữ: <span id="sv">${cfg.size}</span>px</label><input id="sz" type="range" min="14" max="30" value="${cfg.size}"></div>
    <div class="r"><label>Giãn dòng: <span id="lv">${cfg.lh}</span></label><input id="lh" type="range" min="1.4" max="2.4" step="0.1" value="${cfg.lh}"></div>
    <div class="r"><label>Font</label><select id="fn"><option value="serif">Có chân (Noto Serif)</option><option value="sans">Không chân</option></select></div>
    <h4>Sách nói</h4>
    <div class="r"><label>Tốc độ mặc định</label><select id="rt">${[0.75, 0.9, 1, 1.15, 1.3, 1.5, 2].map(v => `<option value="${v}">${v}x</option>`).join("")}</select></div>
    ${native ? `<div class="r"><button class="btn" id="ttsset">Cài đặt giọng nói của máy</button></div>` : ""}
    <h4>Máy chủ</h4>
    <div class="r"><input id="bs" style="flex:1" value="${esc(cfg.base)}"></div>
    <div class="r"><button class="btn" id="bsok">Lưu địa chỉ</button><button class="btn" id="bsrs">Mặc định</button></div>
    <h4>Dữ liệu</h4>
    <div class="r"><button class="btn danger" id="clr">Xóa toàn bộ truyện đã tải</button></div>
    <div class="r"><button class="btn danger" id="clrst">Xóa thống kê</button></div>
    <p class="empty">B-novel Reader 2.0</p></div>`;
  $("#fn").value = cfg.font; $("#rt").value = String(cfg.rate); $("#md").value = cfg.mode;
  $$("[data-th]", view).forEach(b => b.onclick = () => { cfg.theme = b.dataset.th; saveCfg(); applyTheme(); renderSettings(); });
  $("#sz").oninput = e => { cfg.size = +e.target.value; $("#sv").textContent = cfg.size; saveCfg(); applyTheme(); };
  $("#lh").oninput = e => { cfg.lh = +e.target.value; $("#lv").textContent = cfg.lh; saveCfg(); applyTheme(); };
  $("#fn").onchange = e => { cfg.font = e.target.value; saveCfg(); applyTheme(); };
  $("#md").onchange = e => { cfg.mode = e.target.value; saveCfg(); };
  $("#rt").onchange = e => { cfg.rate = +e.target.value; saveCfg(); };
  if ($("#ttsset")) $("#ttsset").onclick = () => AndroidTTS.openSettings();
  if ($("#syncnow")) $("#syncnow").onclick = () => sync(true);
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
async function openStory(id) {
  const el = push(h(`<div><div class="bar"><button class="bk">←</button><b>Truyện</b></div><div class="body"><p class="load">Đang tải...</p></div></div>`));
  $(".bk", el).onclick = pop;
  const body = $(".body", el);
  let s, toc;
  try { [s, toc] = await Promise.all([api("/api/story?id=" + id).then(r => r.story), getToc(id)]); }
  catch (e) { if (dl[id]) { s = dl[id].story; toc = dl[id].chapters; } else { body.innerHTML = `<p class="err">${esc(e.message)}</p>`; return; } }
  let desc = true, asc = true;
  const draw = () => {
    const d = dl[id], have = new Set(d ? d.have : []), hs = hist[id], isFav = fav.some(f => f.id === id), job = jobs[id];
    const list = asc ? toc : [...toc].reverse();
    body.innerHTML = `<div class="dhead"><img src="${esc(img(s.cover, 400))}" alt=""><div><h2>${esc(s.title)}</h2>
      ${(s.authors || []).length ? `<p>Tác giả: ${esc(s.authors.join(", "))}</p>` : ""}
      ${(s.illustrators || []).length ? `<p>Họa sĩ: ${esc(s.illustrators.join(", "))}</p>` : ""}
      ${s.series ? `<p>Series: ${esc(s.series)}</p>` : ""}<p>${esc(s.status || "")} · ${toc.length} chương</p></div></div>
      <div class="acts"><button class="btn solid" id="read">${hs ? "▶ Đọc tiếp" : "▶ Đọc"}</button>
      <button class="btn" id="fv">${isFav ? "♥ Đang theo dõi" : "♡ Theo dõi"}</button>
      <button class="btn" id="dlb">${job ? "⏹ Đang tải " + (d ? d.have.length : 0) + "/" + toc.length : d && d.have.length >= toc.length ? "✓ Đã tải" : "⬇ Tải xuống"}</button>
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
  el.onclose = () => { if (tab === "lib") renderLib(); };
  draw();
}
// Tải offline: toàn bộ chữ + ảnh (ảnh lưu vào bộ nhớ máy)
async function startDownload(s, toc, redraw) {
  const id = s.id;
  if (jobs[id]) { jobs[id].cancel = true; return; }
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
  const el = push(h(`<div class="rd hide">
    <div class="rtop bar"><button class="bk">←</button><b class="rt"></b></div>
    <div class="rscroll"></div><div class="pgnum" hidden></div>
    <div class="tts" hidden>
      <div class="tr"><button id="tp">⏮</button><button id="tpl" class="pl">▶</button><button id="tn">⏭</button>
        <select id="tr">${[0.75, 0.9, 1, 1.15, 1.3, 1.5, 2].map(v => `<option value="${v}">${v}x</option>`).join("")}</select>
        <select id="ts"><option value="0">⏲ Tắt</option><option value="15">15 phút</option><option value="30">30 phút</option><option value="60">60 phút</option><option value="90">90 phút</option></select>
        <button id="tx">✕</button></div>
      <div class="tr tr2"><select id="tv"></select><small id="tst"></small></div>
    </div>
    <div class="rbot"><button id="bp">‹</button><button id="bt">☰</button><button id="ba">Aa</button><button id="bm"></button><button id="bh">🎧</button><button id="bn">›</button></div>
  </div>`));
  const scroll = $(".rscroll", el), ttsEl = $(".tts", el), pgnum = $(".pgnum", el);
  let text = null, hclip = null, hcols = null, W = 300, H = 400, page = 0, pages = 1, curCh = null;
  let idx = startIdx, tok = 0, saveT, lastAct = Date.now(), swipedAt = 0;
  const curTitle = () => toc[idx] ? toc[idx].title : "";
  const isPage = () => cfg.mode === "page";
  const show = () => el.classList.toggle("hide");
  const modeLabel = () => { $("#bm", el).textContent = isPage() ? "⇆" : "⇅"; };
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
  scroll.addEventListener("scroll", () => { if (isPage()) return; clearTimeout(saveT); saveT = setTimeout(() => saveHist(), 400); }, { passive: true });

  // ---- lật trang ngang ----
  function pageOf(elm) {
    const r = elm.getClientRects()[0]; if (!r || !hclip) return 0;
    const cr = hclip.getBoundingClientRect();
    return Math.floor((r.left - cr.left + hclip.scrollLeft) / W + 0.001);
  }
  function hGo(n) {
    page = Math.max(0, Math.min(pages - 1, n));
    hclip.scrollLeft = page * W;
    pgnum.textContent = `${page + 1} / ${pages}  ·  ${curTitle()}`;
    clearTimeout(saveT); saveT = setTimeout(() => saveHist(), 400);
  }
  function layoutH(p, atEnd) {
    W = Math.max(200, Math.min(scroll.clientWidth - 32, 720)); H = Math.max(200, scroll.clientHeight - 64);
    hclip.style.cssText = `width:${W}px;height:${H}px;margin:24px auto 0`;
    hcols.style.cssText = `height:${H}px;column-width:${W}px;column-gap:0;--hh:${H}px`;
    pages = Math.max(1, Math.round(hclip.scrollWidth / W));
    let n = 0;
    if (atEnd) n = pages - 1;
    else if (p) { const t = $(`[data-p="${p}"]`, hcols); if (t) n = pageOf(t); }
    pgnum.hidden = false; hGo(n);
  }
  const hNext = () => { if (page < pages - 1) hGo(page + 1); else if (idx < toc.length - 1) goTo(idx + 1); else toast("Hết truyện"); };
  const hPrev = () => { if (page > 0) hGo(page - 1); else if (idx > 0) goTo(idx - 1, { end: true }); };

  scroll.addEventListener("click", e => {
    if (e.target.closest("button") || Date.now() - swipedAt < 350) return;
    if (isPage()) { const x = e.clientX / window.innerWidth; if (x < 0.3) hPrev(); else if (x > 0.7) hNext(); else show(); }
    else show();
  });
  let tx0 = 0, ty0 = 0;
  scroll.addEventListener("touchstart", e => { tx0 = e.touches[0].clientX; ty0 = e.touches[0].clientY; }, { passive: true });
  scroll.addEventListener("touchend", e => {
    if (!isPage()) return;
    const dx = e.changedTouches[0].clientX - tx0, dy = e.changedTouches[0].clientY - ty0;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) { swipedAt = Date.now(); dx < 0 ? hNext() : hPrev(); }
  }, { passive: true });
  ["touchstart", "click", "scroll"].forEach(ev => el.addEventListener(ev, () => { lastAct = Date.now(); }, { capture: true, passive: true }));

  // ---- vẽ chương ----
  function paint(ch, p, atEnd) {
    curCh = ch;
    const paras = renderContent(ch.content), title = esc(ch.title || curTitle());
    if (isPage()) {
      scroll.className = "rscroll hm";
      scroll.innerHTML = `<div class="hclip"><div class="hcols"><h2 class="rch">${title}</h2>${paras}</div></div>`;
      hclip = $(".hclip", scroll); hcols = $(".hcols", scroll); text = hcols;
      layoutH(p, atEnd);
      $$("img", hcols).forEach(i => i.addEventListener("load", () => relayout(true), { once: true }));
    } else {
      scroll.className = "rscroll"; hclip = hcols = null; pgnum.hidden = true;
      scroll.innerHTML = `<div class="rbody"><h2 class="rch">${title}</h2><div class="rtext">${paras}</div><div class="rend">${idx < toc.length - 1 ? `<button class="btn solid" id="en">Chương sau →</button>` : `<p class="empty">Hết truyện</p>`}</div></div>`;
      text = $(".rtext", scroll); scroll.scrollTop = 0;
      if (p) { const t = $(`[data-p="${p}"]`, text); if (t) t.scrollIntoView({ block: "start" }); }
      if ($("#en", el)) $("#en", el).onclick = () => goTo(idx + 1);
    }
  }
  function relayout(keepPage) {
    if (!curCh || !text) return;
    if (isPage() && keepPage && hclip) { const p = anchorH(); const pc = page; layoutH(p); if (!p) hGo(pc); }
    else paint(curCh, currentP());
  }
  let rsT; const onResize = () => { clearTimeout(rsT); rsT = setTimeout(() => relayout(), 200); };
  window.addEventListener("resize", onResize);

  async function load(i, p = 0, atEnd = false) {
    const my = ++tok; idx = i; curCh = null; text = null;
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
  $("#bp", el).onclick = () => goTo(idx - 1);
  $("#bn", el).onclick = () => goTo(idx + 1);
  $("#bt", el).onclick = () => {
    const s = openSheet(`<h3>Danh sách chương</h3>${toc.map((c, i) => `<div class="ch ${i === idx ? "cur" : ""}" data-i="${i}"><span>${esc(c.title)}</span>${dl[story.id] && dl[story.id].have.includes(c.position) ? "<i>✓</i>" : ""}</div>`).join("")}`);
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
    const s = openSheet(`<h3>Cài đặt đọc</h3><div class="themes">${swatches(cfg.theme)}</div>
      <div class="stp"><label>Chế độ</label><select id="md"><option value="scroll">Cuộn dọc</option><option value="page">Vuốt ngang</option></select></div>
      <div class="stp"><label>Cỡ chữ</label><button id="s1">−</button><b id="sv">${cfg.size}</b><button id="s2">+</button></div>
      <div class="stp"><label>Giãn dòng</label><button id="l1">−</button><b id="lv">${cfg.lh}</b><button id="l2">+</button></div>
      <div class="stp"><label>Font</label><select id="fn"><option value="serif">Có chân</option><option value="sans">Không chân</option></select></div>`);
    $("#fn", s).value = cfg.font; $("#md", s).value = cfg.mode;
    const upd = () => { saveCfg(); applyTheme(); $("#sv", s).textContent = cfg.size; $("#lv", s).textContent = cfg.lh; setTimeout(() => relayout(), 30); };
    $("#s1", s).onclick = () => { cfg.size = Math.max(14, cfg.size - 1); upd(); };
    $("#s2", s).onclick = () => { cfg.size = Math.min(30, cfg.size + 1); upd(); };
    $("#l1", s).onclick = () => { cfg.lh = Math.max(1.4, +(cfg.lh - 0.1).toFixed(1)); upd(); };
    $("#l2", s).onclick = () => { cfg.lh = Math.min(2.4, +(cfg.lh + 0.1).toFixed(1)); upd(); };
    $("#fn", s).onchange = e => { cfg.font = e.target.value; upd(); };
    $("#md", s).onchange = e => { lastP = currentP(); cfg.mode = e.target.value; saveCfg(); modeLabel(); if (curCh) paint(curCh, lastP); };
    $$("[data-th]", s).forEach(b => b.onclick = () => { cfg.theme = b.dataset.th; saveCfg(); applyTheme(); $$("[data-th]", s).forEach(x => x.classList.toggle("on", x === b)); });
  };

  // ---- Sách nói ----
  const web = !native && "speechSynthesis" in window ? window.speechSynthesis : null;
  const tts = (() => {
    const pl = $("#tpl", el), vs = $("#tv", el), rs = $("#tr", el), ss = $("#ts", el), st = $("#tst", el);
    let chunks = [], pos = 0, gen = 0, sleepT = null, hl = -2, webVoices = [], since = 0, flushT = null;
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
    const hi = p => {
      if (p === hl) return; $$(".tts-on", text || scroll).forEach(e => e.classList.remove("tts-on")); hl = p;
      const e = p >= 0 && text && $(`p[data-p="${p}"]`, text); if (!e) return;
      e.classList.add("tts-on");
      if (isPage() && hclip) { const n = pageOf(e); if (n !== page) hGo(n); }
      else { const r = e.getBoundingClientRect(), s = scroll.getBoundingClientRect(); if (r.top < s.top + 70 || r.bottom > s.bottom - 130) e.scrollIntoView({ block: "center", behavior: "smooth" }); }
    };
    T.active = () => T.playing || !ttsEl.hidden;
    T.ui = () => { pl.textContent = T.playing ? "⏸" : "▶"; $("#bh", el).style.color = ttsEl.hidden ? "" : "var(--accent)"; updateMini(); };
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
        pos = i; hi(chunks[i].p); flush();
        const u = new SpeechSynthesisUtterance(chunks[i].t); u.lang = "vi-VN"; u.rate = cfg.rate;
        const v = webVoices.find(x => x.name === vs.value); if (v) u.voice = v;
        u.onend = () => at(i + 1);
        u.onerror = ev => { if (ev.error === "canceled" || ev.error === "interrupted") return; if (g === gen) { T.halt(); T.ui(); st.textContent = "Lỗi đọc"; } };
        web.speak(u);
      };
      at(from);
    };
    T.start = from => {
      if (!text) return;
      flush(); if (!chunks.length) chunks = build();
      if (!chunks.length) { st.textContent = "Chương này chưa có nội dung"; return; }
      pos = Math.min(Math.max(0, from), chunks.length - 1); gen++; T.playing = true; since = Date.now(); st.textContent = ""; T.ui(); engineStart(pos);
      clearInterval(flushT); flushT = setInterval(flush, 15000);
    };
    T.pause = () => { flush(); since = 0; T.playing = false; gen++; if (native) native.pause(); else if (web) web.cancel(); T.ui(); };
    T.halt = silent => { flush(); since = 0; T.playing = false; gen++; chunks = []; if (!silent) { if (native) native.pause(); else if (web) web.cancel(); } hi(-1); hl = -2; };
    T.stopAll = () => {
      T.halt(); if (native) native.stop(); clearTimeout(sleepT); sleepT = null; clearInterval(flushT); ss.value = "0"; ttsEl.hidden = true; T.ui();
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
    $("#tn", el).onclick = () => { const i = paraStart(1); if (i < 0) T.finished(); else T.start(i); };
    $("#tp", el).onclick = () => T.start(paraStart(-1));
    $("#tx", el).onclick = () => { T.stopAll(); if (bg === el) closeBg(); };
    rs.value = String(cfg.rate); if (rs.value !== String(cfg.rate)) rs.value = "1";
    rs.onchange = () => { cfg.rate = +rs.value; saveCfg(); if (T.playing) T.start(pos); };
    vs.onchange = () => { cfg.voice = vs.value; saveCfg(); if (native) native.setVoice(vs.value); if (T.playing) T.start(pos); };
    ss.onchange = () => { clearTimeout(sleepT); const m = +ss.value; if (m > 0) sleepT = setTimeout(() => { T.pause(); st.textContent = "Đã hết giờ hẹn"; ss.value = "0"; }, m * 60000); };
    $("#bh", el).onclick = () => {
      if (!ttsEl.hidden) { T.stopAll(); return; }
      if (!native && !web) { toast("Máy không hỗ trợ đọc truyện"); return; }
      ttsEl.hidden = false; el.classList.remove("hide");
      if (native) {
        native.requestNotificationPermission();
        if (!native.hasGoogleTts() && confirm("Máy chưa cài Google TTS (giọng chị Google).\nMở Google Play để cài?")) { native.installGoogleTts(); ttsEl.hidden = true; return; }
      }
      T.start(0);
    };
    if (native) {
      fillVoices(nativeVoices());
      window.__ttsNative = {
        onStart(g, i) { if (g !== gen || !T.playing) return; pos = i; hi(chunks[i] ? chunks[i].p : -1); flush(); },
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
    if (tts.active()) { const i = stack.indexOf(el); if (i >= 0) stack.splice(i, 1); el.style.display = "none"; bg = el; updateMini(); }
    else pop();
  };
  $(".bk", el).onclick = el._leave;
  el.onclose = () => {
    tts.stopAll(); clearInterval(readT); clearTimeout(saveT); window.removeEventListener("resize", onResize);
    if (curCh) saveHist(); delete window.__ttsNative; updateMini();
    if (tab === "lib" && !stack.length) renderLib();
  };
  load(idx, startP).then(() => { if (!startP) toast(isPage() ? "Chạm mép trái/phải hoặc vuốt để lật trang · chạm giữa để mở menu" : "Chạm vào giữa màn hình để hiện/ẩn menu"); });
}

// ---------- Khởi động ----------
go("lib");
if (acct) sync(false);
})();
