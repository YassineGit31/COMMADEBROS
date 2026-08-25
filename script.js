/* ==========================================================
   BRO'S BURGER — ordering logic
   ========================================================== */

/* ---------- CONTACT ---------- */

const WHATSAPP_NUMBER = "213563522428";
const SHOP_PHONE_TEL = "+213563522428";


/* ==========================================================
   TELEGRAM
   ----------------------------------------------------------
   IMPORTANT:
   This works directly from the browser, but exposing the
   Telegram bot token in public JavaScript is NOT secure.

   For testing:
   1. Put your bot token below.
   2. Keep the chat ID.
   3. Every new order will be sent to Telegram automatically.
   ========================================================== */

const TELEGRAM_BOT_TOKEN = "8906375233:AAEt-9-1DqFBFrkmj6d6emNlxB1dhQ24o1E";
const TELEGRAM_CHAT_ID = "1732785208";


/* ---------- OPENING HOURS ---------- */

const OPENING_HOURS = {

  // Sunday - Thursday
  standard: [
    {
      start: 11 * 60,
      end: 15 * 60,
      label: "11h00 – 15h00"
    },
    {
      start: 17 * 60 + 30,
      end: 23 * 60 + 30,
      label: "17h30 – 23h30"
    }
  ],

  // Friday - Saturday
  weekend: [
    {
      start: 18 * 60,
      end: 23 * 60 + 30,
      label: "18h00 – 23h30"
    }
  ]
};


/* ==========================================================
   ALGERIA TIME
   ========================================================== */

function getAlgeriaMinutes() {

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Algiers",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(new Date());

  let hour = parseInt(
    parts.find(p => p.type === "hour").value,
    10
  );

  const minute = parseInt(
    parts.find(p => p.type === "minute").value,
    10
  );

  if (hour === 24) {
    hour = 0;
  }

  return hour * 60 + minute;
}


function getAlgeriaWeekday() {

  const wd = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Algiers",
    weekday: "short"
  })
    .formatToParts(new Date())
    .find(p => p.type === "weekday").value;

  return {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6
  }[wd];
}


function isWeekendSchedule(day) {
  return day === 5 || day === 6;
}


function getTodayHours() {

  return isWeekendSchedule(getAlgeriaWeekday())
    ? OPENING_HOURS.weekend
    : OPENING_HOURS.standard;
}


function isShopOpen() {

  if (shopOverride === "open") {
    return true;
  }

  if (shopOverride === "closed") {
    return false;
  }

  const now = getAlgeriaMinutes();

  return getTodayHours().some(range => {

    if (range.end < range.start) {

      return (
        now >= range.start ||
        now <= range.end
      );

    }

    return (
      now >= range.start &&
      now <= range.end
    );

  });
}


/* ==========================================================
   FIREBASE
   ========================================================== */

let shopOverride = "auto";
let db = null;

try {

  firebase.initializeApp(firebaseConfig);

  db = firebase.database();


  /* ---------- SHOP STATUS ---------- */

  db.ref("status/override").on(
    "value",
    snapshot => {

      shopOverride = snapshot.val() || "auto";

      updateStatusPill();

    },
    error => {

      console.warn(
        "Live status control unavailable.",
        error
      );

    }
  );


  /* ---------- PRODUCT AVAILABILITY ---------- */

  db.ref("status/unavailable").on(
    "value",
    snapshot => {

      unavailableItems = snapshot.val() || {};

      renderMenu();

    },
    error => {

      console.warn(
        "Live availability control unavailable.",
        error
      );

    }
  );

} catch (error) {

  console.warn(
    "Firebase not configured yet.",
    error
  );

}


/* ==========================================================
   DELIVERY FEES
   ========================================================== */

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
  "EMPORTE": 0

};


/* ==========================================================
   PRODUCT AVAILABILITY
   ========================================================== */

let unavailableItems = {};


function isAvailable(id) {

  return !unavailableItems[id];

}


/* ==========================================================
   PRODUCTS LOOKUP
   ========================================================== */

const PRODUCTS = {};

MENU.forEach(category => {

  category.items.forEach(item => {

    PRODUCTS[item.id] = item;

  });

});


/* ==========================================================
   STATE
   ========================================================== */

let cart = [];

let editing = false;


/* ==========================================================
   HELPERS
   ========================================================== */

function formatDA(number) {

  return (
    number
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, " ")
    + " DA"
  );

}


function makeCartKey(id, supplements) {

  const sorted = (supplements || [])
    .slice()
    .sort();

  return sorted.length
    ? id + "::" + sorted.join(",")
    : id;

}


function resolveSupplements(row) {

  const product = PRODUCTS[row.id];

  if (!product) {
    return [];
  }

  const definitions = product.supplements || [];

  return (row.supplements || [])
    .map(supplementId =>
      definitions.find(
        definition => definition.id === supplementId
      )
    )
    .filter(Boolean);

}


function lineUnitPrice(row) {

  const product = PRODUCTS[row.id];

  if (!product) {
    return 0;
  }

  const extras = resolveSupplements(row)
    .reduce(
      (sum, definition) => sum + definition.price,
      0
    );

  return product.price + extras;

}


function cartTotal() {

  return cart.reduce(
    (sum, row) =>
      sum + lineUnitPrice(row) * row.qty,
    0
  );

}


