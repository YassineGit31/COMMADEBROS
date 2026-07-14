/* ==========================================================
   BRO'S BURGER — ordering logic
   ========================================================== */

const WHATSAPP_NUMBER = "213564222354"; // international format, no + (needed by wa.me)

/* ---------- OPENING HOURS (Algeria time, Africa/Algiers = fixed UTC+1, no DST) ---------- */
const OPENING_HOURS = {
  // Sunday(0) - Thursday(4): lunch + dinner
  standard: [
    { start: 11 * 60, end: 15 * 60,           label: "11h00 – 15h00" },
    { start: 17 * 60 + 30, end: 23 * 60 + 30, label: "17h30 – 23h30" },
  ],
  // Friday(5) - Saturday(6): dinner only, opens earlier, no lunch service
  weekend: [
    { start: 18 * 60, end: 23 * 60 + 30, label: "18h00 – 23h30" },
  ],
};

function getAlgeriaMinutes(){
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Algiers',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  let hour = parseInt(parts.find(p => p.type === 'hour').value, 10);
  const minute = parseInt(parts.find(p => p.type === 'minute').value, 10);
  if (hour === 24) hour = 0; // some locales report midnight as 24:00
  return hour * 60 + minute;
}

function getAlgeriaWeekday(){
  // 0 = Sunday ... 6 = Saturday, based on Africa/Algiers local date
  const wd = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Algiers',
    weekday: 'short',
  }).formatToParts(new Date()).find(p => p.type === 'weekday').value;
  return { Sun:0, Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6 }[wd];
}

function isWeekendSchedule(day){
  return day === 5 || day === 6; // Friday, Saturday
}

function getTodayHours(){
  return isWeekendSchedule(getAlgeriaWeekday()) ? OPENING_HOURS.weekend : OPENING_HOURS.standard;
}

function isShopOpen(){
  if (shopOverride === 'open') return true;
  if (shopOverride === 'closed') return false;
  // 'auto' (default) -> fall back to the normal schedule below
  const now = getAlgeriaMinutes();
  return getTodayHours().some(r => {
    if (r.end < r.start){
      // range crosses midnight, e.g. 18:30 -> 02:00
      return now >= r.start || now <= r.end;
    }
    return now >= r.start && now <= r.end;
  });
}

/* ---------- LIVE OPEN/CLOSED OVERRIDE + PRODUCT AVAILABILITY (set from admin.html) ---------- */
let shopOverride = 'auto'; // 'auto' | 'open' | 'closed' — synced live from Firebase
try {
  firebase.initializeApp(firebaseConfig);

  firebase.database().ref('status/override').on('value',
    (snap) => {
      shopOverride = snap.val() || 'auto';
      updateStatusPill();
    },
    (err) => {
      console.warn('Live status control unavailable, using automatic hours only.', err);
    }
  );

  firebase.database().ref('status/unavailable').on('value',
    (snap) => {
      unavailableItems = snap.val() || {};
      renderMenu(); // re-render so sold-out items reflect instantly
    },
    (err) => {
      console.warn('Live availability control unavailable, showing all items as available.', err);
    }
  );
} catch (err) {
  console.warn('Firebase not configured yet — using automatic hours and full availability only.', err);
}

/* ---------- DELIVERY FEES BY ZONE ---------- */
const DELIVERY_FEES = {
  "Camp 02": 100,
  "Camp 03": 150,
  "Camp 04": 100,
  "Camp 05": 100,
  "Camp 06": 100,
  "Camp 07": 150,
  "Camp 08": 200,
  "Camp 09": 200,
  "Finix": 200,
  "Betioua": 200,
  "Ain El Bia": 100,
  "CHHAYRIA": 300,
  "TOSYALI": 400,
  "Arzew": 400,
  "F4": 150,
  "EMPORTE": 0,
  // "Autre" is intentionally absent — no fixed fee, confirmed manually
};

/* ---------- MENU DATA ---------- */
/* MENU itself now lives in menu-data.js (loaded before this file),
   shared with admin.html so the availability list always matches. */

