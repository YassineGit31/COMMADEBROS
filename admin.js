/* ==========================================================
   BRO'S BURGER — admin panel logic
   ========================================================== */

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

const loginCard = document.getElementById('loginCard');
const panelCard = document.getElementById('panelCard');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const currentStatusText = document.getElementById('currentStatusText');

/* ---------- AUTH STATE ---------- */
auth.onAuthStateChanged((user) => {
  loginCard.hidden = !!user;
  panelCard.hidden = !user;
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