function cartCount() {

  return cart.reduce(
    (sum, row) => sum + row.qty,
    0
  );

}


/* ==========================================================
   RENDER MENU
   ========================================================== */

function renderMenu() {

  const container =
    document.getElementById("menuContainer");

  if (!container) {
    return;
  }

  container.innerHTML = "";


  MENU.forEach(category => {

    const section =
      document.createElement("section");

    section.className = "category";

    section.id =
      "cat-" +
      category.category
        .toLowerCase()
        .replace(/\s+/g, "-");


    const header =
      document.createElement("div");

    header.className = "category-header";

    header.innerHTML = `
      <span class="category-icon">
        ${category.icon}
      </span>

      <h2 class="category-title">
        ${category.category}
      </h2>
    `;

    section.appendChild(header);


    if (category.isSupplement) {

      section.appendChild(
        renderSupplementPanel(category)
      );

    } else {

      const grid =
        document.createElement("div");

      grid.className = "card-grid";


      category.items.forEach(item => {

        grid.appendChild(
          renderProductCard(item)
        );

      });


      section.appendChild(grid);

    }


    container.appendChild(section);

  });


  observeCards();

}


/* ==========================================================
   PRODUCT CARD
   ========================================================== */

function renderProductCard(item) {

  const card =
    document.createElement("article");

  card.className = "product-card";

  card.dataset.id = item.id;


  const unavailable =
    !isAvailable(item.id);


  if (unavailable) {

    card.classList.add("unavailable");

  }


  const descHtml =
    (item.desc || [])
      .map(description => `
        <li>${description}</li>
      `)
      .join("");


  const hasSupplements =
    item.supplements &&
    item.supplements.length > 0;


  const supplementsHtml =
    hasSupplements
      ? `
        <div class="product-supplements">

          <button
            type="button"
            class="supplement-toggle"
            aria-expanded="false"
            ${unavailable ? "disabled" : ""}
          >

            <span class="supplement-toggle-label">
              Ajouter des suppléments
            </span>

            <span
              class="supplement-toggle-count"
              hidden
            >
              0
            </span>

            <span
              class="supplement-toggle-icon"
              aria-hidden="true"
            >
              ⌄
            </span>

          </button>


          <div class="supplement-collapse">

            <div class="supplement-collapse-inner">

              <div class="product-supplements-grid">

                ${item.supplements.map(supplement => {

                  const supplementUnavailable =
                    !isAvailable(supplement.id);


                  return `
                    <label
                      class="supplement-chip${supplementUnavailable ? " unavailable" : ""}"
                    >

                      <input
                        type="checkbox"
                        value="${supplement.id}"
                        ${
                          (unavailable ||
                            supplementUnavailable)
                            ? "disabled"
                            : ""
                        }
                      >

                      <span>
                        ${supplement.name}

                        ${
                          supplementUnavailable
                            ? " <em>(rupture)</em>"
                            : ""
                        }
                      </span>

                      <b>
                        +${formatDA(supplement.price)}
                      </b>

                    </label>
                  `;

                }).join("")}

              </div>

            </div>

          </div>

        </div>
      `
      : "";


  card.innerHTML = `

    <div class="product-head">

      <span class="product-name">
        ${item.name}
      </span>

      <span class="product-price">
        ${formatDA(item.price)}
      </span>

    </div>


    ${
      item.desc
        ? `
          <ul class="product-desc">
            ${descHtml}
          </ul>
        `
        : ""
    }


    ${
      item.badge && !unavailable
        ? `
          <span class="product-badge">
            ${item.badge}
          </span>
        `
        : ""
    }


    ${
      unavailable
        ? `
          <span class="sold-out-badge">
            😔 Rupture de stock
          </span>
        `
        : ""
    }


    ${supplementsHtml}


    <div class="product-foot">

      <div class="qty-stepper">

        <button
          type="button"
          class="qty-btn"
          data-action="dec"
          ${unavailable ? "disabled" : ""}
        >
          −
        </button>

        <span class="qty-value">
          1
        </span>

        <button
          type="button"
          class="qty-btn"
          data-action="inc"
          ${unavailable ? "disabled" : ""}
        >
          +
        </button>

      </div>


      <button
        type="button"
        class="btn-add"
        ${unavailable ? "disabled" : ""}
      >
        ${
          unavailable
            ? "Indisponible"
            : "Ajouter"
        }
      </button>

    </div>

  `;


  const qtyValue =
    card.querySelector(".qty-value");


  card
    .querySelector('[data-action="dec"]')
    .addEventListener("click", () => {

      let value =
        parseInt(
          qtyValue.textContent,
          10
        );

      if (value > 1) {

        qtyValue.textContent =
          value - 1;

      }

    });


  card
    .querySelector('[data-action="inc"]')
    .addEventListener("click", () => {

      let value =
        parseInt(
          qtyValue.textContent,
          10
        );

      qtyValue.textContent =
        value + 1;

    });


  /* ---------- SUPPLEMENTS ---------- */

  let supplementToggleBtn = null;
  let supplementCollapse = null;
  let supplementCountEl = null;


  function closeSupplementPanel() {

    if (!hasSupplements) {
      return;
    }

    supplementToggleBtn
      .setAttribute(
        "aria-expanded",
        "false"
      );

    supplementCollapse
      .classList
      .remove("open");

  }


  function updateSupplementCount() {

    const count =
      card.querySelectorAll(
        '.product-supplements input[type="checkbox"]:checked'
      ).length;


    supplementCountEl.hidden =
      count === 0;


    supplementCountEl.textContent =
      count;

  }


  if (hasSupplements) {

    supplementToggleBtn =
      card.querySelector(
        ".supplement-toggle"
      );

    supplementCollapse =
      card.querySelector(
        ".supplement-collapse"
      );

    supplementCountEl =
      card.querySelector(
        ".supplement-toggle-count"
      );


    supplementToggleBtn
      .addEventListener("click", () => {

        const isOpen =
          supplementToggleBtn
            .getAttribute(
              "aria-expanded"
            ) === "true";


        supplementToggleBtn
          .setAttribute(
            "aria-expanded",
            String(!isOpen)
          );


        supplementCollapse
          .classList
          .toggle(
            "open",
            !isOpen
          );

      });


    card
      .querySelectorAll(
        '.product-supplements input[type="checkbox"]'
      )
      .forEach(checkbox => {

        checkbox.addEventListener(
          "change",
          updateSupplementCount
        );

      });

  }


  /* ---------- ADD BUTTON ---------- */

  const addBtn =
    card.querySelector(".btn-add");


  addBtn.addEventListener(
    "click",
    () => {

      if (!isAvailable(item.id)) {
        return;
      }


      if (!isShopOpen()) {

        showClosedNotice();

        return;

      }


      const qty =
        parseInt(
          qtyValue.textContent,
          10
        );


      const selectedSupplements =
        hasSupplements
          ? Array.from(
              card.querySelectorAll(
                '.product-supplements input[type="checkbox"]:checked'
              )
            ).map(
              checkbox => checkbox.value
            )
          : [];


      addToCart(
        item.id,
        qty,
        selectedSupplements
      );


      qtyValue.textContent = "1";


      if (hasSupplements) {

        card
          .querySelectorAll(
            '.product-supplements input[type="checkbox"]:checked'
          )
          .forEach(
            checkbox =>
              checkbox.checked = false
          );


        updateSupplementCount();

        closeSupplementPanel();

      }


      flashAdded(addBtn);

    }
  );


  return card;

}