/* ---------- PRODUCT AVAILABILITY (set from admin.html) ---------- */
let unavailableItems = {}; // { "burger-chicken": true, ... } — synced live from Firebase
function isAvailable(id){
  return !unavailableItems[id];
}

/* flat lookup: id -> item */
const PRODUCTS = {};
MENU.forEach(cat => cat.items.forEach(it => PRODUCTS[it.id] = it));

/* ---------- STATE ---------- */
let cart = []; // { id, qty }
let editing = false;

/* ---------- HELPERS ---------- */
function formatDA(n){
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' DA';
}
function cartTotal(){
  return cart.reduce((sum, row) => sum + PRODUCTS[row.id].price * row.qty, 0);
}
function cartCount(){
  return cart.reduce((sum, row) => sum + row.qty, 0);
}

/* ---------- RENDER MENU ---------- */
function renderMenu(){
  const container = document.getElementById('menuContainer');
  container.innerHTML = '';

  MENU.forEach(cat => {
    const section = document.createElement('section');
    section.className = 'category';
    section.id = 'cat-' + cat.category.toLowerCase().replace(/\s+/g,'-');

    const header = document.createElement('div');
    header.className = 'category-header';
    header.innerHTML = `<span class="category-icon">${cat.icon}</span><h2 class="category-title">${cat.category}</h2>`;
    section.appendChild(header);

    if (cat.isSupplement){
      section.appendChild(renderSupplementPanel(cat));
    } else {
      const grid = document.createElement('div');
      grid.className = 'card-grid';
      cat.items.forEach(item => grid.appendChild(renderProductCard(item)));
      section.appendChild(grid);
    }

    container.appendChild(section);
  });

  observeCards();
}

function renderProductCard(item){
  const card = document.createElement('article');
  card.className = 'product-card';
  card.dataset.id = item.id;

  const unavailable = !isAvailable(item.id);
  if (unavailable) card.classList.add('unavailable');

  const descHtml = (item.desc || []).map(d => `<li>${d}</li>`).join('');
  card.innerHTML = `
    <div class="product-head">
      <span class="product-name">${item.name}</span>
      <span class="product-price">${formatDA(item.price)}</span>
    </div>
    ${item.desc ? `<ul class="product-desc">${descHtml}</ul>` : ''}
    ${item.badge && !unavailable ? `<span class="product-badge">${item.badge}</span>` : ''}
    ${unavailable ? `<span class="sold-out-badge">😔 Rupture de stock</span>` : ''}
    <div class="product-foot">
      <div class="qty-stepper">
        <button type="button" class="qty-btn" data-action="dec" ${unavailable ? 'disabled' : ''}>−</button>
        <span class="qty-value">1</span>
        <button type="button" class="qty-btn" data-action="inc" ${unavailable ? 'disabled' : ''}>+</button>
      </div>
      <button type="button" class="btn-add" ${unavailable ? 'disabled' : ''}>${unavailable ? 'Indisponible' : 'Ajouter'}</button>
    </div>
  `;

  const qtyValue = card.querySelector('.qty-value');
  card.querySelector('[data-action="dec"]').addEventListener('click', () => {
    let v = parseInt(qtyValue.textContent, 10);
    if (v > 1) qtyValue.textContent = v - 1;
  });
  card.querySelector('[data-action="inc"]').addEventListener('click', () => {
    let v = parseInt(qtyValue.textContent, 10);
    qtyValue.textContent = v + 1;
  });
  const addBtn = card.querySelector('.btn-add');
  addBtn.addEventListener('click', () => {
    if (!isAvailable(item.id)) return;
    if (!isShopOpen()){ showClosedNotice(); return; }
    const qty = parseInt(qtyValue.textContent, 10);
    addToCart(item.id, qty);
    qtyValue.textContent = '1';
    flashAdded(addBtn);
  });

  return card;
}

