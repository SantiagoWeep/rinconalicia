// ---------- Menú móvil  Hola Bren Bren :D----------
const menuBtn = document.getElementById('menuBtn');
const mobileMenu = document.getElementById('mobileMenu');
menuBtn.addEventListener('click', () => {
  const open = mobileMenu.classList.toggle('open');
  menuBtn.setAttribute('aria-expanded', open);
});
mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
  mobileMenu.classList.remove('open');
  menuBtn.setAttribute('aria-expanded', 'false');
}));

// ---------- Firebase: catálogo y panel de administración ---------
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Datos del proyecto: Firebase > Configuración del proyecto > Tus apps > Web (en ese orden pueh)
const firebaseConfig = {
  apiKey: "AIzaSyD_JpotFBd_AQIKBq8BNnId8dGjqgHXVlA",
  authDomain: "el-rincon-de-alicia.firebaseapp.com",
  projectId: "el-rincon-de-alicia",
  appId: "1:584916327527:web:a2946fe2a3ae7a44a3c8c2"
};

const configured = !firebaseConfig.apiKey.startsWith("PEGAR");
let auth, db, currentUser = null, products = [];

//  NUEVO 3.0: categorías de ropa
// Mapa de la categoría guardada en Firebase (ej: "ropa-interior") al texto que se muestra
// en pantalla (ej: "Ropa interior"). Si una prenda vieja no tiene categoría, se usa "otros".
// NUEVO 4.0: ÚNICA lista de categorías. De acá salen los botones del filtro,
// las opciones del panel de administración y los rótulos de cada tarjeta.
// Para agregar una categoría nueva, solo se suma una línea acá.
const CATEGORIES = [
  { id: 'remeras',       label: 'Remeras' },
  { id: 'pantalones',    label: 'Pantalones' },
  { id: 'abrigos',       label: 'Abrigos' },
  { id: 'ropa-interior', label: 'Ropa interior' },
  { id: 'ninos',         label: 'Ropa de niños' },
  { id: 'otros',         label: 'Otros' }
];
const CATEGORY_LABELS = Object.fromEntries(CATEGORIES.map(c => [c.id, c.label]));
// Categoría elegida en el filtro de la colección. "todas" = sin filtrar.
let activeCategory = 'todas';
// Texto escrito en el buscador.
let searchTerm = '';
// NUEVO 6.0: recuerda qué prendas se dibujaron la última vez (para animar solo cuando cambian).
let lastRenderKey = null;
// ===== Fin categorías de ropa =====

