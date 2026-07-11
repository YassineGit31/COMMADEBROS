/* ==========================================================
   BRO'S BURGER — ordering logic
   ========================================================== */

const WHATSAPP_NUMBER = "213665941989"; // 0563 52 24 28 in international format

/* ---------- MENU DATA (single source of truth for prices) ---------- */
const MENU = [
  {
    category: "Burgers",
    icon: "🍔",
    items: [
      { id:"burger-pollo",     name:"Pollo",           price:200, desc:["Salade","Tomate","Escalope","Fromage slice","Sauce Bros"] },
      { id:"burger-classic",   name:"Classic",         price:300, desc:["Salade","Tomate","Viande hachée","Fromage slice","Sauce Bros"] },
      { id:"burger-chicken",   name:"Chicken",         price:400, desc:["Salade","Tomate","Tenders","Gouda","Sauce Bros"] },
      { id:"burger-beef",      name:"Beef",            price:450, desc:["Salade","Tomate","Viande hachée","Cornichon","Oignon caramélisé","Gouda","Sauce Bros"] },
      { id:"burger-extrabeef", name:"Extra Beef",      price:550, desc:["Salade","Tomate","Viande hachée","Cornichon","Oignon caramélisé","Gouda","Sauce Bros","Sauce fromagère"] },
      { id:"burger-story",     name:"Story Burger",    price:550, desc:["Salade","Tomate","Viande hachée","Escalope","Œuf","Gouda","Sauce Bros","Sauce fromagère"], badge:"🎁 Frites + boisson offertes" },
    ]
  },
  {
    category: "Sandwich Philly",
    icon: "🥪",
    items: [
      { id:"philly-poulet",   name:"Philly Poulet Pané",     price:400, desc:["Poulet pané","Fromage fondu","Pain philly grillé"] },
      { id:"philly-escalope", name:"Philly Escalope Grillée",price:400, desc:["Escalope grillée","Fromage fondu","Pain philly grillé"] },
      { id:"philly-boeuf",    name:"Philly Bœuf Haché",      price:550, desc:["Bœuf haché","Fromage fondu","Pain philly grillé"] },
      { id:"philly-mix",      name:"Philly Mix",             price:600, desc:["Poulet & bœuf haché","Fromage fondu","Pain philly grillé"] },
      { id:"philly-supreme",  name:"Philly Suprême",         price:650, desc:["Poulet, bœuf & escalope","Fromage fondu","Pain philly grillé"] },
    ]
  },
  {
    category: "Poutines",
    icon: "🍟",
    items: [
      { id:"poutine-poulet",   name:"Poutine Poulet Pané",      price:450, desc:["Frites","Poulet pané","Sauce fromagère"] },
      { id:"poutine-escalope", name:"Poutine Escalope Grillée", price:450, desc:["Frites","Escalope grillée","Sauce fromagère"] },
      { id:"poutine-fumato",   name:"Poutine Fumato",           price:450, desc:["Frites","Viande fumée","Sauce fromagère"] },
      { id:"poutine-boeuf",    name:"Poutine Bœuf Haché",       price:550, desc:["Frites","Bœuf haché","Sauce fromagère"] },
      { id:"poutine-mix",      name:"Poutine Mix",              price:600, desc:["Frites","Poulet & bœuf","Sauce fromagère"] },
      { id:"poutine-pouletx2", name:"Poutine Poulet x2",        price:650, desc:["Frites","Double poulet pané","Sauce fromagère"] },
      { id:"poutine-mixx2",    name:"Poutine Mix x2",           price:800, desc:["Frites","Double poulet & bœuf","Sauce fromagère"] },
      { id:"poutine-boeufx2",  name:"Poutine Bœuf x2",          price:750, desc:["Frites","Double bœuf haché","Sauce fromagère"] },
    ]
  },
  {
    category: "Plats",
    icon: "🍽️",
    items: [
      { id:"plat-hiver",   name:"Plat Hiver",   price:850, desc:["Salade composée","Poulet pané","Viande hachée","Omelette fromagère","Frites","Sauce Bros","Sauce fromagère","Cheddar"] },
      { id:"plat-chicken", name:"Plat Chicken", price:600, desc:["Salade composée","Poulet pané","Sauce fromagère","Frites","Sauce Bros","Cheddar"] },
    ]
  },
  {
    category: "Salades",
    icon: "🥗",
    items: [
      { id:"salade-cesar", name:"Salade César", price:550, desc:["Salade","Tomate","Cornichon","Maïs","Cheddar","Poulet pané","Sauce César","Miel","Ananas"] },
    ]
  },
  {
    category: "Tenders",
    icon: "🍗",
    items: [
      { id:"tenders-3", name:"Tenders x3", price:350, desc:["3 tenders de poulet croustillants"] },
      { id:"tenders-5", name:"Tenders x5", price:550, desc:["5 tenders de poulet croustillants"] },
    ]
  },
  {
    category: "Frites",
    icon: "🍟",
    items: [
      { id:"frites-simple",  name:"Frites Simple",  price:100, desc:["Frites maison croustillantes"] },
      { id:"frites-fromage", name:"Frites Fromage", price:200, desc:["Frites nappées de sauce fromagère"] },
    ]
  },
  {
    category: "Suppléments",
    icon: "➕",
    isSupplement: true,
    items: [
      { id:"supp-fromage",   name:"Fromage",        price:100 },
      { id:"supp-poulet",    name:"Poulet",         price:150 },
      { id:"supp-viande",    name:"Viande hachée",  price:200 },
      { id:"supp-ananas",    name:"Ananas",         price:150 },
      { id:"supp-pain",      name:"Pain burger",    price:30  },
      { id:"supp-champignon",name:"Champignons",    price:150 },
    ]
  },
  {
    category: "Boissons",
    icon: "🥤",
    items: [
      { id:"boisson-30cl",    name:"Boisson 30 cl", price:70,  desc:["Au choix"] },
      { id:"boisson-canette", name:"Canette",       price:100, desc:["33 cl"] },
      { id:"boisson-1l",      name:"Boisson 1 L",   price:150, desc:["Au choix"] },
    ]
  },
];

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

  const descHtml = (item.desc || []).map(d => `<li>${d}</li>`).join('');
  card.innerHTML = `
    <div class="product-head">
      <span class="product-name">${item.name}</span>
      <span class="product-price">${formatDA(item.price)}</span>
    </div>
    ${item.desc ? `<ul class="product-desc">${descHtml}</ul>` : ''}
    ${item.badge ? `<span class="product-badge">${item.badge}</span>` : ''}
    <div class="product-foot">
      <div class="qty-stepper">
        <button type="button" class="qty-btn" data-action="dec">−</button>
        <span class="qty-value">1</span>
        <button type="button" class="qty-btn" data-action="inc">+</button>
      </div>
      <button type="button" class="btn-add">Ajouter</button>
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
    const label = document.createElement('label');
    label.className = 'supplement-item';
    label.innerHTML = `
      <input type="checkbox" value="${item.id}">
      <span>${item.name}</span>
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

  itemsEl.innerHTML = '';

  if (cart.length === 0){
    itemsEl.appendChild(emptyMsg);
    totalRow.hidden = true;
    divider.hidden = true;
    actions.hidden = true;
  } else {
    cart.forEach(row => {
      const p = PRODUCTS[row.id];
      const line = document.createElement('div');
      line.className = 'cart-row';
      line.innerHTML = `
        <span class="cart-row-qty">${row.qty}×</span>
        <span class="cart-row-stepper">
          <button type="button" class="mini-qty-btn" data-id="${row.id}" data-delta="-1">−</button>
          <span class="cart-row-qty" style="min-width:16px;text-align:center;">${row.qty}</span>
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
  openModal();
});

/* ---------- ORDER MODAL ---------- */
const modalBackdrop = document.getElementById('modalBackdrop');
function openModal(){
  modalBackdrop.classList.add('open');
  document.getElementById('formError').hidden = true;
}
function closeModal(){
  modalBackdrop.classList.remove('open');
}
document.getElementById('modalClose').addEventListener('click', closeModal);
modalBackdrop.addEventListener('click', (e) => { if (e.target === modalBackdrop) closeModal(); });

document.getElementById('orderForm').addEventListener('submit', (e) => {
  e.preventDefault();

  const nom = document.getElementById('fieldNom').value.trim();
  const prenom = document.getElementById('fieldPrenom').value.trim();
  const telephone = document.getElementById('fieldTelephone').value.trim();
  const adresse = document.getElementById('fieldAdresse').value.trim();
  const remarque = document.getElementById('fieldRemarque').value.trim();
  const errorEl = document.getElementById('formError');

  if (!nom || !prenom || !telephone || !adresse){
    errorEl.textContent = 'Merci de remplir tous les champs obligatoires (*).';
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
  sendOrderToWhatsapp({ nom, prenom, telephone, adresse, remarque });
});

function sendOrderToWhatsapp({ nom, prenom, telephone, adresse, remarque }){
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
  lines.push(`TOTAL : ${formatDA(cartTotal())}`);
  lines.push('');
  lines.push(`Remarque : ${remarque ? remarque : 'Aucune'}`);

  const text = encodeURIComponent(lines.join('\n'));
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;
  window.open(url, '_blank');

  closeModal();
  clearCart();
  closeDrawer();
  document.getElementById('orderForm').reset();
}

/* ---------- TOPBAR SCROLL SHADOW ---------- */
window.addEventListener('scroll', () => {
  const topbar = document.getElementById('topbar');
  if (window.scrollY > 40) topbar.style.borderBottomColor = 'rgba(249,115,22,.25)';
  else topbar.style.borderBottomColor = '';
});

/* ---------- INIT ---------- */
renderMenu();
renderCart();