/* ==========================================================
   SUPPLEMENT PANEL
   ========================================================== */

function renderSupplementPanel(category) {

  const panel =
    document.createElement("div");

  panel.className =
    "supplement-panel";


  const grid =
    document.createElement("div");

  grid.className =
    "supplement-grid";


  category.items.forEach(item => {

    const unavailable =
      !isAvailable(item.id);


    const label =
      document.createElement("label");


    label.className =
      "supplement-item" +
      (unavailable
        ? " unavailable"
        : "");


    label.innerHTML = `

      <input
        type="checkbox"
        value="${item.id}"
        ${unavailable ? "disabled" : ""}
      >

      <span>
        ${item.name}

        ${
          unavailable
            ? " <em>(rupture)</em>"
            : ""
        }
      </span>

      <b>
        +${formatDA(item.price)}
      </b>

    `;


    grid.appendChild(label);

  });


  panel.appendChild(grid);


  const addBtn =
    document.createElement("button");

  addBtn.type = "button";

  addBtn.className = "btn-add";

  addBtn.textContent =
    "Ajouter les suppléments sélectionnés";


  addBtn.addEventListener(
    "click",
    () => {

      if (!isShopOpen()) {

        showClosedNotice();

        return;

      }


      const checked =
        panel.querySelectorAll(
          'input[type="checkbox"]:checked'
        );


      if (!checked.length) {
        return;
      }


      checked.forEach(checkbox => {

        addToCart(
          checkbox.value,
          1
        );

        checkbox.checked = false;

      });


      flashAdded(addBtn);

    }
  );


  panel.appendChild(addBtn);


  return panel;

}


/* ==========================================================
   ADD ANIMATION
   ========================================================== */

function flashAdded(button) {

  const original =
    button.textContent;


  button.classList.add(
    "just-added"
  );


  button.textContent =
    "Ajouté ✓";


  setTimeout(() => {

    button.classList.remove(
      "just-added"
    );

    button.textContent =
      original;

  }, 900);

}


/* ==========================================================
   CARD OBSERVER
   ========================================================== */

function observeCards() {

  const cards =
    document.querySelectorAll(
      ".product-card"
    );


  if (!("IntersectionObserver" in window)) {

    cards.forEach(card =>
      card.classList.add("visible")
    );

    return;

  }


  const observer =
    new IntersectionObserver(
      entries => {

        entries.forEach(
          (entry, index) => {

            if (entry.isIntersecting) {

              setTimeout(
                () => {
                  entry.target.classList.add(
                    "visible"
                  );
                },
                index * 40
              );


              observer.unobserve(
                entry.target
              );

            }

          }
        );

      },
      {
        threshold: 0.1,
        rootMargin:
          "0px 0px -40px 0px"
      }
    );


  cards.forEach(card =>
    observer.observe(card)
  );

}


/* ==========================================================
   CART
   ========================================================== */

