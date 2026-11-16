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
let cfg = Object.assign({ base: BASE0, theme: "dark", size: 19, font: "serif", lh: 1.8, rate: 1, voice: "" }, ls.get("cfg", {}));
const saveCfg = () => ls.set("cfg", cfg);
let fav = ls.get("fav", []);          // [{id,title,cover,chapters}]
let hist = ls.get("hist", {});        // {sid:{id,title,cover,idx,pos,ct,p,t}}
let dl = ls.get("dl", {});            // {sid:{story,chapters,have:[pos]}}
const abs = u => !u ? "" : /^https?:/.test(u) ? u : cfg.base + (u[0] === "/" ? "" : "/") + u;

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

// ---------- HTTP ----------
let hid = 0; const pend = {};
window.__http = (id, status, body) => {
  const p = pend[id]; delete pend[id]; if (!p) return;
  if (status >= 200 && status < 300) { try { p.ok(JSON.parse(body)); } catch { p.err(new Error("Dữ liệu lỗi")); } }
  else p.err(new Error(status ? "Lỗi " + status : "Không kết nối được mạng"));
};
function api(path) {
  const url = cfg.base + path;
  if (window.AndroidHttp) return new Promise((ok, err) => { const id = ++hid; pend[id] = { ok, err }; AndroidHttp.get(id, url); });
  return fetch(url).then(r => { if (!r.ok) throw new Error("Lỗi " + r.status); return r.json(); });
}

// ---------- IndexedDB (chương đã tải) ----------
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

// ---------- Dữ liệu ----------
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
const renderContent = text => String(text || "").split(/\n+/).map(l => l.trim()).filter(Boolean).map((l, i) => {
  const m = l.match(/^!\[\]\((.+)\)$/);
  return m ? `<img data-p="${i}" src="${esc(abs(m[1]))}" alt="">` : `<p data-p="${i}">${esc(l)}</p>`;
}).join("");

// ---------- Điều hướng ----------
const app = $("#app"), view = $("#view");
const stack = []; let tab = "home", sheetEl = null;
function push(el) { el.classList.add("screen"); app.append(el); stack.push(el); return el; }
function pop() { const el = stack.pop(); if (el) { if (el.onclose) el.onclose(); el.remove(); } }
function openSheet(html) {
  closeSheet();
  sheetEl = h(`<div class="back"><div class="sheet">${html}</div></div>`);
  sheetEl.addEventListener("click", e => { if (e.target === sheetEl) closeSheet(); });
  document.body.append(sheetEl); return $(".sheet", sheetEl);
}
function closeSheet() { if (sheetEl) { sheetEl.remove(); sheetEl = null; } }
window.__back = () => {
  if (sheetEl) { closeSheet(); return true; }
  if (stack.length) { pop(); return true; }
  if (tab !== "home") { go("home"); return true; }
  return false;
};

const grid = list => list.map(s => `<button class="card" data-id="${s.id}"><img class="cv" loading="lazy" src="${esc(abs(s.cover))}" alt=""><b>${esc(s.title)}</b><small>${s.chapters ? s.chapters + " chương" : "Chưa có chương"}</small></button>`).join("");
const titles = { home: "B-novel", genre: "Thể loại", lib: "Tủ sách", set: "Cài đặt" };

function go(t) {
  tab = t;
  $("#ttl").textContent = titles[t];
  $$("#tabs button").forEach(b => b.classList.toggle("on", b.dataset.tab === t));
  view.scrollTop = 0;
  ({ home: renderHome, genre: renderGenres, lib: renderLib, set: renderSettings })[t]();
}
$("#tabs").addEventListener("click", e => { const b = e.target.closest("[data-tab]"); if (b) { while (stack.length) pop(); go(b.dataset.tab); } });
app.addEventListener("click", e => {
  const c = e.target.closest("[data-id]"); if (c && !e.target.closest("[data-del]")) openStory(+c.dataset.id);
  const r = e.target.closest("[data-resume]"); if (r) resume(+r.dataset.resume);
});