function renderSupplementPanel(cat){
  const panel = document.createElement('div');
  panel.className = 'supplement-panel';

  const grid = document.createElement('div');
  grid.className = 'supplement-grid';
  cat.items.forEach(item => {
    const unavailable = !isAvailable(item.id);
    const label = document.createElement('label');
    label.className = 'supplement-item' + (unavailable ? ' unavailable' : '');
    label.innerHTML = `
      <input type="checkbox" value="${item.id}" ${unavailable ? 'disabled' : ''}>
      <span>${item.name}${unavailable ? ' <em>(rupture)</em>' : ''}</span>
      <b>+${formatDA(item.price)}</b>
    `;
    grid.appendChild(label);
  });
  panel.appendChild(grid);

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'btn-add';
  addBtn.textContent = 'Ajouter les suppléments sélectionnés';
  addBtn.addEventListener('click', () => {
    if (!isShopOpen()){ showClosedNotice(); return; }
    const checked = panel.querySelectorAll('input[type="checkbox"]:checked');
    if (!checked.length) return;
    checked.forEach(cb => { addToCart(cb.value, 1); cb.checked = false; });
    flashAdded(addBtn);
  });
  panel.appendChild(addBtn);

  return panel;
}

function flashAdded(btn){
  const original = btn.textContent;
  btn.classList.add('just-added');
  btn.textContent = 'Ajouté ✓';
  setTimeout(() => {
    btn.classList.remove('just-added');
    btn.textContent = original;
  }, 900);
}

function observeCards(){
  const cards = document.querySelectorAll('.product-card');
  if (!('IntersectionObserver' in window)){
    cards.forEach(c => c.classList.add('visible'));
    return;
  }
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting){
        setTimeout(() => entry.target.classList.add('visible'), i * 40);
        obs.unobserve(entry.target);
      }
    });
  }, { threshold:.1, rootMargin:'0px 0px -40px 0px' });
  cards.forEach(c => obs.observe(c));
}

/* ---------- CART LOGIC ---------- */
function addToCart(id, qty){
  const existing = cart.find(r => r.id === id);
  if (existing) existing.qty += qty;
  else cart.push({ id, qty });
  renderCart();
  openDrawerBriefFeedback();
}

function removeFromCart(id){
  cart = cart.filter(r => r.id !== id);
  renderCart();
}

function changeCartQty(id, delta){
  const row = cart.find(r => r.id === id);
  if (!row) return;
  row.qty += delta;
  if (row.qty <= 0) cart = cart.filter(r => r.id !== id);
  renderCart();
}

function clearCart(){
  cart = [];
  editing = false;
  document.getElementById('ticket').classList.remove('editing');
  document.getElementById('editBtn').classList.remove('active');
  document.getElementById('editBtn').textContent = 'Modifier';
  renderCart();
}

function renderCart(){
  const itemsEl = document.getElementById('cartItems');
  const emptyMsg = document.getElementById('cartEmptyMsg');
  const totalRow = document.getElementById('ticketTotalRow');
  const divider = document.getElementById('ticketDivider');
  const actions = document.getElementById('ticketActions');
  const deliveryHint = document.getElementById('ticketDeliveryHint');

  itemsEl.innerHTML = '';

  if (cart.length === 0){
    itemsEl.appendChild(emptyMsg);
    totalRow.hidden = true;
    divider.hidden = true;
    actions.hidden = true;
    deliveryHint.hidden = true;
  } else {
    cart.forEach(row => {
      const p = PRODUCTS[row.id];
      const line = document.createElement('div');
      line.className = 'cart-row';
      line.innerHTML = `
        <span class="cart-row-qty">${row.qty}×</span>
        <span class="cart-row-stepper">
          <button type="button" class="mini-qty-btn" data-id="${row.id}" data-delta="-1">−</button>
          <span class="cart-row-qty-value">${row.qty}</span>
          <button type="button" class="mini-qty-btn" data-id="${row.id}" data-delta="1">+</button>
        </span>
        <span class="cart-row-name">${p.name}</span>
        <span class="cart-row-price">${formatDA(p.price * row.qty)}</span>
        <button type="button" class="cart-row-remove" data-id="${row.id}" aria-label="Retirer">✕</button>
      `;
      itemsEl.appendChild(line);
    });

    itemsEl.querySelectorAll('.mini-qty-btn').forEach(btn => {
      btn.addEventListener('click', () => changeCartQty(btn.dataset.id, parseInt(btn.dataset.delta,10)));
    });
    itemsEl.querySelectorAll('.cart-row-remove').forEach(btn => {
      btn.addEventListener('click', () => removeFromCart(btn.dataset.id));
    });

    document.getElementById('cartTotal').textContent = formatDA(cartTotal());
    totalRow.hidden = false;
    divider.hidden = false;
    actions.hidden = false;
    deliveryHint.hidden = false;
  }

  // top pill + mobile fab
  const count = cartCount();
  document.getElementById('cartCountTop').textContent = count;
  document.getElementById('cartFabCount').textContent = count + (count === 1 ? ' article' : ' articles');
  document.getElementById('cartFabTotal').textContent = formatDA(cartTotal());
  document.getElementById('cartFab').hidden = count === 0;
}