function addToCart(
  id,
  qty,
  supplements = []
) {

  const key =
    makeCartKey(
      id,
      supplements
    );


  const existing =
    cart.find(
      row => row.key === key
    );


  if (existing) {

    existing.qty += qty;

  } else {

    cart.push({
      key,
      id,
      qty,
      supplements: [
        ...supplements
      ]
    });

  }


  renderCart();

  openDrawerBriefFeedback();

}


function removeFromCart(key) {

  cart =
    cart.filter(
      row => row.key !== key
    );

  renderCart();

}


function changeCartQty(
  key,
  delta
) {

  const row =
    cart.find(
      item => item.key === key
    );


  if (!row) {
    return;
  }


  row.qty += delta;


  if (row.qty <= 0) {

    cart =
      cart.filter(
        item => item.key !== key
      );

  }


  renderCart();

}


function clearCart() {

  cart = [];

  editing = false;


  const ticket =
    document.getElementById(
      "ticket"
    );

  const editBtn =
    document.getElementById(
      "editBtn"
    );


  if (ticket) {
    ticket.classList.remove(
      "editing"
    );
  }


  if (editBtn) {

    editBtn.classList.remove(
      "active"
    );

    editBtn.textContent =
      "Modifier";

  }


  renderCart();

}


/* ==========================================================
   RENDER CART
   ========================================================== */

function renderCart() {

  const itemsEl =
    document.getElementById(
      "cartItems"
    );

  const totalRow =
    document.getElementById(
      "ticketTotalRow"
    );

  const divider =
    document.getElementById(
      "ticketDivider"
    );

  const actions =
    document.getElementById(
      "ticketActions"
    );

  const deliveryHint =
    document.getElementById(
      "ticketDeliveryHint"
    );


  if (
    !itemsEl ||
    !totalRow ||
    !divider ||
    !actions ||
    !deliveryHint
  ) {
    return;
  }


  itemsEl.innerHTML = "";


  if (cart.length === 0) {

    // Rebuilt fresh every time (instead of moving the original DOM
    // node around) — moving it caused it to be destroyed the first
    // time the cart went from empty to non-empty, which silently
    // broke every render after that.
    itemsEl.innerHTML =
      '<p class="cart-empty" id="cartEmptyMsg">Votre panier est vide.<br>Ajoutez un produit pour commencer 👀</p>';

    totalRow.hidden = true;
    divider.hidden = true;
    actions.hidden = true;
    deliveryHint.hidden = true;

  } else {

    cart.forEach(row => {

      const product =
        PRODUCTS[row.id];


      if (!product) {
        return;
      }


      const supplementDefs =
        resolveSupplements(row);


      const rowTotal =
        lineUnitPrice(row) *
        row.qty;


      const group =
        document.createElement(
          "div"
        );


      group.className =
        "cart-row-group";


      const supplementsHtml =
        supplementDefs.length
          ? `
            <div class="cart-row-supplements">

              ${supplementDefs
                .map(
                  definition => `
                    <span>
                      + ${definition.name}
                    </span>
                  `
                )
                .join("")}

            </div>
          `
          : "";


      group.innerHTML = `

        <div class="cart-row">

          <span class="cart-row-qty">
            ${row.qty}×
          </span>


          <span class="cart-row-stepper">

            <button
              type="button"
              class="mini-qty-btn"
              data-key="${row.key}"
              data-delta="-1"
            >
              −
            </button>


            <span class="cart-row-qty-value">
              ${row.qty}
            </span>


            <button
              type="button"
              class="mini-qty-btn"
              data-key="${row.key}"
              data-delta="1"
            >
              +
            </button>

          </span>


          <span class="cart-row-name">
            ${product.name}
          </span>


          <span class="cart-row-price">
            ${formatDA(rowTotal)}
          </span>


          <button
            type="button"
            class="cart-row-remove"
            data-key="${row.key}"
            aria-label="Retirer"
          >
            ✕
          </button>

        </div>


        ${supplementsHtml}

      `;


      itemsEl.appendChild(group);

    });


    itemsEl
      .querySelectorAll(
        ".mini-qty-btn"
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            changeCartQty(
              button.dataset.key,
              parseInt(
                button.dataset.delta,
                10
              )
            );

          }
        );

      });


    itemsEl
      .querySelectorAll(
        ".cart-row-remove"
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            removeFromCart(
              button.dataset.key
            );

          }
        );

      });


    document.getElementById(
      "cartTotal"
    ).textContent =
      formatDA(cartTotal());


    totalRow.hidden = false;
    divider.hidden = false;
    actions.hidden = false;
    deliveryHint.hidden = false;

  }


  const count =
    cartCount();


  const topCount =
    document.getElementById(
      "cartCountTop"
    );

  if (topCount) {

    topCount.textContent =
      count;

  }


  const fabCount =
    document.getElementById(
      "cartFabCount"
    );

  if (fabCount) {

    fabCount.textContent =
      count +
      (
        count === 1
          ? " article"
          : " articles"
      );

  }


  const fabTotal =
    document.getElementById(
      "cartFabTotal"
    );

  if (fabTotal) {

    fabTotal.textContent =
      formatDA(cartTotal());

  }


  const cartFab =
    document.getElementById(
      "cartFab"
    );

  if (cartFab) {

    cartFab.hidden =
      count === 0;

  }

}


function openDrawerBriefFeedback() {
  /* Badge update is enough feedback */
}


