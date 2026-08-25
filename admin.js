/* ==========================================================
   BRO'S BURGER — admin panel logic
   ========================================================== */

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

const loginCard = document.getElementById('loginCard');
const panelCard = document.getElementById('panelCard');
const availabilityCard = document.getElementById('availabilityCard');
const ordersCard = document.getElementById('ordersCard');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const currentStatusText = document.getElementById('currentStatusText');

let ordersListenerAttached = false;

/* ---------- AUTH STATE ---------- */
auth.onAuthStateChanged((user) => {
  loginCard.hidden = !!user;
  panelCard.hidden = !user;
  availabilityCard.hidden = !user;
  ordersCard.hidden = !user;
  if (user && !ordersListenerAttached){
    attachOrdersListener();
    ordersListenerAttached = true;
  }
});

loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  loginError.hidden = true;
  auth.signInWithEmailAndPassword(email, password).catch(() => {
    loginError.textContent = 'Email ou mot de passe incorrect.';
    loginError.hidden = false;
  });
});

document.getElementById('logoutBtn').addEventListener('click', () => auth.signOut());

/* ---------- OVERRIDE CONTROLS ---------- */
function setOverride(value){
  db.ref('status/override').set(value).catch((err) => {
    alert("Erreur lors de la mise à jour : " + err.message);
  });
}
document.getElementById('forceOpenBtn').addEventListener('click', () => setOverride('open'));
document.getElementById('forceClosedBtn').addEventListener('click', () => setOverride('closed'));
document.getElementById('autoBtn').addEventListener('click', () => setOverride('auto'));

/* ---------- LIVE STATUS DISPLAY ---------- */
const STATUS_LABELS = {
  open: '🟢 Ouvert (forcé manuellement)',
  closed: '🔴 Fermé (forcé manuellement)',
  auto: '🕒 Automatique (horaires normaux)',
};
db.ref('status/override').on('value', (snap) => {
  const val = snap.val() || 'auto';
  currentStatusText.textContent = STATUS_LABELS[val] || val;
});

/* ---------- PRODUCT AVAILABILITY ---------- */
function renderAvailabilityList(){
  const container = document.getElementById('availabilityList');
  container.innerHTML = '';

  MENU.forEach(cat => {
    const catDiv = document.createElement('div');
    catDiv.className = 'avail-category';

    const title = document.createElement('h3');
    title.className = 'avail-category-title';
    title.textContent = `${cat.icon} ${cat.category}`;
    catDiv.appendChild(title);

    cat.items.forEach(item => {
      const row = document.createElement('label');
      row.className = 'avail-row';
      row.innerHTML = `
        <input type="checkbox" data-id="${item.id}">
        <span>${item.name}</span>
      `;
      catDiv.appendChild(row);
    });

    container.appendChild(catDiv);
  });

  container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => {
      const ref = db.ref('status/unavailable/' + cb.dataset.id);
      if (cb.checked) ref.set(true);
      else ref.remove();
    });
  });
}
renderAvailabilityList();

// Keep checkboxes in sync with Firebase (e.g. toggled from another device)
db.ref('status/unavailable').on('value', (snap) => {
  const unavailable = snap.val() || {};
  document.querySelectorAll('#availabilityList input[type="checkbox"]').forEach(cb => {
    cb.checked = !!unavailable[cb.dataset.id];
  });
});

/* ---------- LIVE ORDERS ----------
   This is the guaranteed record of every order — it's written by the
   customer site (brosburger.html) the instant an order is submitted,
   independently of whether WhatsApp or email succeed. Newest first,
   last 100 kept in view so the list stays fast. */
function formatDA(n){
  return new Intl.NumberFormat('fr-FR').format(n) + ' DA';
}

function formatOrderTime(ts){
  if (!ts) return '—';
  return new Date(ts).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
  });
}

function attachOrdersListener(){
  const ordersRef = db.ref('orders').orderByChild('createdAt').limitToLast(100);
  ordersRef.on('value', (snap) => {
    const orders = [];
    snap.forEach(child => {
      orders.push({ id: child.key, ...child.val() });
    });
    orders.reverse(); // newest first
    renderOrdersList(orders);
  }, (err) => {
    document.getElementById('ordersList').innerHTML =
      `<p class="admin-hint">Impossible de charger les commandes : ${err.message}</p>`;
  });
}

function renderOrdersList(orders){
  const container = document.getElementById('ordersList');
  const badge = document.getElementById('ordersNewCount');
  const newCount = orders.filter(o => o.status !== 'traitee').length;

  if (newCount > 0){
    badge.textContent = newCount;
    badge.hidden = false;
  } else {
    badge.hidden = true;
  }

  if (orders.length === 0){
    container.innerHTML = '<p class="admin-hint">Aucune commande pour le moment.</p>';
    return;
  }

  container.innerHTML = orders.map(order => {
    const isNew = order.status !== 'traitee';
    const itemsHtml = (order.items || []).map(item => {
      const suppHtml = (item.supplements || [])
        .map(s => `<div class="order-item-supp">+ ${s.name}</div>`).join('');
      return `<div class="order-item"><span>${item.qty} × ${item.name}</span>${suppHtml}</div>`;
    }).join('');

    return `
      <div class="order-card ${isNew ? 'is-new' : ''}" data-id="${order.id}">
        <div class="order-card-head">
          <div>
            <strong>${order.prenom || ''} ${order.nom || ''}</strong>
            <span class="order-time">${formatOrderTime(order.createdAt)}</span>
          </div>
          <span class="order-status-badge ${isNew ? 'status-new' : 'status-done'}">
            ${isNew ? '🆕 Nouvelle' : '✅ Traitée'}
          </span>
        </div>
        <div class="order-contact">
          📞 <a href="tel:${(order.telephone || '').replace(/\s/g,'')}">${order.telephone || '—'}</a>
          &nbsp;·&nbsp; 📍 ${order.adresse || order.zone || '—'}
        </div>
        <div class="order-items">${itemsHtml}</div>
        ${order.remarque ? `<div class="order-remark">📝 ${order.remarque}</div>` : ''}
        <div class="order-total">Total : ${formatDA(order.total || order.itemsTotal || 0)}</div>
        <button type="button" class="btn-ghost btn-block order-toggle-btn" data-id="${order.id}" data-next="${isNew ? 'traitee' : 'nouvelle'}">
          ${isNew ? 'Marquer comme traitée ✓' : 'Remettre en nouvelle'}
        </button>
      </div>`;
  }).join('');

  container.querySelectorAll('.order-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      db.ref('orders/' + btn.dataset.id + '/status').set(btn.dataset.next);
    });
  });
}