const $ = id => document.getElementById(id);
// Normaliza texto para buscar: minúsculas y sin tildes ("Pantalón" = "pantalon").
const norm = s => (s || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
const catOf = p => CATEGORY_LABELS[p.category] ? p.category : 'otros';
const esc = s => (s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function show(el, msg){ el.textContent = msg; el.style.display = msg ? 'block' : 'none'; }

function renderCatalog(){
  const grid = $('cardsGrid');
  const empty = $('cardsEmpty');
  // NUEVO 6.0: también se quitan las tarjetas "esqueleto" que se ven mientras carga Firebase
  grid.querySelectorAll('.card.dynamic, .card.skeleton').forEach(el => el.remove());

  renderCategoryButtons();

  // Filtra por categoría activa Y por lo escrito en el buscador (título, precio y categoría).
  // Las prendas sin categoría conocida cuentan como "otros".
  const words = norm(searchTerm).split(/\s+/).filter(Boolean);
  const visibles = products.filter(p => {
    if(activeCategory !== 'todas' && catOf(p) !== activeCategory) return false;
    const haystack = norm(p.title + ' ' + p.price + ' ' + CATEGORY_LABELS[catOf(p)]);
    return words.every(w => haystack.includes(w));
  });

  // Línea informativa: cuántas prendas se muestran
  const info = $('resultsInfo');
  if(info){
    info.textContent = products.length
      ? (visibles.length === 1 ? '1 prenda' : visibles.length + ' prendas') + (searchTerm.trim() ? ' para "' + searchTerm.trim() + '"' : '')
      : '';
  }

  if(!visibles.length){
    if(empty){
      if(!products.length) empty.textContent = 'Estamos cargando las primeras prendas de la temporada. Volvé en breve.';
      else if(searchTerm.trim()) empty.textContent = 'No encontramos prendas para "' + searchTerm.trim() + '". Probá con otra palabra o escribinos por WhatsApp.';
      else empty.textContent = 'No hay prendas en esta categoría todavía.';
      empty.style.display = 'block';
    }
    return;
  }
  if(empty) empty.style.display = 'none';

  // NUEVO 6.0: las tarjetas aparecen una tras otra (efecto escalonado), pero solo cuando
  // cambia el conjunto de prendas mostradas; así no "parpadea" si se vuelve a dibujar lo mismo.
  const renderKey = visibles.map(p => p.id).join(',');
  const animate = renderKey !== lastRenderKey;
  lastRenderKey = renderKey;

  visibles.forEach((p, idx) => {
    const card = document.createElement('div');
    card.className = 'card dynamic' + (animate ? '' : ' no-anim');
    card.style.setProperty('--i', Math.min(idx, 10));
    // ===== NUEVO: se guarda el id de la prenda en la tarjeta para poder
    // encontrarla de nuevo cuando el cliente la toca y abrir su ventana de detalle =====
    card.setAttribute('data-id', p.id);
    // ===== Fin =====
    // El pequeño rótulo de categoría ayuda a reconocer el tipo de prenda de un vistazo.
    const categoryLabel = CATEGORY_LABELS[catOf(p)];
    card.innerHTML =
      '<div class="card-img">' +
        '<span class="category-tag">' + esc(categoryLabel) + '</span>' +
        '<img src="' + p.photo + '" alt="' + esc(p.title) + '" loading="lazy">' +
        '<span class="card-view">Ver prenda</span>' +
      '</div>' +
      '<div class="body">' +
        '<h3>' + esc(p.title) + '</h3>' +
        '<span class="price">' + esc(p.price) + '</span>' +
      '</div>';
    grid.appendChild(card);
  });
}

// NUEVO 3.0: botones de categoría 
// Al tocar un botón de categoría, se marca como activo, se guarda la categoría elegida
// y se vuelve a dibujar el catálogo ya filtrado.
const categoryFilter = $('categoryFilter');

// NUEVO 4.0: dibuja los botones desde CATEGORIES, con cuántas prendas tiene cada una.
// Las categorías sin prendas se ven atenuadas (pero se pueden tocar).
function renderCategoryButtons(){
  if(!categoryFilter) return;
  const counts = {};
  products.forEach(p => { const c = catOf(p); counts[c] = (counts[c] || 0) + 1; });
  const items = [{ id: 'todas', label: 'Todas', count: products.length }]
    .concat(CATEGORIES.map(c => ({ id: c.id, label: c.label, count: counts[c.id] || 0 })));
  categoryFilter.innerHTML = items.map(it =>
    '<button type="button" role="tab" aria-selected="' + (it.id === activeCategory) + '" class="category-btn' +
    (it.id === activeCategory ? ' active' : '') + (it.count === 0 && it.id !== 'todas' ? ' empty' : '') +
    '" data-category="' + it.id + '">' + esc(it.label) +
    '<span class="category-count">' + it.count + '</span></button>'
  ).join('');
}

if(categoryFilter){
  categoryFilter.addEventListener('click', e => {
    const btn = e.target.closest('.category-btn');
    if(!btn) return;
    activeCategory = btn.getAttribute('data-category');
    renderCatalog();
  });
}

// NUEVO 4.0: buscador. Filtra mientras se escribe; la "x" borra la búsqueda.
const searchInput = $('searchInput'), searchClear = $('searchClear');
if(searchInput){
  searchInput.addEventListener('input', () => {
    searchTerm = searchInput.value;
    searchClear.style.display = searchTerm ? 'block' : 'none';
    renderCatalog();
  });
  searchClear.addEventListener('click', () => {
    searchInput.value = ''; searchTerm = '';
    searchClear.style.display = 'none';
    renderCatalog(); searchInput.focus();
  });
}

// Opciones del selector de categoría del panel de administración (misma lista CATEGORIES).
const prodCategorySelect = $('prodCategory');
if(prodCategorySelect){
  prodCategorySelect.innerHTML = CATEGORIES.map(c => '<option value="' + c.id + '">' + esc(c.label) + '</option>').join('');
}
renderCategoryButtons();
// ===== Fin botones de categoría =====

function renderAdminList(){
  const list = $('adminList');
  list.innerHTML = products.length ? '' : '<p class="admin-empty">Todavía no agregaste prendas.</p>';
  products.forEach(p => {
    const row = document.createElement('div');
    row.className = 'admin-row';
    // ===== NUEVO: se muestra la categoría de la prenda junto al precio =====
    const categoryLabel = CATEGORY_LABELS[catOf(p)];
    row.innerHTML =
      '<img src="' + p.photo + '" alt="">' +
      '<div class="admin-row-info"><strong>' + esc(p.title) + '</strong><span>' + esc(p.price) + ' · ' + esc(categoryLabel) + '</span></div>' +
      '<button type="button" class="admin-del" data-id="' + p.id + '">Eliminar</button>';
    list.appendChild(row);
  });
}

// por temas complicado del almacenamientos del FireBase achicaremos las fotos asi no se llena tan rapido (eso segun chatGPT xd)
function compressImage(file, maxSide = 700, quality = 0.75){
  return new Promise((resolve, reject) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const s = Math.min(1, maxSide / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', quality));
    };
    img.onerror = reject;
    img.src = url;
  });
}

if(configured){
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);

  // Todas las personas ven las prendas en tiempo real
  onSnapshot(query(collection(db, 'prendas'), orderBy('createdAt', 'asc')), snap => {
    products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderCatalog();
    if($('gestionModal').classList.contains('open')) renderAdminList();
  }, err => console.error('Error al leer prendas:', err));

  onAuthStateChanged(auth, user => {
    currentUser = user;
    if(!user) $('gestionModal').classList.remove('open');
  });
}