/* ==========================================================
   MOBILE DRAWER
   ========================================================== */

const drawerBackdrop =
  document.getElementById(
    "drawerBackdrop"
  );


function openDrawer() {

  const cartColumn =
    document.querySelector(
      ".cart-column"
    );


  if (cartColumn) {

    cartColumn.classList.add(
      "open"
    );

  }


  if (drawerBackdrop) {

    drawerBackdrop.classList.add(
      "open"
    );

  }

}


function closeDrawer() {

  const cartColumn =
    document.querySelector(
      ".cart-column"
    );


  if (cartColumn) {

    cartColumn.classList.remove(
      "open"
    );

  }


  if (drawerBackdrop) {

    drawerBackdrop.classList.remove(
      "open"
    );

  }

}


const cartFab =
  document.getElementById(
    "cartFab"
  );

if (cartFab) {

  cartFab.addEventListener(
    "click",
    openDrawer
  );

}


const cartToggleBtn =
  document.getElementById(
    "cartToggleBtn"
  );

if (cartToggleBtn) {

  cartToggleBtn.addEventListener(
    "click",
    openDrawer
  );

}


if (drawerBackdrop) {

  drawerBackdrop.addEventListener(
    "click",
    closeDrawer
  );

}


/* ==========================================================
   EDIT / CLEAR / ORDER
   ========================================================== */

const editBtn =
  document.getElementById(
    "editBtn"
  );


if (editBtn) {

  editBtn.addEventListener(
    "click",
    () => {

      editing =
        !editing;


      const ticket =
        document.getElementById(
          "ticket"
        );


      if (ticket) {

        ticket.classList.toggle(
          "editing",
          editing
        );

      }


      editBtn.textContent =
        editing
          ? "Terminé"
          : "Modifier";


      editBtn.classList.toggle(
        "active",
        editing
      );

    }
  );

}


const clearBtn =
  document.getElementById(
    "clearBtn"
  );


if (clearBtn) {

  clearBtn.addEventListener(
    "click",
    () => {

      if (cart.length === 0) {
        return;
      }


      if (
        confirm(
          "Vider tout le panier ?"
        )
      ) {

        clearCart();

      }

    }
  );

}


const orderBtn =
  document.getElementById(
    "orderBtn"
  );


if (orderBtn) {

  orderBtn.addEventListener(
    "click",
    () => {

      if (cart.length === 0) {
        return;
      }


      if (!isShopOpen()) {

        showClosedNotice();

        return;

      }


      openModal();

    }
  );

}


/* ==========================================================
   ORDER MODAL
   ========================================================== */

const modalBackdrop =
  document.getElementById(
    "modalBackdrop"
  );

const formStep =
  document.getElementById(
    "formStep"
  );

const successStep =
  document.getElementById(
    "successStep"
  );


const callFallbackBtn =
  document.getElementById(
    "callFallbackBtn"
  );


if (callFallbackBtn) {

  callFallbackBtn.href =
    `tel:${SHOP_PHONE_TEL}`;

}


const submitBtn =
  document.getElementById(
    "submitOrderBtn"
  );


function openModal() {

  if (!modalBackdrop) {
    return;
  }


  modalBackdrop.classList.add(
    "open"
  );


  const formError =
    document.getElementById(
      "formError"
    );


  if (formError) {

    formError.hidden = true;

  }


  showFormStep();

}


function closeModal() {

  if (!modalBackdrop) {
    return;
  }


  modalBackdrop.classList.remove(
    "open"
  );

}


function showFormStep() {

  if (formStep) {

    formStep.hidden = false;

  }


  if (successStep) {

    successStep.hidden = true;

  }

}


function showSuccessStep() {

  if (formStep) {

    formStep.hidden = true;

  }


  if (successStep) {

    successStep.hidden = false;

  }

}


const modalClose =
  document.getElementById(
    "modalClose"
  );


if (modalClose) {

  modalClose.addEventListener(
    "click",
    closeModal
  );

}


if (modalBackdrop) {

  modalBackdrop.addEventListener(
    "click",
    event => {

      if (
        event.target ===
        modalBackdrop
      ) {

        closeModal();

      }

    }
  );

}


const closeSuccessBtn =
  document.getElementById(
    "closeSuccessBtn"
  );


if (closeSuccessBtn) {

  closeSuccessBtn.addEventListener(
    "click",
    closeModal
  );

}


/* ==========================================================
   DELIVERY ZONE
   ========================================================== */

const addressZoneField =
  document.getElementById(
    "fieldAdresseZone"
  );


if (addressZoneField) {

  addressZoneField.addEventListener(
    "change",
    event => {

      const zone =
        event.target.value;


      const isOther =
        zone === "Autre";


      const otherLabel =
        document.getElementById(
          "fieldAdresseOtherLabel"
        );


      if (otherLabel) {

        otherLabel.hidden =
          !isOther;

      }


      if (!isOther) {

        const otherField =
          document.getElementById(
            "fieldAdresseOther"
          );


        if (otherField) {

          otherField.value = "";

        }

      }


      updateDeliveryFeeNote(
        zone
      );

    }
  );

}