/* briefly nudge the mobile drawer open when adding, only if not already open? keep closed by default, just update badge */
function openDrawerBriefFeedback(){ /* no-op: badge update is enough feedback */ }

/* ---------- MOBILE DRAWER ---------- */
const drawerBackdrop = document.getElementById('drawerBackdrop');

function openDrawer(){
  document.querySelector('.cart-column').classList.add('open');
  drawerBackdrop.classList.add('open');
}
function closeDrawer(){
  document.querySelector('.cart-column').classList.remove('open');
  drawerBackdrop.classList.remove('open');
}
document.getElementById('cartFab').addEventListener('click', openDrawer);
document.getElementById('cartToggleBtn').addEventListener('click', openDrawer);
drawerBackdrop.addEventListener('click', closeDrawer);

/* ---------- EDIT / CLEAR / ORDER BUTTONS ---------- */
document.getElementById('editBtn').addEventListener('click', () => {
  editing = !editing;
  document.getElementById('ticket').classList.toggle('editing', editing);
  const btn = document.getElementById('editBtn');
  btn.textContent = editing ? 'Terminé' : 'Modifier';
  btn.classList.toggle('active', editing);
});
document.getElementById('clearBtn').addEventListener('click', () => {
  if (cart.length === 0) return;
  if (confirm('Vider tout le panier ?')) clearCart();
});
document.getElementById('orderBtn').addEventListener('click', () => {
  if (cart.length === 0) return;
  if (!isShopOpen()){ showClosedNotice(); return; }
  openModal();
});

/* ---------- ORDER MODAL ---------- */
const modalBackdrop = document.getElementById('modalBackdrop');
const formStep = document.getElementById('formStep');
const successStep = document.getElementById('successStep');
const submitBtn = document.getElementById('submitOrderBtn');

function openModal(){
  modalBackdrop.classList.add('open');
  document.getElementById('formError').hidden = true;
  showFormStep();
}
function closeModal(){
  modalBackdrop.classList.remove('open');
}
function showFormStep(){
  formStep.hidden = false;
  successStep.hidden = true;
}
function showSuccessStep(){
  formStep.hidden = true;
  successStep.hidden = false;
}
document.getElementById('modalClose').addEventListener('click', closeModal);
modalBackdrop.addEventListener('click', (e) => { if (e.target === modalBackdrop) closeModal(); });
document.getElementById('closeSuccessBtn').addEventListener('click', closeModal);

document.getElementById('fieldAdresseZone').addEventListener('change', (e) => {
  const zone = e.target.value;
  const isOther = zone === 'Autre';
  const otherLabel = document.getElementById('fieldAdresseOtherLabel');
  otherLabel.hidden = !isOther;
  if (!isOther) document.getElementById('fieldAdresseOther').value = '';
  updateDeliveryFeeNote(zone);
});

function updateDeliveryFeeNote(zone){
  const note = document.getElementById('deliveryFeeNote');
  if (!zone){ note.textContent = ''; return; }
  const fee = DELIVERY_FEES[zone];
  if (fee !== undefined){
    note.textContent = `🛵 Livraison ${zone} : ${formatDA(fee)} — Total : ${formatDA(cartTotal() + fee)}`;
  } else {
    note.textContent = '🛵 Frais de livraison à confirmer avec vous (zone hors liste)';
  }
}

