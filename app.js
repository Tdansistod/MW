/* ============ EDITÁ ESTOS DATOS ============ */
const CONFIG = {
  name: "Mantenimiento Waltersdorf",
  whatsapp: "5491149279441",          // solo números, con código de país
  phoneDisplay: "+54 9 11 4927-9441",
  email: "waltersdorfdp@gmail.com",   // vacío = se oculta
  zone: "CABA",                       // vacío = se oculta
  hours: "Lunes a viernes de 10:00 a 17:00 hs" // vacío = se oculta
};
/* ============================================ */

const TARGET = 55;
const REDUCE = matchMedia("(prefers-reduced-motion: reduce)").matches;

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const wa = msg => `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`;

/* ---------- Datos del negocio ---------- */
$$("[data-brand]").forEach(el => { el.textContent = CONFIG.name; });
$$("[data-phone]").forEach(el => {
  el.textContent = CONFIG.phoneDisplay;
  el.href = wa("Hola! Quiero pedir un presupuesto.");
  el.target = "_blank"; el.rel = "noopener";
});
[["zone", CONFIG.zone], ["hours", CONFIG.hours]].forEach(([k, v]) => {
  const li = $(`[data-field="${k}"]`);
  if (!v) li.hidden = true; else $("span", li).textContent = v;
});
const emailLi = $('[data-field="email"]');
if (!CONFIG.email) emailLi.hidden = true;
else {
  const a = $("a", emailLi);
  a.textContent = CONFIG.email;
  a.href = `mailto:${CONFIG.email}`;
}
$("#year").textContent = new Date().getFullYear();

/* ---------- Formulario -> mensaje de WhatsApp ---------- */
const f = { name: $("#f-name"), zone: $("#f-zone"), detail: $("#f-detail") };
function updateMessage() {
  const lines = ["Hola! Quiero pedir un presupuesto."];
  if (f.name.value.trim())   lines.push(`Nombre: ${f.name.value.trim()}`);
  if (f.zone.value.trim())   lines.push(`Zona: ${f.zone.value.trim()}`);
  if (f.detail.value.trim()) lines.push(f.detail.value.trim());
  $("#send").href = wa(lines.join("\n"));
}
Object.values(f).forEach(el => el.addEventListener("input", updateMessage));
updateMessage();

/* ---------- Comparador antes / después ---------- */
const ba = $("#ba"), range = $("#ba-range");
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
playReveal(500);

/* ---------- Botón flotante de WhatsApp ---------- */
const fab = $("#fab");
if ("IntersectionObserver" in window) {
  new IntersectionObserver(([e]) => fab.classList.toggle("gone", e.isIntersecting), { threshold: 0.15 })
    .observe($("#contacto"));
}