function updateDeliveryFeeNote(
  zone
) {

  const note =
    document.getElementById(
      "deliveryFeeNote"
    );


  if (!note) {
    return;
  }


  if (!zone) {

    note.textContent =
      "";

    return;

  }


  const fee =
    DELIVERY_FEES[zone];


  if (fee !== undefined) {

    note.textContent =
      `🛵 Livraison ${zone} : ${formatDA(fee)} — Total : ${formatDA(cartTotal() + fee)}`;

  } else {

    note.textContent =
      "🛵 Frais de livraison à confirmer avec vous (zone hors liste)";

  }

}


/* ==========================================================
   ORDER SUBMISSION
   ========================================================== */

const orderForm =
  document.getElementById(
    "orderForm"
  );


if (orderForm) {

  orderForm.addEventListener(
    "submit",
    async event => {

      event.preventDefault();


      if (!isShopOpen()) {

        closeModal();

        showClosedNotice();

        return;

      }


      const nom =
        document
          .getElementById("fieldNom")
          .value
          .trim();


      const prenom =
        document
          .getElementById("fieldPrenom")
          .value
          .trim();


      const telephone =
        document
          .getElementById("fieldTelephone")
          .value
          .trim();


      const zone =
        document
          .getElementById("fieldAdresseZone")
          .value;


      const adresseAutre =
        document
          .getElementById("fieldAdresseOther")
          .value
          .trim();


      const adresse =
        zone === "Autre"
          ? adresseAutre
          : zone;


      const remarque =
        document
          .getElementById("fieldRemarque")
          .value
          .trim();


      const errorEl =
        document.getElementById(
          "formError"
        );


      /* ---------- VALIDATION ---------- */

      if (
        !nom ||
        !prenom ||
        !telephone ||
        !zone
      ) {

        errorEl.textContent =
          "Merci de remplir tous les champs obligatoires (*).";

        errorEl.hidden = false;

        return;

      }


      if (
        zone === "Autre" &&
        !adresseAutre
      ) {

        errorEl.textContent =
          "Merci de préciser votre adresse.";

        errorEl.hidden = false;

        return;

      }


      const phoneDigits =
        telephone.replace(
          /[^\d]/g,
          ""
        );


      if (
        phoneDigits.length < 9
      ) {

        errorEl.textContent =
          "Merci de vérifier votre numéro de téléphone.";

        errorEl.hidden = false;

        return;

      }


      if (cart.length === 0) {

        errorEl.textContent =
          "Votre panier est vide.";

        errorEl.hidden = false;

        return;

      }


      errorEl.hidden = true;


      /* ---------- BUILD ORDER ---------- */

      const orderText =
        buildOrderText({
          nom,
          prenom,
          telephone,
          adresse,
          zone,
          remarque
        });


      /* ---------- SAVE FIREBASE ---------- */

      const orderNumber =
        saveOrderToFirebase({
          nom,
          prenom,
          telephone,
          adresse,
          zone,
          remarque,
          orderText
        });


      /* ======================================================
         TELEGRAM
         ====================================================== */

      sendOrderToTelegram({
        nom,
        prenom,
        telephone,
        adresse,
        zone,
        remarque,
        orderText,
        orderNumber
      });


      /* ---------- WHATSAPP ---------- */

      sendOrderToWhatsapp(
        orderText
      );


      /* ---------- EMAIL ---------- */

      sendOrderByEmail({
        nom,
        prenom,
        telephone,
        adresse,
        message: orderText
      });


      /* ---------- SUCCESS SCREEN ---------- */

      const orderNumberDisplay =
        document.getElementById(
          "orderNumberDisplay"
        );


      if (orderNumberDisplay) {

        orderNumberDisplay.textContent =
          orderNumber
            ? "#" + orderNumber
            : "—";

      }


      const summaryBox =
        document.getElementById(
          "orderSummaryBox"
        );


      if (summaryBox) {

        summaryBox.textContent =
          orderText;

      }


      showSuccessStep();


      clearCart();

      closeDrawer();

      orderForm.reset();


      const otherLabel =
        document.getElementById(
          "fieldAdresseOtherLabel"
        );


      if (otherLabel) {

        otherLabel.hidden = true;

      }


      const deliveryNote =
        document.getElementById(
          "deliveryFeeNote"
        );


      if (deliveryNote) {

        deliveryNote.textContent =
          "";

      }

    }
  );

}


/* ==========================================================
   SAVE ORDER TO FIREBASE
   ========================================================== */

function saveOrderToFirebase({
  nom,
  prenom,
  telephone,
  adresse,
  zone,
  remarque,
  orderText
}) {

  if (!db) {

    console.warn(
      "Firebase database unavailable."
    );

    return null;

  }


  const itemsTotal =
    cartTotal();


  const fee =
    DELIVERY_FEES[zone];


  const items =
    cart.map(row => {

      const product =
        PRODUCTS[row.id];


      return {

        id: row.id,

        name:
          product
            ? product.name
            : row.id,

        qty:
          row.qty,

        unitPrice:
          product
            ? product.price
            : 0,

        supplements:
          resolveSupplements(row)
            .map(definition => ({

              id:
                definition.id,

              name:
                definition.name,

              price:
                definition.price

            }))

      };

    });


  const orderRef =
    db
      .ref("orders")
      .push();


  const orderData = {

    createdAt:
      firebase.database.ServerValue.TIMESTAMP,

    status:
      "nouvelle",

    nom,
    prenom,
    telephone,
    adresse,
    zone,

    remarque:
      remarque || "",

    items,

    itemsTotal,

    deliveryFee:
      fee !== undefined
        ? fee
        : null,

    total:
      fee !== undefined
        ? itemsTotal + fee
        : itemsTotal,

    orderText

  };


  orderRef
    .set(orderData)
    .catch(error => {

      console.warn(
        "Order could not be saved to Firebase.",
        error
      );

    });


  return orderRef.key
    ? orderRef.key
        .slice(-6)
        .toUpperCase()
    : null;

}