document.getElementById('orderForm').addEventListener('submit', (e) => {
  e.preventDefault();

  if (!isShopOpen()){ closeModal(); showClosedNotice(); return; }

  const nom = document.getElementById('fieldNom').value.trim();
  const prenom = document.getElementById('fieldPrenom').value.trim();
  const telephone = document.getElementById('fieldTelephone').value.trim();
  const zone = document.getElementById('fieldAdresseZone').value;
  const adresseAutre = document.getElementById('fieldAdresseOther').value.trim();
  const adresse = zone === 'Autre' ? adresseAutre : zone;
  const remarque = document.getElementById('fieldRemarque').value.trim();
  const errorEl = document.getElementById('formError');

  if (!nom || !prenom || !telephone || !zone){
    errorEl.textContent = 'Merci de remplir tous les champs obligatoires (*).';
    errorEl.hidden = false;
    return;
  }
  if (zone === 'Autre' && !adresseAutre){
    errorEl.textContent = 'Merci de préciser votre adresse.';
    errorEl.hidden = false;
    return;
  }
  const phoneDigits = telephone.replace(/[^\d]/g,'');
  if (phoneDigits.length < 9){
    errorEl.textContent = 'Merci de vérifier votre numéro de téléphone.';
    errorEl.hidden = false;
    return;
  }
  if (cart.length === 0){
    errorEl.textContent = 'Votre panier est vide.';
    errorEl.hidden = false;
    return;
  }

  errorEl.hidden = true;
  const orderText = buildOrderText({ nom, prenom, telephone, adresse, zone, remarque });

  sendOrderToWhatsapp(orderText);
  sendOrderByEmail({ nom, prenom, telephone, adresse, message: orderText });

  document.getElementById('orderSummaryBox').textContent = orderText;
  showSuccessStep();
  clearCart();
  closeDrawer();
  document.getElementById('orderForm').reset();
  document.getElementById('fieldAdresseOtherLabel').hidden = true;
  document.getElementById('deliveryFeeNote').textContent = '';
});

function buildOrderText({ nom, prenom, telephone, adresse, zone, remarque }){
  const lines = [];
  lines.push('🍔 NOUVELLE COMMANDE');
  lines.push('');
  lines.push(`Nom : ${nom}`);
  lines.push(`Prénom : ${prenom}`);
  lines.push(`Téléphone : ${telephone}`);
  lines.push(`Adresse : ${adresse}`);
  lines.push('');
  lines.push('────────────');
  lines.push('Commande :');
  cart.forEach(row => {
    const p = PRODUCTS[row.id];
    lines.push(`${row.qty} × ${p.name}`);
  });
  lines.push('────────────');
  const itemsTotal = cartTotal();
  const fee = DELIVERY_FEES[zone];
  lines.push(`Sous-total : ${formatDA(itemsTotal)}`);
  if (fee !== undefined){
    lines.push(`Livraison (${zone}) : ${formatDA(fee)}`);
    lines.push(`TOTAL : ${formatDA(itemsTotal + fee)}`);
  } else {
    lines.push('Livraison : à confirmer');
    lines.push(`TOTAL (hors livraison) : ${formatDA(itemsTotal)}`);
  }
  lines.push('');
  lines.push(`Remarque : ${remarque ? remarque : 'Aucune'}`);
  return lines.join('\n');
}

/* Opens WhatsApp with the order pre-typed. The customer still taps
   Envoyer ➤ once inside WhatsApp to actually send it — no platform
   allows a site to skip that final tap. */
function sendOrderToWhatsapp(text){
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
}

/* ---------- EMAILJS (automatic email copy to the owner, no tap needed) ----------
   Setup (free, ~5 min, do it once at emailjs.com):
   1. Create an account → Add Email Service (e.g. Gmail) → note its Service ID
   2. Create an Email Template with variables {{nom}} {{prenom}} {{telephone}}
      {{adresse}} {{message}} → note its Template ID
   3. Account → General → copy your Public Key
   4. Paste all 3 values below, replacing the placeholders. */
