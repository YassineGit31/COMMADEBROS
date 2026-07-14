/* ==========================================================
   BRO'S BURGER — admin panel logic
   ========================================================== */

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

const loginCard = document.getElementById('loginCard');
const panelCard = document.getElementById('panelCard');
const availabilityCard = document.getElementById('availabilityCard');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const currentStatusText = document.getElementById('currentStatusText');

/* ---------- AUTH STATE ---------- */
auth.onAuthStateChanged((user) => {
  loginCard.hidden = !!user;
  panelCard.hidden = !user;
  availabilityCard.hidden = !user;
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