/* ==========================================================
   TELEGRAM ORDER MESSAGE
   ========================================================== */

function escapeTelegramHtml(value) {

  // Telegram's HTML parse mode rejects malformed tags, so any
  // "<" or "&" typed by a customer (name, remark, etc.) must be
  // escaped or the whole notification silently fails to send.
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

}


async function sendOrderToTelegram({
  nom,
  prenom,
  telephone,
  adresse,
  zone,
  remarque,
  orderText,
  orderNumber
}) {

  if (!TELEGRAM_BOT_TOKEN) {

    console.warn(
      "Telegram is not configured. Add your bot token."
    );

    return;

  }


  if (!TELEGRAM_CHAT_ID) {

    console.warn(
      "Telegram chat ID is missing."
    );

    return;

  }


  /* ----------------------------------------------------------
     Telegram message
     (user-supplied fields are HTML-escaped — see escapeTelegramHtml)
     ---------------------------------------------------------- */

  const telegramMessage = `

🍔 <b>NOUVELLE COMMANDE — BRO'S BURGER</b>

🆔 <b>Commande :</b> #${escapeTelegramHtml(orderNumber || "—")}

👤 <b>Client :</b>
${escapeTelegramHtml(nom)} ${escapeTelegramHtml(prenom)}

📞 <b>Téléphone :</b>
${escapeTelegramHtml(telephone)}

📍 <b>Adresse :</b>
${escapeTelegramHtml(adresse)}

🗺️ <b>Zone :</b>
${escapeTelegramHtml(zone)}

━━━━━━━━━━━━━━━━━━

${escapeTelegramHtml(orderText)}

━━━━━━━━━━━━━━━━━━

📝 <b>Remarque :</b>
${escapeTelegramHtml(remarque || "Aucune")}

  `.trim();


  try {

    const response =
      await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        {

          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({

            chat_id:
              TELEGRAM_CHAT_ID,

            text:
              telegramMessage,

            parse_mode:
              "HTML",

            disable_web_page_preview:
              true

          })

        }
      );


    const result =
      await response.json();


    if (!result.ok) {

      console.error(
        "Telegram API error:",
        result
      );

      return;

    }


    console.log(
      "✅ Telegram order notification sent."
    );


  } catch (error) {

    console.error(
      "❌ Telegram notification failed:",
      error
    );

  }

}


/* ==========================================================
   ORDER TEXT
   ========================================================== */

function buildOrderText({
  nom,
  prenom,
  telephone,
  adresse,
  zone,
  remarque
}) {

  const lines = [];


  lines.push(
    "🍔 NOUVELLE COMMANDE"
  );


  lines.push("");


  lines.push(
    `Nom : ${nom}`
  );


  lines.push(
    `Prénom : ${prenom}`
  );


  lines.push(
    `Téléphone : ${telephone}`
  );


  lines.push(
    `Adresse : ${adresse}`
  );


  lines.push("");


  lines.push(
    "────────────"
  );


  lines.push(
    "Commande :"
  );


  cart.forEach(row => {

    const product =
      PRODUCTS[row.id];


    if (!product) {
      return;
    }


    lines.push(
      `${row.qty} × ${product.name}`
    );


    resolveSupplements(row)
      .forEach(definition => {

        lines.push(
          `   + ${definition.name} (+${formatDA(definition.price)})`
        );

      });

  });


  lines.push(
    "────────────"
  );


  const itemsTotal =
    cartTotal();


  const fee =
    DELIVERY_FEES[zone];


  lines.push(
    `Sous-total : ${formatDA(itemsTotal)}`
  );


  if (fee !== undefined) {

    lines.push(
      `Livraison (${zone}) : ${formatDA(fee)}`
    );


    lines.push(
      `TOTAL : ${formatDA(itemsTotal + fee)}`
    );

  } else {

    lines.push(
      "Livraison : à confirmer"
    );


    lines.push(
      `TOTAL (hors livraison) : ${formatDA(itemsTotal)}`
    );

  }


  lines.push("");


  lines.push(
    `Remarque : ${remarque || "Aucune"}`
  );


  return lines.join("\n");

}


/* ==========================================================
   WHATSAPP
   ========================================================== */