const EMAILJS_PUBLIC_KEY  = "YOUR_PUBLIC_KEY";
const EMAILJS_SERVICE_ID  = "YOUR_SERVICE_ID";
const EMAILJS_TEMPLATE_ID = "YOUR_TEMPLATE_ID";

try {
  if (EMAILJS_PUBLIC_KEY !== 'YOUR_PUBLIC_KEY') emailjs.init(EMAILJS_PUBLIC_KEY);
} catch (err) {
  console.warn('EmailJS not configured yet — orders still go through WhatsApp.', err);
}

function sendOrderByEmail(params){
  if (EMAILJS_PUBLIC_KEY === 'YOUR_PUBLIC_KEY') return; // not configured yet, skip silently
  emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, params).catch((err) => {
    console.warn('Email send failed (order still sent via WhatsApp):', err);
  });
}

/* ---------- TOPBAR SCROLL SHADOW ---------- */
window.addEventListener('scroll', () => {
  const topbar = document.getElementById('topbar');
  if (window.scrollY > 40) topbar.style.borderBottomColor = 'rgba(249,115,22,.25)';
  else topbar.style.borderBottomColor = '';
});

/* ---------- RENDER OPENING HOURS TEXT (single source of truth: OPENING_HOURS) ---------- */
function renderOpeningHoursText(){
  const standardLabel = OPENING_HOURS.standard.map(r => r.label).join(' et ');
  const weekendLabel = OPENING_HOURS.weekend.map(r => r.label).join(' et ');

  document.getElementById('footerHours').textContent = standardLabel;
  document.getElementById('footerHoursWeekend').textContent = weekendLabel;

  document.getElementById('hoursBox').innerHTML =
    `<p>🕐 Dim – Jeu : ${standardLabel}</p>` +
    `<p>🕐 Ven – Sam : ${weekendLabel}</p>`;
}
renderOpeningHoursText();

/* ---------- CLOSED NOTICE MODAL ---------- */
const closedBackdrop = document.getElementById('closedBackdrop');
function showClosedNotice(){
  const titleEl = document.getElementById('closedTitle');
  const subEl = document.querySelector('#closedBackdrop .modal-sub');
  const hoursBoxEl = document.getElementById('hoursBox');

  if (shopOverride === 'closed'){
    titleEl.textContent = '😴 Fermeture exceptionnelle';
    subEl.textContent = 'Nous sommes fermés pour le moment, merci de repasser un peu plus tard.';
    hoursBoxEl.style.display = 'none';
  } else {
    titleEl.textContent = '😴 On est fermés pour le moment';
    subEl.textContent = "Merci de repasser pendant nos horaires d'ouverture :";
    hoursBoxEl.style.display = '';
  }
  closedBackdrop.classList.add('open');
}
function hideClosedNotice(){
  closedBackdrop.classList.remove('open');
}
document.getElementById('closedModalClose').addEventListener('click', hideClosedNotice);
document.getElementById('closedOkBtn').addEventListener('click', hideClosedNotice);
closedBackdrop.addEventListener('click', (e) => { if (e.target === closedBackdrop) hideClosedNotice(); });

/* ---------- LIVE OPEN/CLOSED STATUS PILL ---------- */
function updateStatusPill(){
  const pill = document.getElementById('statusPill');
  if (isShopOpen()){
    pill.textContent = shopOverride === 'open' ? '🟢 Ouvert (forcé)' : '🟢 Ouvert';
    pill.classList.remove('closed');
  } else {
    pill.textContent = shopOverride === 'closed' ? '🔴 Fermé (exceptionnel)' : '🔴 Fermé';
    pill.classList.add('closed');
  }
}
updateStatusPill();
setInterval(updateStatusPill, 30000); // re-check every 30s in case the tab stays open across a boundary

/* ---------- INIT ---------- */
renderMenu();
renderCart();
