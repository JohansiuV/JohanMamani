// ==============================
//  APP.JS — Portfolio Logic
// ==============================

const STORAGE_KEY_PORTFOLIO_DATA = "portfolio_data_v1";
const STORAGE_KEY_CERTS = "portfolio_certs";
const STORAGE_KEY_PROFILE = "portfolio_profile";
const MAX_IMAGE_DIMENSION = 1600; // px — evita guardar imágenes gigantes en localStorage

// ---- NAVIGATION ----
function showSection(id) {
  document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
  const target = document.getElementById(id);
  if (target) target.classList.add("active");

  document.querySelectorAll(".nav-link").forEach(l => {
    l.classList.toggle("active", l.dataset.section === id);
  });

  window.scrollTo(0, 0);
}

document.querySelectorAll(".nav-link").forEach(link => {
  link.addEventListener("click", e => {
    e.preventDefault();
    showSection(link.dataset.section);
  });
});

// ---- THEME TOGGLE ----
const themeToggle = document.getElementById("themeToggle");
if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const html = document.documentElement;
    const isDark = html.dataset.theme === "dark";
    html.dataset.theme = isDark ? "light" : "dark";
    themeToggle.textContent = isDark ? "☀️" : "🌙";
    localStorage.setItem("theme", html.dataset.theme);
  });

  (function initTheme() {
    const saved = localStorage.getItem("theme");
    if (saved) {
      document.documentElement.dataset.theme = saved;
      themeToggle.textContent = saved === "light" ? "☀️" : "🌙";
    }
  })();
}

// ---- CLOCK ----
function updateClock() {
  const now = new Date();
  const h = now.getHours().toString().padStart(2, "0");
  const m = now.getMinutes().toString().padStart(2, "0");
  const s = now.getSeconds().toString().padStart(2, "0");
  const ampm = now.getHours() >= 12 ? "pm" : "am";
  const el = document.getElementById("navTime");
  if (el) el.textContent = `${h}:${m}:${s} ${ampm}`;
}
setInterval(updateClock, 1000);
updateClock();

// ==============================
//  DATOS DEL PORTAFOLIO (localStorage)
// ==============================
function getPortfolioData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PORTFOLIO_DATA);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return {
          certs: Array.isArray(parsed.certs) ? parsed.certs : [],
          profile: parsed.profile && typeof parsed.profile === "object" ? parsed.profile : {}
        };
      }
    }
  } catch (error) {
    console.warn("No se pudo leer la copia de respaldo del portafolio", error);
  }

  try {
    return {
      certs: JSON.parse(localStorage.getItem(STORAGE_KEY_CERTS)) || [],
      profile: JSON.parse(localStorage.getItem(STORAGE_KEY_PROFILE)) || {}
    };
  } catch {
    return { certs: [], profile: {} };
  }
}

function savePortfolioData(certs, profile) {
  const normalizedCerts = Array.isArray(certs) ? certs : [];
  const normalizedProfile = profile && typeof profile === "object" ? profile : {};

  try {
    localStorage.setItem(STORAGE_KEY_PORTFOLIO_DATA, JSON.stringify({
      version: 1,
      certs: normalizedCerts,
      profile: normalizedProfile
    }));
    localStorage.setItem(STORAGE_KEY_CERTS, JSON.stringify(normalizedCerts));
    localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(normalizedProfile));
    return true;
  } catch (error) {
    console.warn("No se pudo guardar el portafolio", error);
    if (error && error.name === "QuotaExceededError") {
      toast("⚠️ No hay espacio suficiente en el navegador. Elimina algún certificado o usa imágenes más livianas.", "error");
    } else {
      toast("⚠️ No se pudo guardar el certificado", "error");
    }
    return false;
  }
}

function getCerts() {
  return getPortfolioData().certs;
}
function saveCerts(certs) {
  return savePortfolioData(certs, getProfile());
}
function getProfile() {
  return getPortfolioData().profile;
}

function seedDefaultCerts() {
  const existing = getCerts();
  if (existing.length) return;

  const defaults = [
    { id: 101, title: "Certificado 1", issuer: "Institución", date: "2024", category: "programacion", img: "FOTO/Certificado1.png" },
    { id: 102, title: "Certificado 2", issuer: "Institución", date: "2024", category: "cloud", img: "FOTO/Certificado2.png" },
    { id: 103, title: "Certificado 3", issuer: "Institución", date: "2024", category: "otros", img: "FOTO/certificado3.jpg" }
  ];

  saveCerts(defaults);
}