function sendOrderToWhatsapp(text) {

  const url =
    `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;


  window.open(
    url,
    "_blank"
  );

}


/* ==========================================================
   EMAILJS
   ========================================================== */

const EMAILJS_PUBLIC_KEY =
  "YOUR_PUBLIC_KEY";


const EMAILJS_SERVICE_ID =
  "YOUR_SERVICE_ID";


const EMAILJS_TEMPLATE_ID =
  "YOUR_TEMPLATE_ID";


try {

  if (
    EMAILJS_PUBLIC_KEY !==
    "YOUR_PUBLIC_KEY"
  ) {

    emailjs.init(
      EMAILJS_PUBLIC_KEY
    );

  }

} catch (error) {

  console.warn(
    "EmailJS not configured yet.",
    error
  );

}


function sendOrderByEmail(params) {

  if (
    EMAILJS_PUBLIC_KEY ===
    "YOUR_PUBLIC_KEY"
  ) {

    return;

  }


  emailjs
    .send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      params
    )
    .catch(error => {

      console.warn(
        "Email send failed.",
        error
      );

    });

}


/* ==========================================================
   TOPBAR SCROLL SHADOW
   ========================================================== */

window.addEventListener(
  "scroll",
  () => {

    const topbar =
      document.getElementById(
        "topbar"
      );


    if (!topbar) {
      return;
    }


    if (
      window.scrollY > 40
    ) {

      topbar.style.borderBottomColor =
        "rgba(249,115,22,.25)";

    } else {

      topbar.style.borderBottomColor =
        "";

    }

  }
);


/* ==========================================================
   OPENING HOURS TEXT
   ========================================================== */

function renderOpeningHoursText() {

  const standardLabel =
    OPENING_HOURS.standard
      .map(range => range.label)
      .join(" et ");


  const weekendLabel =
    OPENING_HOURS.weekend
      .map(range => range.label)
      .join(" et ");


  const footerHours =
    document.getElementById(
      "footerHours"
    );


  if (footerHours) {

    footerHours.textContent =
      standardLabel;

  }


  const footerHoursWeekend =
    document.getElementById(
      "footerHoursWeekend"
    );


  if (footerHoursWeekend) {

    footerHoursWeekend.textContent =
      weekendLabel;

  }


  const hoursBox =
    document.getElementById(
      "hoursBox"
    );


  if (hoursBox) {

    hoursBox.innerHTML = `

      <p>
        🕐 Dim – Jeu :
        ${standardLabel}
      </p>

      <p>
        🕐 Ven – Sam :
        ${weekendLabel}
      </p>

    `;

  }

}


renderOpeningHoursText();


/* ==========================================================
   CLOSED NOTICE
   ========================================================== */

const closedBackdrop =
  document.getElementById(
    "closedBackdrop"
  );


function showClosedNotice() {

  if (!closedBackdrop) {
    return;
  }


  const titleEl =
    document.getElementById(
      "closedTitle"
    );


  const subEl =
    document.querySelector(
      "#closedBackdrop .modal-sub"
    );


  const hoursBoxEl =
    document.getElementById(
      "hoursBox"
    );


  if (
    shopOverride ===
    "closed"
  ) {

    if (titleEl) {

      titleEl.textContent =
        "😴 Fermeture exceptionnelle";

    }


    if (subEl) {

      subEl.textContent =
        "Nous sommes fermés pour le moment, merci de repasser un peu plus tard.";

    }


    if (hoursBoxEl) {

      hoursBoxEl.style.display =
        "none";

    }

  } else {

    if (titleEl) {

      titleEl.textContent =
        "😴 On est fermés pour le moment";

    }


    if (subEl) {

      subEl.textContent =
        "Merci de repasser pendant nos horaires d'ouverture :";

    }


    if (hoursBoxEl) {

      hoursBoxEl.style.display =
        "";

    }

  }


  closedBackdrop.classList.add(
    "open"
  );

}


function hideClosedNotice() {

  if (closedBackdrop) {

    closedBackdrop.classList.remove(
      "open"
    );

  }

}


const closedModalClose =
  document.getElementById(
    "closedModalClose"
  );


if (closedModalClose) {

  closedModalClose.addEventListener(
    "click",
    hideClosedNotice
  );

}


const closedOkBtn =
  document.getElementById(
    "closedOkBtn"
  );


if (closedOkBtn) {

  closedOkBtn.addEventListener(
    "click",
    hideClosedNotice
  );

}


if (closedBackdrop) {

  closedBackdrop.addEventListener(
    "click",
    event => {

      if (
        event.target ===
        closedBackdrop
      ) {

        hideClosedNotice();

      }

    }
  );

}


/* ==========================================================
   STATUS PILL
   ========================================================== */

function updateStatusPill() {

  const pill =
    document.getElementById(
      "statusPill"
    );


  if (!pill) {
    return;
  }


  if (isShopOpen()) {

    pill.textContent =
      shopOverride === "open"
        ? "🟢 Ouvert (forcé)"
        : "🟢 Ouvert";


    pill.classList.remove(
      "closed"
    );

  } else {

    pill.textContent =
      shopOverride === "closed"
        ? "🔴 Fermé (exceptionnel)"
        : "🔴 Fermé";


    pill.classList.add(
      "closed"
    );

  }

}


updateStatusPill();


setInterval(
  updateStatusPill,
  30000
);


/* ==========================================================
   INITIALIZATION
   ========================================================== */

renderMenu();

renderCart();


/* ==========================================================
   DEBUG MESSAGE
   ========================================================== */

console.log(
  "🍔 Bro's Burger ordering system loaded."
);

console.log(
  "📱 Telegram notifications:",
  (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID)
    ? "CONFIGURED"
    : "NOT CONFIGURED"
);
