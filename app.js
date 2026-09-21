/* ============ EDITÁ ESTOS DATOS ============ */
const CONFIG = {
  name: "Mantenimiento Waltersdorf",
  whatsapp: "5491149279441",          // solo números, con código de país
  phoneDisplay: "+54 9 11 4927-9441",
  zone: "CABA",                       // vacío = se oculta
  hours: "Lunes a viernes de 10:00 a 17:00 hs" // vacío = se oculta
};
/* ============================================ */


const CATS = [["pintura", "Pintura"], ["mantenimiento", "Mantenimiento"], ["albanileria", "Albañilería"]];
const CAT_LABEL = Object.fromEntries(CATS);
const MAX_BYTES = 8 * 1024 * 1024;   // tope de peso de las fotos dentro de la página
const TARGET = 55;
const REDUCE = matchMedia("(prefers-reduced-motion: reduce)").matches;

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const clone = o => JSON.parse(JSON.stringify(o));
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
const fmt = b => (b / 1048576).toFixed(1).replace(".", ",") + " MB";
const wa = msg => `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`;

/* ---------- Estado guardado (fotos) ---------- */
const SAVED = { hero: [], gallery: [] };
try {
  const raw = JSON.parse($("#site-data").textContent);
  SAVED.hero = raw.hero || [];
  SAVED.gallery = raw.gallery || [];
} catch (e) { /* sin datos */ }
let draft = clone(SAVED);
let dirty = false, editing = false, filter = "all", heroIdx = 0;

/* ---------- Datos del negocio ---------- */
$$("[data-brand]").forEach(el => { el.textContent = CONFIG.name; });
document.title = `${CONFIG.name} — Pintura, arreglos y albañilería`;
$$("[data-phone]").forEach(el => {
  el.textContent = CONFIG.phoneDisplay;
  el.href = wa("Hola! Quiero pedir un presupuesto.");
  el.target = "_blank"; el.rel = "noopener";
});
[["zone", CONFIG.zone], ["hours", CONFIG.hours]].forEach(([k, v]) => {
  const li = $(`[data-field="${k}"]`);
  if (!v) li.hidden = true; else $("span", li).textContent = v;
});
$("#year").textContent = new Date().getFullYear();

/* ---------- Formulario -> mensaje de WhatsApp ---------- */
const f = { service: $("#f-service"), name: $("#f-name"), zone: $("#f-zone"), detail: $("#f-detail") };
function updateMessage() {
  const lines = [`Hola! Quiero pedir presupuesto para: ${f.service.value}.`];
  if (f.name.value.trim())   lines.push(`Nombre: ${f.name.value.trim()}`);
  if (f.zone.value.trim())   lines.push(`Zona: ${f.zone.value.trim()}`);
  if (f.detail.value.trim()) lines.push(f.detail.value.trim());
  $("#send").href = wa(lines.join("\n"));
}
Object.values(f).forEach(el => el.addEventListener("input", updateMessage));
updateMessage();
$$("[data-service]").forEach(a => a.addEventListener("click", () => {
  f.service.value = a.dataset.service;
  updateMessage();
}));

/* ---------- Comparador antes / después ---------- */
const ba = $("#ba"), layers = $("#ba-layers"), range = $("#ba-range");
const cap = $("#ba-cap"), picker = $("#hero-picker");
let animToken = 0;