function applyProfile(p) {
  if (!p) return;
  if (p.photo) {
    const el = document.getElementById("profilePhoto");
    if (el) el.src = p.photo;
  }
  if (p.name) {
    document.querySelectorAll(".about-name").forEach(el => el.textContent = p.name);
  }
  if (p.role) {
    document.querySelectorAll(".about-role").forEach(el => el.textContent = p.role);
  }
}

// ==============================
//  CERTIFICADOS — subida directa
// ==============================
const certDropzone = document.getElementById("certDropzone");
const certFilesInput = document.getElementById("certFiles");
const certCategoryInput = document.getElementById("certCategoryInput");

if (certDropzone && certFilesInput) {
  certDropzone.addEventListener("click", () => certFilesInput.click());

  certFilesInput.addEventListener("change", () => {
    handleCertFiles(certFilesInput.files);
    certFilesInput.value = "";
  });

  ["dragenter", "dragover"].forEach(evt => {
    certDropzone.addEventListener(evt, e => {
      e.preventDefault();
      certDropzone.classList.add("drag-over");
    });
  });

  ["dragleave", "drop"].forEach(evt => {
    certDropzone.addEventListener(evt, e => {
      e.preventDefault();
      certDropzone.classList.remove("drag-over");
    });
  });

  certDropzone.addEventListener("drop", e => {
    const files = e.dataTransfer?.files;
    if (files && files.length) handleCertFiles(files);
  });
}

// Convierte un archivo de imagen en un dataURL, redimensionándolo si es muy grande
function fileToOptimizedDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.onload = e => {
      const img = new Image();
      img.onerror = () => resolve(e.target.result); // si falla el resize, usar el original
      img.onload = () => {
        let { width, height } = img;
        if (width <= MAX_IMAGE_DIMENSION && height <= MAX_IMAGE_DIMENSION) {
          resolve(e.target.result);
          return;
        }
        const scale = MAX_IMAGE_DIMENSION / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function cleanFileName(name) {
  return name.replace(/\.[^/.]+$/, "").replace(/[-_]+/g, " ").trim() || "Certificado";
}

async function handleCertFiles(fileList) {
  const files = Array.from(fileList || []).filter(f => f.type.startsWith("image/"));
  if (!files.length) {
    toast("Selecciona una o varias imágenes de tus certificados", "error");
    return;
  }

  const category = certCategoryInput ? certCategoryInput.value : "otros";
  const certs = getCerts();
  const today = new Date().toLocaleDateString("es-PE", { year: "numeric", month: "long" });

  let addedCount = 0;
  for (const file of files) {
    try {
      const dataUrl = await fileToOptimizedDataUrl(file);
      certs.push({
        id: Date.now() + Math.floor(Math.random() * 1000),
        title: cleanFileName(file.name),
        issuer: "",
        date: today,
        category,
        img: dataUrl
      });
      addedCount++;
    } catch (error) {
      console.error(error);
    }
  }

  if (!addedCount) {
    toast("❌ No se pudo procesar ninguna imagen", "error");
    return;
  }

  const saved = saveCerts(certs);
  if (saved) {
    renderCertsGrid(getActiveFilter());
    toast(addedCount === 1 ? "✅ Certificado agregado" : `✅ ${addedCount} certificados agregados`, "success");
  }
}

function getActiveFilter() {
  const active = document.querySelector(".filter-btn.active");
  return active ? active.dataset.filter : "all";
}

function deleteCert(id) {
  const certs = getCerts().filter(c => c.id !== id);
  saveCerts(certs);
  renderCertsGrid(getActiveFilter());
  toast("🗑️ Certificado eliminado");
}

function renderCertsGrid(filter = "all") {
  const grid = document.getElementById("certsGrid");
  if (!grid) return;
  let certs = getCerts();
  if (filter !== "all") certs = certs.filter(c => c.category === filter);

  if (!certs.length) {
    grid.innerHTML = `<div class="cert-placeholder">
      <div class="cert-placeholder-icon">🏅</div>
      <p>Aún no hay certificados destacados. <br />Se mostrarán aquí cuando agregues nuevos elementos.</p>
    </div>`;
    return;
  }

  const categoryLabels = { programacion: "Programación", cloud: "Cloud", diseno: "Diseño", otros: "Otros" };

  grid.innerHTML = certs.map(c => `
    <div class="cert-card" data-id="${c.id}">
      <div class="cert-card-actions">
        <button class="cert-action-btn edit" data-action="edit" data-id="${c.id}" title="Editar">✏️</button>
        <button class="cert-action-btn delete" data-action="delete" data-id="${c.id}" title="Eliminar">🗑️</button>
      </div>
      <div class="cert-card-media" data-action="view" data-id="${c.id}">
        ${c.img
      ? `<img class="cert-card-img" src="${c.img}" alt="${escAttr(c.title)}" />`
      : `<div class="cert-card-img" style="display:flex;align-items:center;justify-content:center;font-size:3rem;">🏅</div>`}
      </div>
      <div class="cert-card-body" data-action="view" data-id="${c.id}">
        <div class="cert-card-title">${escHtml(c.title)}</div>
        ${c.issuer ? `<div class="cert-card-issuer">${escHtml(c.issuer)}</div>` : ""}
        ${c.date ? `<div class="cert-card-date">${escHtml(c.date)}</div>` : ""}
        <span class="cert-card-tag">${escHtml(categoryLabels[c.category] || c.category)}</span>
      </div>
    </div>
  `).join("");
}

// Delegación de eventos para las tarjetas de certificados (evita datos gigantes en atributos onclick)
const certsGridEl = document.getElementById("certsGrid");
if (certsGridEl) {
  certsGridEl.addEventListener("click", e => {
    const actionEl = e.target.closest("[data-action]");
    if (!actionEl) return;
    const id = Number(actionEl.dataset.id);
    const cert = getCerts().find(c => c.id === id);
    if (!cert) return;

    const action = actionEl.dataset.action;
    if (action === "delete") {
      deleteCert(id);
    } else if (action === "edit") {
      openCertEditModal(cert);
    } else if (action === "view") {
      openLightbox(cert.img, cert.title);
    }
  });
}

seedDefaultCerts();
renderCertsGrid(getActiveFilter());

// Filter buttons
document.querySelectorAll(".filter-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    renderCertsGrid(btn.dataset.filter);
  });
});