// ---------- Khám phá ----------
async function renderHome() {
  view.innerHTML = `<div class="search"><input id="q" type="search" placeholder="Tìm truyện..."></div><div id="cont"></div><div id="list" class="grid"><p class="load">Đang tải...</p></div>`;
  const cont = Object.values(hist).sort((a, b) => b.t - a.t).slice(0, 8);
  if (cont.length) $("#cont").innerHTML = `<div class="sec">Đang đọc</div><div class="row">${cont.map(s => `<button class="card" data-resume="${s.id}"><img class="cv" src="${esc(abs(s.cover))}" alt=""><b>${esc(s.title)}</b><small>${esc(s.ct || "")}</small></button>`).join("")}</div><div class="sec">Mới nhất</div>`;
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

// ---------- Tủ sách ----------
let libTab = "fav";
function renderLib() {
  const tabs = [["fav", "Theo dõi"], ["hist", "Lịch sử"], ["dl", "Đã tải"]];
  let body = "";
  if (libTab === "fav") body = fav.length ? `<div class="grid">${grid(fav)}</div>` : `<p class="empty">Chưa theo dõi truyện nào.<br>Mở truyện rồi bấm ♡ để thêm.</p>`;
  if (libTab === "hist") {
    const l = Object.values(hist).sort((a, b) => b.t - a.t);
    body = l.length ? l.map(s => `<div class="li" data-resume="${s.id}"><img src="${esc(abs(s.cover))}" alt=""><div class="t"><b>${esc(s.title)}</b><small>${esc(s.ct || "")}</small></div><button class="x" data-del="${s.id}">✕</button></div>`).join("") : `<p class="empty">Chưa có lịch sử đọc</p>`;
  }
  if (libTab === "dl") {
    const l = Object.values(dl);
    body = l.length ? l.map(d => `<div class="li" data-id="${d.story.id}"><img src="${esc(abs(d.story.cover))}" alt=""><div class="t"><b>${esc(d.story.title)}</b><small>${d.have.length}/${d.chapters.length} chương</small></div><button class="x" data-del="${d.story.id}">🗑</button></div>`).join("") : `<p class="empty">Chưa tải truyện nào.<br>Mở truyện rồi bấm ⬇ để đọc offline.</p>`;
  }
  view.innerHTML = `<div class="chips" style="margin-bottom:12px">${tabs.map(([k, n]) => `<button class="chip ${k === libTab ? "on" : ""}" data-lt="${k}">${n}</button>`).join("")}</div>${body}`;
  $$("[data-lt]", view).forEach(b => b.onclick = () => { libTab = b.dataset.lt; renderLib(); });
  $$("[data-del]", view).forEach(b => b.onclick = async e => {
    e.stopPropagation(); const id = b.dataset.del;
    if (libTab === "hist") { delete hist[id]; ls.set("hist", hist); }
    if (libTab === "dl") { if (!confirm("Xóa các chương đã tải của truyện này?")) return; await deleteDl(id); }
    renderLib();
  });
}
async function deleteDl(id) {
  const d = dl[id]; if (!d) return;
  for (const p of d.have) { try { await chDel(id + ":" + p); } catch {} }
  delete dl[id]; ls.set("dl", dl);
}

// ---------- Cài đặt ----------
function renderSettings() {
  const th = [["dark", "#17191d"], ["black", "#000"], ["sepia", "#f1eadb"], ["light", "#fff"]];
  view.innerHTML = `<div class="set">
    <h4>Giao diện</h4>
    <div class="themes">${th.map(([k, c]) => `<button data-th="${k}" class="${cfg.theme === k ? "on" : ""}" style="background:${c}"></button>`).join("")}</div>
    <h4>Chữ khi đọc</h4>
    <div class="r"><label>Cỡ chữ: <span id="sv">${cfg.size}</span>px</label><input id="sz" type="range" min="14" max="30" value="${cfg.size}"></div>
    <div class="r"><label>Giãn dòng: <span id="lv">${cfg.lh}</span></label><input id="lh" type="range" min="1.4" max="2.4" step="0.1" value="${cfg.lh}"></div>
    <div class="r"><label>Font</label><select id="fn"><option value="serif">Có chân (Noto Serif)</option><option value="sans">Không chân</option></select></div>
    <h4>Sách nói</h4>
    <div class="r"><label>Tốc độ mặc định</label><select id="rt">${[0.75, 0.9, 1, 1.15, 1.3, 1.5, 2].map(v => `<option value="${v}">${v}x</option>`).join("")}</select></div>
    ${window.AndroidTTS ? `<div class="r"><button class="btn" id="ttsset">Cài đặt giọng nói của máy</button></div>` : ""}
    <h4>Máy chủ</h4>
    <div class="r"><input id="bs" style="flex:1" value="${esc(cfg.base)}"></div>
    <div class="r"><button class="btn" id="bsok">Lưu địa chỉ</button><button class="btn" id="bsrs">Mặc định</button></div>
    <h4>Dữ liệu</h4>
    <div class="r"><button class="btn danger" id="clr">Xóa toàn bộ truyện đã tải</button></div>
    <p class="empty">B-novel Reader 1.0</p></div>`;
  $("#fn").value = cfg.font; $("#rt").value = String(cfg.rate);
  $$("[data-th]", view).forEach(b => b.onclick = () => { cfg.theme = b.dataset.th; saveCfg(); applyTheme(); renderSettings(); });
  $("#sz").oninput = e => { cfg.size = +e.target.value; $("#sv").textContent = cfg.size; saveCfg(); applyTheme(); };
  $("#lh").oninput = e => { cfg.lh = +e.target.value; $("#lv").textContent = cfg.lh; saveCfg(); applyTheme(); };
  $("#fn").onchange = e => { cfg.font = e.target.value; saveCfg(); applyTheme(); };
  $("#rt").onchange = e => { cfg.rate = +e.target.value; saveCfg(); };
  if ($("#ttsset")) $("#ttsset").onclick = () => AndroidTTS.openSettings();
  $("#bsok").onclick = () => { cfg.base = $("#bs").value.trim().replace(/\/+$/, "") || BASE0; saveCfg(); storiesCache = null; toast("Đã lưu"); };
  $("#bsrs").onclick = () => { cfg.base = BASE0; saveCfg(); storiesCache = null; renderSettings(); };
  $("#clr").onclick = async () => { if (!confirm("Xóa toàn bộ truyện đã tải?")) return; for (const id of Object.keys(dl)) await deleteDl(id); toast("Đã xóa"); };
}

// ---------- Chi tiết truyện ----------
const jobs = {};
async function openStory(id) {
  const el = push(h(`<div><div class="bar"><button class="bk">←</button><b>Truyện</b></div><div class="body"><p class="load">Đang tải...</p></div></div>`));
  $(".bk", el).onclick = pop;
  const body = $(".body", el);
  let s, toc;
  try {
    [s, toc] = await Promise.all([api("/api/story?id=" + id).then(r => r.story), getToc(id)]);
  } catch (e) {
    if (dl[id]) { s = dl[id].story; toc = dl[id].chapters; }
    else { body.innerHTML = `<p class="err">${esc(e.message)}</p>`; return; }
  }
  let desc = true, asc = true;
  const draw = () => {
    const d = dl[id], have = new Set(d ? d.have : []), hs = hist[id], isFav = fav.some(f => f.id === id), job = jobs[id];
    const list = asc ? toc : [...toc].reverse();
    body.innerHTML = `<div class="dhead"><img src="${esc(abs(s.cover))}" alt=""><div><h2>${esc(s.title)}</h2>
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
    $("#fv", body).onclick = () => { fav = isFav ? fav.filter(f => f.id !== id) : [{ id, title: s.title, cover: s.cover, chapters: toc.length }, ...fav]; ls.set("fav", fav); draw(); };
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
async function startDownload(s, toc, redraw) {
  const id = s.id;
  if (jobs[id]) { jobs[id].cancel = true; return; }
  const d = dl[id] || (dl[id] = { story: { id, title: s.title, cover: s.cover, description: s.description, authors: s.authors, illustrators: s.illustrators, genres: s.genres, status: s.status, series: s.series }, chapters: toc.map(c => ({ position: c.position, title: c.title })), have: [] });
  d.chapters = toc.map(c => ({ position: c.position, title: c.title }));
  const todo = toc.filter(c => !d.have.includes(c.position));
  if (!todo.length) { toast("Đã tải đủ rồi"); return; }
  const job = jobs[id] = { cancel: false }; redraw();
  let failed = 0;
  const worker = async () => {
    while (todo.length && !job.cancel) {
      const c = todo.shift();
      try {
        const ch = (await api(`/api/chapter?story=${id}&pos=${c.position}`)).chapter;
        await chPut(id + ":" + c.position, ch); d.have.push(c.position);
        if (d.have.length % 5 === 0) { ls.set("dl", dl); redraw(); }
      } catch { failed++; if (failed > 5) job.cancel = true; }
    }
  };
  await Promise.all([worker(), worker(), worker()]);
  ls.set("dl", dl); delete jobs[id]; redraw();
  toast(failed > 5 ? "Tải bị gián đoạn, thử lại sau" : job.cancel ? "Đã dừng tải" : "Đã tải xong");
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
  const el = push(h(`<div class="rd hide">
    <div class="rtop bar"><button class="bk">←</button><b class="rt"></b></div>
    <div class="rscroll"><div class="rbody"><h2 class="rch"></h2><div class="rtext"></div><div class="rend"></div></div></div>
    <div class="tts" hidden>
      <div class="tr"><button id="tp">⏮</button><button id="tpl" class="pl">▶</button><button id="tn">⏭</button>
        <select id="tr">${[0.75, 0.9, 1, 1.15, 1.3, 1.5, 2].map(v => `<option value="${v}">${v}x</option>`).join("")}</select>
        <select id="ts"><option value="0">⏲ Tắt</option><option value="15">15 phút</option><option value="30">30 phút</option><option value="60">60 phút</option><option value="90">90 phút</option></select>
        <button id="tx">✕</button></div>
      <div class="tr tr2"><select id="tv"></select><small id="tst"></small></div>
    </div>
    <div class="rbot"><button id="bp">‹</button><button id="bt">☰</button><button id="ba">Aa</button><button id="bh">🎧</button><button id="bn">›</button></div>
  </div>`));
  const scroll = $(".rscroll", el), text = $(".rtext", el), chEl = $(".rch", el), endEl = $(".rend", el), ttsEl = $(".tts", el);
  $(".rt", el).textContent = story.title;
  let idx = startIdx, tok = 0, saveT;
  const show = () => el.classList.toggle("hide");
  scroll.addEventListener("click", e => { if (!e.target.closest("button")) show(); });
  $(".bk", el).onclick = pop;

  // --- lịch sử đọc ---
  const firstVisible = () => {
    const top = scroll.getBoundingClientRect().top + 40;
    for (const p of $$("[data-p]", text)) if (p.getBoundingClientRect().bottom > top) return +p.dataset.p;
    return 0;
  };
  const saveHist = (p) => {
    const c = toc[idx]; if (!c) return;
    hist[story.id] = { id: story.id, title: story.title, cover: story.cover, idx, pos: c.position, ct: c.title, p: p == null ? firstVisible() : p, t: Date.now() };
    ls.set("hist", hist);
  };
  scroll.addEventListener("scroll", () => { clearTimeout(saveT); saveT = setTimeout(() => saveHist(), 400); }, { passive: true });

  // --- tải chương ---
  async function load(i, p = 0) {
    const my = ++tok; idx = i;
    const c = toc[i]; chEl.textContent = c.title; $(".rt", el).textContent = story.title + " · " + c.title;
    text.innerHTML = `<p class="load">Đang tải...</p>`; endEl.innerHTML = "";
    let ch;
    try { ch = await getChapter(story.id, c.position); }
    catch (e) { if (my === tok) { text.innerHTML = `<p class="err">${esc(e.message)}<br><button class="btn" id="rtry">Thử lại</button></p>`; $("#rtry", el).onclick = () => load(i, p); } return false; }
    if (my !== tok) return false;
    text.innerHTML = renderContent(ch.content);
    scroll.scrollTop = 0;
    if (p) { const t = $(`[data-p="${p}"]`, text); if (t) t.scrollIntoView({ block: "start" }); }
    endEl.innerHTML = i < toc.length - 1 ? `<button class="btn solid" id="en">Chương sau →</button>` : `<p class="empty">Hết truyện</p>`;
    if ($("#en", el)) $("#en", el).onclick = () => goTo(i + 1);
    saveHist(p);
    if (i + 1 < toc.length) getChapter(story.id, toc[i + 1].position).catch(() => {}); // tải trước chương sau
    return true;
  }
  async function goTo(i, forcePlay) {
    if (i < 0 || i >= toc.length) return false;
    const was = forcePlay || tts.playing;
    tts.halt();
    const ok = await load(i);
    if (ok && was) tts.start(0);
    else if (!ok) tts.ui();
    return ok;
  }
  $("#bp", el).onclick = () => goTo(idx - 1);
  $("#bn", el).onclick = () => goTo(idx + 1);
  $("#bt", el).onclick = () => {
    const s = openSheet(`<h3>Danh sách chương</h3>${toc.map((c, i) => `<div class="ch ${i === idx ? "cur" : ""}" data-i="${i}"><span>${esc(c.title)}</span></div>`).join("")}`);
    $$(".ch", s).forEach(c => c.onclick = () => { closeSheet(); goTo(+c.dataset.i); });
    const cur = $(".cur", s); if (cur) cur.scrollIntoView({ block: "center" });
  };
  $("#ba", el).onclick = () => {
    const th = [["dark", "#17191d"], ["black", "#000"], ["sepia", "#f1eadb"], ["light", "#fff"]];
    const s = openSheet(`<h3>Cài đặt đọc</h3><div class="themes">${th.map(([k, c]) => `<button data-th="${k}" class="${cfg.theme === k ? "on" : ""}" style="background:${c}"></button>`).join("")}</div>
      <div class="stp"><label>Cỡ chữ</label><button id="s1">−</button><b id="sv">${cfg.size}</b><button id="s2">+</button></div>
      <div class="stp"><label>Giãn dòng</label><button id="l1">−</button><b id="lv">${cfg.lh}</b><button id="l2">+</button></div>
      <div class="stp"><label>Font</label><select id="fn"><option value="serif">Có chân</option><option value="sans">Không chân</option></select></div>`);
    $("#fn", s).value = cfg.font;
    const upd = () => { saveCfg(); applyTheme(); $("#sv", s).textContent = cfg.size; $("#lv", s).textContent = cfg.lh; };
    $("#s1", s).onclick = () => { cfg.size = Math.max(14, cfg.size - 1); upd(); };
    $("#s2", s).onclick = () => { cfg.size = Math.min(30, cfg.size + 1); upd(); };
    $("#l1", s).onclick = () => { cfg.lh = Math.max(1.4, +(cfg.lh - 0.1).toFixed(1)); upd(); };
    $("#l2", s).onclick = () => { cfg.lh = Math.min(2.4, +(cfg.lh + 0.1).toFixed(1)); upd(); };
    $("#fn", s).onchange = e => { cfg.font = e.target.value; upd(); };
    $$("[data-th]", s).forEach(b => b.onclick = () => { cfg.theme = b.dataset.th; upd(); $$("[data-th]", s).forEach(x => x.classList.toggle("on", x === b)); });
  };

  // --- Sách nói ---
  const native = window.AndroidTTS || null, web = !native && "speechSynthesis" in window ? window.speechSynthesis : null;
  const tts = (() => {
    const pl = $("#tpl", el), vs = $("#tv", el), rs = $("#tr", el), ss = $("#ts", el), st = $("#tst", el);
    let chunks = [], pos = 0, gen = 0, sleepT = null, hl = -2, webVoices = [];
    const T = { playing: false };
    const split = t => {
      const out = [], ss2 = t.match(/[^.!?…。！？]+[.!?…。！？"”’)\]]*\s*/g) || [t]; let cur = "";
      for (const x of ss2) {
        if ((cur + x).length > 220 && cur) { out.push(cur.trim()); cur = ""; }
        cur += x;
        while (cur.length > 300) { let k = cur.lastIndexOf(",", 300); if (k < 100) k = cur.lastIndexOf(" ", 300); if (k < 1) k = 300; out.push(cur.slice(0, k + 1).trim()); cur = cur.slice(k + 1); }
      }
      if (cur.trim()) out.push(cur.trim());
      return out;
    };
    const build = () => {
      const l = []; if (chEl.textContent.trim()) l.push({ t: chEl.textContent.trim(), p: -1 });
      $$("p[data-p]", text).forEach(p => split(p.textContent.replace(/\s+/g, " ").trim()).forEach(t => { if (/[\p{L}\p{N}]/u.test(t)) l.push({ t, p: +p.dataset.p }); }));
      return l;
    };
    const hi = p => {
      if (p === hl) return; $$(".tts-on", text).forEach(e => e.classList.remove("tts-on")); hl = p;
      const e = p >= 0 && $(`p[data-p="${p}"]`, text); if (!e) return;
      e.classList.add("tts-on");
      const r = e.getBoundingClientRect(), s = scroll.getBoundingClientRect();
      if (r.top < s.top + 70 || r.bottom > s.bottom - 130) e.scrollIntoView({ block: "center", behavior: "smooth" });
    };
    T.ui = () => { pl.textContent = T.playing ? "⏸" : "▶"; $("#bh", el).style.color = ttsEl.hidden ? "" : "var(--accent)"; };
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
      if (native) return native.speak(JSON.stringify(chunks.map(c => c.t)), from, cfg.rate, gen, story.title);
      web.cancel(); const g = gen;
      const at = i => {
        if (g !== gen || !T.playing) return;
        if (i >= chunks.length) return T.finished();
        pos = i; hi(chunks[i].p);
        const u = new SpeechSynthesisUtterance(chunks[i].t); u.lang = "vi-VN"; u.rate = cfg.rate;
        const v = webVoices.find(x => x.name === vs.value); if (v) u.voice = v;
        u.onend = () => at(i + 1);
        u.onerror = ev => { if (ev.error === "canceled" || ev.error === "interrupted") return; if (g === gen) { T.halt(); st.textContent = "Lỗi đọc"; } };
        web.speak(u);
      };
      at(from);
    };
    T.start = from => {
      if (!chunks.length) chunks = build();
      if (!chunks.length) { st.textContent = "Chương này chưa có nội dung"; return; }
      pos = Math.min(Math.max(0, from), chunks.length - 1); gen++; T.playing = true; st.textContent = ""; T.ui(); engineStart(pos);
    };
    T.pause = () => { T.playing = false; gen++; if (native) native.pause(); else if (web) web.cancel(); T.ui(); };
    T.halt = () => { T.playing = false; gen++; chunks = []; if (native) native.pause(); else if (web) web.cancel(); hi(-1); hl = -2; };
    T.stopAll = () => {
      T.halt(); if (native) native.stop(); clearTimeout(sleepT); sleepT = null; ss.value = "0"; ttsEl.hidden = true; T.ui();
    };
    T.finished = async () => {
      hi(-1); hl = -2;
      if (idx >= toc.length - 1) { T.pause(); st.textContent = "Đã hết truyện"; return; }
      st.textContent = "Đang chuyển chương..."; chunks = [];
      T.playing = false; gen++;
      const ok = await goTo(idx + 1, true);
      if (!ok) { T.pause(); st.textContent = "Không tải được chương kế"; }
    };
    const paraStart = dir => {
      const cur = chunks[pos] ? chunks[pos].p : -1;
      if (dir > 0) { for (let i = pos + 1; i < chunks.length; i++) if (chunks[i].p !== cur) return i; return -1; }
      let j = pos; while (j > 0 && chunks[j - 1].p === cur) j--;
      if (j < pos) return j;
      if (j === 0) return 0;
      const pp = chunks[j - 1].p; while (j > 0 && chunks[j - 1].p === pp) j--; return j;
    };
    pl.onclick = () => T.playing ? T.pause() : T.start(pos);
    $("#tn", el).onclick = () => { const i = paraStart(1); if (i < 0) T.finished(); else T.start(i); };
    $("#tp", el).onclick = () => T.start(paraStart(-1));
    $("#tx", el).onclick = T.stopAll;
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
        onStart(g, i) { if (g !== gen || !T.playing) return; pos = i; hi(chunks[i] ? chunks[i].p : -1); },
        onDone(g) { if (g === gen && T.playing) T.finished(); },
        onError(g, m) { if (g === gen && T.playing) { T.pause(); st.textContent = m === "nolang" ? "Máy chưa có giọng tiếng Việt" : "Lỗi đọc"; if (m === "nolang" && confirm("Máy chưa cài giọng tiếng Việt cho Google TTS.\nMở cài đặt giọng nói để tải?")) native.openSettings(); } },
        onToggle() { if (ttsEl.hidden) return; T.playing ? T.pause() : T.start(pos); },
        onExternalStop() { if (!ttsEl.hidden) T.stopAll(); }
      };
    } else if (web) { loadWeb(); web.onvoiceschanged = loadWeb; }
    T.ui();
    return T;
  })();

  el.onclose = () => { tts.stopAll(); clearTimeout(saveT); saveHist(); delete window.__ttsNative; if (tab === "lib") renderLib(); };
  load(idx, startP).then(() => { if (!startP) toast("Chạm vào giữa màn hình để hiện/ẩn menu"); });
}

// ---------- Khởi động ----------
go("home");
})();