function setPos(v) { ba.style.setProperty("--pos", v + "%"); range.value = v; }
function playReveal(delay = 0) {
  const my = ++animToken;
  if (REDUCE) { setPos(TARGET); return; }
  setPos(0);
  setTimeout(() => {
    if (my !== animToken) return;
    const t0 = performance.now(), D = 1700;
    (function step(t) {
      if (my !== animToken) return;
      const p = Math.min(1, (t - t0) / D);
      setPos(TARGET * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }, delay);
}
range.addEventListener("input", () => { animToken++; setPos(range.value); });
["pointerdown", "touchstart", "keydown"].forEach(ev => range.addEventListener(ev, () => { animToken++; }, { passive: true }));

function photo(src, alt, cls) {
  const im = new Image();
  im.src = src; im.alt = alt; im.className = cls; im.draggable = false; im.decoding = "async";
  return im;
}
function renderHero() {
  const list = draft.hero;
  if (heroIdx >= list.length) heroIdx = Math.max(0, list.length - 1);
  layers.textContent = "";
  picker.textContent = "";
  if (!list.length) {
    layers.append($("#demo-scene").content.cloneNode(true));
    cap.textContent = "Ilustración: deslizá para ver el antes y el después.";
    picker.hidden = true;
    return;
  }
  const p = list[heroIdx];
  layers.append(photo(p.before, "Antes", "scene before"), photo(p.after, "Después", "scene after"));
  cap.textContent = (p.title ? p.title + ". " : "") + "Deslizá para ver el antes y el después.";
  picker.hidden = list.length < 2;
  list.forEach((item, i) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "chip-btn";
    b.textContent = item.title || `Trabajo ${i + 1}`;
    b.setAttribute("aria-pressed", String(i === heroIdx));
    b.onclick = () => { heroIdx = i; renderHero(); playReveal(); };
    picker.append(b);
  });
}

/* ---------- Galería ---------- */
const grid = $("#g-grid");
function iconBtn(text, label, fn) {
  const b = document.createElement("button");
  b.type = "button"; b.className = "icon-btn"; b.textContent = text;
  b.setAttribute("aria-label", label); b.onclick = fn;
  return b;
}
function visibleGallery() { return draft.gallery.filter(g => filter === "all" || g.cat === filter); }
function moveGallery(id, dir) {
  const vis = visibleGallery(), i = vis.findIndex(g => g.id === id), j = i + dir;
  if (i < 0 || j < 0 || j >= vis.length) return;
  const a = draft.gallery.indexOf(vis[i]), b = draft.gallery.indexOf(vis[j]);
  [draft.gallery[a], draft.gallery[b]] = [draft.gallery[b], draft.gallery[a]];
  touch(); renderGallery();
}
function renderGallery() {
  const has = draft.gallery.length > 0;
  $("#trabajos").hidden = !(has || editing);
  $$('[data-nav="trabajos"]').forEach(a => { a.hidden = !(has || editing); });
  $("#g-empty").hidden = has;

  const cats = CATS.filter(([k]) => draft.gallery.some(g => g.cat === k));
  if (filter !== "all" && !cats.some(([k]) => k === filter)) filter = "all";
  const bar = $("#g-filters");
  bar.textContent = "";
  bar.hidden = cats.length < 2;
  [["all", "Todos"], ...cats].forEach(([k, label]) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "chip-btn"; b.textContent = label;
    b.setAttribute("aria-pressed", String(filter === k));
    b.onclick = () => { filter = k; renderGallery(); };
    bar.append(b);
  });

  grid.textContent = "";
  const items = visibleGallery();
  items.forEach((g, i) => {
    const li = document.createElement("li");
    li.className = "tile";
    const open = document.createElement("button");
    open.type = "button"; open.className = "tile-open";
    open.setAttribute("aria-label", "Ver foto ampliada");
    const im = new Image();
    im.src = g.src; im.alt = `Trabajo de ${CAT_LABEL[g.cat] || "mantenimiento"}`;
    im.loading = "lazy"; im.decoding = "async";
    open.append(im);
    open.onclick = () => openLightbox(items, i);
    const tag = document.createElement("span");
    tag.className = "tag"; tag.textContent = CAT_LABEL[g.cat] || "";

    const ctl = document.createElement("div");
    ctl.className = "ctl";
    const sp = document.createElement("span"); sp.className = "sp";
    ctl.append(
      iconBtn("‹", "Mover antes", () => moveGallery(g.id, -1)),
      iconBtn("›", "Mover después", () => moveGallery(g.id, 1)),
      sp,
      iconBtn("✕", "Eliminar esta foto", () => {
        draft.gallery = draft.gallery.filter(x => x.id !== g.id);
        touch(); renderGallery();
      })
    );
    const sel = document.createElement("select");
    sel.className = "cat-sel"; sel.setAttribute("aria-label", "Categoría de la foto");
    CATS.forEach(([k, l]) => { const o = new Option(l, k); o.selected = k === g.cat; sel.append(o); });
    sel.onchange = () => { g.cat = sel.value; touch(); renderGallery(); };

    li.append(open, tag, ctl, sel);
    grid.append(li);
  });
}

/* ---------- Visor de fotos ---------- */
const lb = $("#lb"), lbImg = $("#lb-img"), lbCap = $("#lb-cap");
let lbItems = [], lbI = 0;
function showLb() {
  const g = lbItems[lbI];
  lbImg.src = g.src;
  lbImg.alt = `Trabajo de ${CAT_LABEL[g.cat] || "mantenimiento"}`;
  lbCap.textContent = `${CAT_LABEL[g.cat] || ""} · ${lbI + 1} de ${lbItems.length}`;
}
function stepLb(d) { lbI = (lbI + d + lbItems.length) % lbItems.length; showLb(); }
function openLightbox(items, i) {
  lbItems = items; lbI = i; showLb();
  if (lb.showModal) lb.showModal(); else lb.setAttribute("open", "");
}
$("#lb-close").onclick = () => lb.close();
$("#lb-prev").onclick = () => stepLb(-1);
$("#lb-next").onclick = () => stepLb(1);
lb.addEventListener("click", e => { if (!e.target.closest("img, button, .lb-cap")) lb.close(); });
lb.addEventListener("keydown", e => {
  if (e.key === "ArrowLeft") stepLb(-1);
  if (e.key === "ArrowRight") stepLb(1);
});

/* ---------- Armado del documento para guardar ---------- */
/* Toma el index.html publicado y le reemplaza solo el bloque de fotos (#site-data). */
async function buildDoc(state) {
  const res = await fetch("index.html", { cache: "no-store" });
  if (!res.ok) throw new Error("no se pudo leer index.html");
  const html = await res.text();
  const json = JSON.stringify({ hero: state.hero, gallery: state.gallery }).replace(/</g, "\\u003c");
  return html.replace(
    /(<script type="application\/json" id="site-data">)[\s\S]*?(<\/script>)/,
    (_, open, close) => open + json + close
  );
}

/* ---------- Modo edición ---------- */
let artifactNS = null, saving = false, closeArmed = false;
const usedBytes = d =>
  d.gallery.reduce((n, g) => n + g.src.length, 0) +
  d.hero.reduce((n, p) => n + p.before.length + p.after.length, 0);

function touch() { dirty = true; closeArmed = false; updateBar(); }
function setNote(sel, msg) { $(sel).textContent = msg || ""; }
function updateBar(msg) {
  const used = `${fmt(usedBytes(draft))} de ${fmt(MAX_BYTES)}`;
  $("#eb-status").textContent = msg || (dirty ? `Cambios sin guardar · ${used}` : `Sin cambios · ${used}`);
  $("#eb-save").disabled = !dirty || saving;
  $("#eb-close").textContent = closeArmed ? "Descartar y cerrar" : "Cerrar edición";
}
function renderAll() { renderHero(); renderGallery(); renderHeroEditor(); }
function setEditing(on) {
  editing = on;
  document.body.classList.toggle("editing", on);
  if (!on) { draft = clone(SAVED); dirty = false; closeArmed = false; heroIdx = 0; }
  renderAll(); updateBar();
  if (!on) playReveal();
}

async function compress(file, max = 1400, quality = 0.78) {
  let src, w, h, url = null;
  try {
    src = await createImageBitmap(file, { imageOrientation: "from-image" });
    w = src.width; h = src.height;
  } catch (e) {
    url = URL.createObjectURL(file);
    const im = new Image();
    im.src = url;
    await im.decode();
    src = im; w = im.naturalWidth; h = im.naturalHeight;
  }
  if (!w || !h) throw new Error("empty");
  const k = Math.min(1, max / Math.max(w, h));
  const cw = Math.round(w * k), ch = Math.round(h * k);
  const c = document.createElement("canvas");
  c.width = cw; c.height = ch;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cw, ch);
  ctx.drawImage(src, 0, 0, cw, ch);
  if (src.close) src.close();
  if (url) URL.revokeObjectURL(url);
  return c.toDataURL("image/jpeg", quality);
}