const gestionModal = $('gestionModal'), loginModal = $('loginModal');

$('adminLink').addEventListener('click', e => {
  e.preventDefault();
  if(currentUser){ gestionModal.classList.add('open'); renderAdminList(); }
  else {
    show($('loginError'), configured ? '' : 'Falta pegar la configuración de Firebase en el código.');
    loginModal.classList.add('open');
  }
});

$('loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  if(!configured) return;
  try {
    await signInWithEmailAndPassword(auth, $('loginEmail').value.trim(), $('loginPassword').value);
    e.target.reset(); show($('loginError'), '');
    loginModal.classList.remove('open');
    gestionModal.classList.add('open'); renderAdminList();
  } catch(err){
    show($('loginError'), 'Correo o contraseña incorrectos.');
  }
});

$('logoutBtn').addEventListener('click', async () => {
  if(auth) await signOut(auth);
  gestionModal.classList.remove('open');
});

$('prodPhoto').addEventListener('change', function(){
  const prev = $('photoPreview'), f = this.files[0];
  if(!f){ prev.style.display = 'none'; return; }
  const r = new FileReader();
  r.onload = ev => { prev.src = ev.target.result; prev.style.display = 'block'; };
  r.readAsDataURL(f);
});

$('adminForm').addEventListener('submit', async e => {
  e.preventDefault();
  if(!currentUser) return;
  const btn = $('addBtn'), f = $('prodPhoto').files[0];
  const title = $('prodTitle').value.trim(), price = $('prodPrice').value.trim();
  // ===== NUEVO: se lee la categoría elegida en el formulario =====
  const category = $('prodCategory').value;
  if(!f || !title || !price) return;
  btn.disabled = true; btn.textContent = 'Guardando…'; show($('adminMsg'), '');
  try {
    const photo = await compressImage(f);
    // La categoría se guarda junto al resto de los datos de la prenda.
    await addDoc(collection(db, 'prendas'), { title, price, photo, category, createdAt: serverTimestamp() });
    e.target.reset(); $('photoPreview').style.display = 'none';
  } catch(err){
    console.error(err);
    show($('adminMsg'), 'No se pudo guardar. Revisá las reglas de Firestore y tu sesión.');
  }
  btn.disabled = false; btn.textContent = 'Agregar prenda';
});

$('adminList').addEventListener('click', async e => {
  const id = e.target.getAttribute && e.target.getAttribute('data-id');
  if(!id || !currentUser) return;
  try { await deleteDoc(doc(db, 'prendas', id)); }
  catch(err){ show($('adminMsg'), 'No se pudo eliminar.'); }
});

$('loginClose').addEventListener('click', () => loginModal.classList.remove('open'));
loginModal.addEventListener('click', e => { if(e.target === loginModal) loginModal.classList.remove('open'); });
$('gestionClose').addEventListener('click', () => gestionModal.classList.remove('open'));
gestionModal.addEventListener('click', e => { if(e.target === gestionModal) gestionModal.classList.remove('open'); });

// ===== NUEVO: ventana de detalle de la prenda + botón "Comprar" por WhatsApp =====
// Al tocar una tarjeta del catálogo se abre una ventana con la foto, el título, el precio
// y la categoría de esa prenda. El botón "Comprar" lleva a WhatsApp con un mensaje
// ya escrito, pidiendo esa prenda puntual.
const productModal = $('productModal');
const WHATSAPP_NUMBER = '5493743613882'; // mismo número que usa "Contacto" en el footer

function openProductModal(p){
  const categoryLabel = CATEGORY_LABELS[catOf(p)];
  $('productModalImg').src = p.photo;
  $('productModalImg').alt = p.title;
  $('productModalCategory').textContent = categoryLabel;
  $('productModalName').textContent = p.title;
  $('productModalPrice').textContent = p.price;

  const mensaje = `Hola! Quiero comprar: ${p.title} (${p.price})`;
  $('productModalBuy').href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(mensaje)}`;

  productModal.classList.add('open');
}

$('cardsGrid').addEventListener('click', e => {
  const card = e.target.closest('.card.dynamic');
  if(!card) return;
  const id = card.getAttribute('data-id');
  const p = products.find(prod => prod.id === id);
  if(p) openProductModal(p);
});

$('productModalClose').addEventListener('click', () => productModal.classList.remove('open'));
productModal.addEventListener('click', e => { if(e.target === productModal) productModal.classList.remove('open'); });
// ===== Fin ventana de detalle de la prenda =====

// hecho por Mariano Deines 