// ---- MODAL DE EDICIÓN ----
const certEditModal = document.getElementById("certEditModal");
let editingCertId = null;

function openCertEditModal(cert) {
  if (!certEditModal) return;
  editingCertId = cert.id;
  document.getElementById("editCertTitle").value = cert.title || "";
  document.getElementById("editCertIssuer").value = cert.issuer || "";
  document.getElementById("editCertDate").value = cert.date || "";
  document.getElementById("editCertCategory").value = cert.category || "otros";
  certEditModal.classList.add("open");
}

function closeCertEditModal() {
  if (!certEditModal) return;
  certEditModal.classList.remove("open");
  editingCertId = null;
}

const editCertSaveBtn = document.getElementById("editCertSave");
if (editCertSaveBtn) {
  editCertSaveBtn.addEventListener("click", () => {
    if (editingCertId === null) return;
    const certs = getCerts();
    const cert = certs.find(c => c.id === editingCertId);
    if (!cert) { closeCertEditModal(); return; }

    const title = document.getElementById("editCertTitle").value.trim();
    if (!title) { toast("El título no puede estar vacío", "error"); return; }

    cert.title = title;
    cert.issuer = document.getElementById("editCertIssuer").value.trim();
    cert.date = document.getElementById("editCertDate").value.trim();
    cert.category = document.getElementById("editCertCategory").value;

    saveCerts(certs);
    renderCertsGrid(getActiveFilter());
    closeCertEditModal();
    toast("✅ Certificado actualizado", "success");
  });
}

const editCertCancelBtn = document.getElementById("editCertCancel");
if (editCertCancelBtn) editCertCancelBtn.addEventListener("click", closeCertEditModal);
if (certEditModal) {
  certEditModal.addEventListener("click", e => {
    if (e.target === certEditModal) closeCertEditModal();
  });
}

// ---- LIGHTBOX ----
function openLightbox(src, caption) {
  if (!src) return;
  document.getElementById("lightboxImg").src = src;
  document.getElementById("lightboxCaption").textContent = caption || "";
  document.getElementById("lightbox").classList.add("open");
}
function closeLightbox() { document.getElementById("lightbox").classList.remove("open"); }
document.addEventListener("keydown", e => {
  if (e.key !== "Escape") return;
  closeLightbox();
  closeCertEditModal();
});

// ---- TOAST ----
let toastTimeout;
function toast(msg, type = "") {
  let el = document.querySelector(".toast");
  if (!el) {
    el = document.createElement("div");
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.className = `toast ${type}`;
  clearTimeout(toastTimeout);
  setTimeout(() => el.classList.add("show"), 10);
  toastTimeout = setTimeout(() => el.classList.remove("show"), 3000);
}

// ---- UTILS ----
function escHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function escAttr(s) { return String(s).replace(/'/g, "&#39;").replace(/"/g, "&quot;"); }

// ---- INIT ----
(function init() {
  renderCertsGrid();
  applyProfile(getProfile());
})();