/* Agregar fotos a la galería */
$("#g-add").addEventListener("change", async e => {
  const files = Array.from(e.target.files); e.target.value = "";
  if (!files.length) return;
  const cat = $("#g-cat").value;
  let added = 0, failed = 0, full = false;
  for (const file of files) {
    setNote("#g-note", `Procesando ${added + failed + 1} de ${files.length}…`);
    try {
      const src = await compress(file);
      if (usedBytes(draft) + src.length > MAX_BYTES) { full = true; break; }
      draft.gallery.push({ id: uid(), cat, src });
      added++;
    } catch (err) { failed++; }
  }
  if (added) touch();
  renderGallery();
  setNote("#g-note",
    `${added} foto${added === 1 ? "" : "s"} agregada${added === 1 ? "" : "s"}.` +
    (failed ? ` No se pudieron leer ${failed}.` : "") +
    (full ? " Se llegó al límite de espacio: quitá fotos o guardá y usá menos." : ""));
});

/* Antes / después del hero */
function moveHero(i, d) {
  const j = i + d;
  if (j < 0 || j >= draft.hero.length) return;
  [draft.hero[i], draft.hero[j]] = [draft.hero[j], draft.hero[i]];
  heroIdx = j; touch(); renderHero(); renderHeroEditor();
}
function renderHeroEditor() {
  const ul = $("#hero-list");
  ul.textContent = "";
  draft.hero.forEach((p, i) => {
    const li = document.createElement("li");
    const t = document.createElement("span");
    t.className = "t"; t.textContent = p.title || `Trabajo ${i + 1}`;
    li.append(
      photo(p.before, "Antes", ""), photo(p.after, "Después", ""), t,
      iconBtn("‹", "Mover arriba", () => moveHero(i, -1)),
      iconBtn("›", "Mover abajo", () => moveHero(i, 1)),
      iconBtn("✕", "Eliminar este trabajo", () => {
        draft.hero.splice(i, 1); touch(); renderHero(); renderHeroEditor(); playReveal();
      })
    );
    ul.append(li);
  });
}
const hpB = $("#hp-before"), hpA = $("#hp-after"), hpAdd = $("#hp-add");
[hpB, hpA].forEach(i => i.addEventListener("change", () => { hpAdd.disabled = !(hpB.files[0] && hpA.files[0]); }));
hpAdd.addEventListener("click", async () => {
  hpAdd.disabled = true;
  setNote("#hp-note", "Procesando fotos…");
  try {
    const before = await compress(hpB.files[0], 1400, 0.8);
    const after = await compress(hpA.files[0], 1400, 0.8);
    if (usedBytes(draft) + before.length + after.length > MAX_BYTES) {
      setNote("#hp-note", "No hay espacio suficiente. Quitá alguna foto y probá de nuevo.");
      hpAdd.disabled = false; return;
    }
    draft.hero.push({ id: uid(), title: $("#hp-title").value.trim(), before, after });
    heroIdx = draft.hero.length - 1;
    hpB.value = ""; hpA.value = ""; $("#hp-title").value = "";
    touch(); renderHero(); renderHeroEditor(); playReveal();
    setNote("#hp-note", "Agregado al hero.");
  } catch (err) {
    setNote("#hp-note", "No pude leer alguna de las fotos. Probá con otras.");
    hpAdd.disabled = false;
  }
});

/* Guardar y salir */
const SAVE_ERRORS = {
  conflict: "Se publicó una versión más nueva. La página se va a recargar.",
  too_large: "La página quedó demasiado pesada. Quitá algunas fotos.",
  not_writer: "Tu cuenta no tiene permiso para guardar cambios.",
  not_granted: "Tu cuenta no tiene permiso para guardar cambios.",
  not_declared: "Esta página ya no permite guardar cambios.",
  rate_limited: "Guardaste muy seguido. Esperá un momento y probá de nuevo."
};
$("#eb-save").addEventListener("click", async () => {
  if (saving || !artifactNS) return;
  saving = true; updateBar("Guardando…");
  try {
    await artifactNS.publish(await buildDoc(draft));
    updateBar("Guardado. Actualizando la página…");
  } catch (err) {
    saving = false;
    updateBar(SAVE_ERRORS[err && err.code] || "No se pudo guardar. Probá de nuevo.");
    setTimeout(() => updateBar(), 4000);
  }
});
$("#eb-close").addEventListener("click", () => {
  if (dirty && !closeArmed) { closeArmed = true; updateBar(); setTimeout(() => { closeArmed = false; updateBar(); }, 5000); return; }
  setEditing(false);
});
$("#edit-toggle").addEventListener("click", () => setEditing(true));

/* El modo edición solo se ofrece a quien puede publicar cambios */
(async () => {
  try {
    if (!window.claude || !window.claude.use) return;
    const [user, art] = await Promise.all([window.claude.use("user"), window.claude.use("artifact")]);
    if (!user || !art) return;
    if (!(await user.canEdit()) && !(await user.isOwner())) return;
    artifactNS = art;
    document.body.classList.add("can-edit");
  } catch (e) { /* sin modo edición */ }
})();

/* ---------- Botón flotante de WhatsApp ---------- */
const fab = $("#fab");
if ("IntersectionObserver" in window) {
  new IntersectionObserver(([e]) => fab.classList.toggle("gone", e.isIntersecting), { threshold: 0.15 })
    .observe($("#contacto"));
}

/* ---------- Arranque ---------- */
renderAll();
updateBar();
playReveal(500);
