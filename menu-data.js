/* ==========================================================
   BRO'S BURGER — MENU DATA (single source of truth for prices)
   Loaded by BOTH brosburger.html (customer menu) and admin.html
   (product availability list) — edit the menu here only, once.
   ========================================================== */

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
      { id:"philly-poulet",   name:"Philly Poulet Pané",     price:400, desc:["Poulet pané","Gouda","Pain brioche","Sauce Bros & fromagère"] },
      { id:"philly-escalope", name:"Philly Escalope Grillée",price:400, desc:["Escalope grillée","Gouda","Pain brioche","Sauce Bros & fromagère"] },
      { id:"philly-boeuf",    name:"Philly Bœuf Haché",      price:550, desc:["Bœuf haché","Gouda","Pain brioche","Sauce Bros & fromagère"] },
      { id:"philly-mix",      name:"Philly Mix",             price:600, desc:["Poulet pané & bœuf haché","Gouda","Pain brioche","Sauce Bros & fromagère"] },
      { id:"philly-supreme",  name:"Philly Suprême",         price:650, desc:["Bœuf & poulet fumé","Camembert & cheddar","Pain brioche","Sauce Bros & fromagère"] },
    ]
  },
  {
    category: "Poutines",
    icon: "🍟",
    items: [
      { id:"poutine-poulet",   name:"Poutine Poulet Pané",      price:450, desc:["Frites","Poulet pané","Mozzarella","Cheddar","Sauce Bros","Sauce fromagère"] },
      { id:"poutine-escalope", name:"Poutine Escalope Grillée", price:450, desc:["Frites","Escalope grillée","Mozzarella","Cheddar","Sauce Bros","Sauce fromagère"] },
      { id:"poutine-fumato",   name:"Poutine Fumato",           price:450, desc:["Frites","Escalope grillée","Poulet fumé","Mozzarella","Cheddar","Sauce Bros","Sauce fromagère"] },
      { id:"poutine-boeuf",    name:"Poutine Bœuf Haché",       price:550, desc:["Frites","Bœuf haché","Mozzarella","Cheddar","Sauce Bros","Sauce fromagère"] },
      { id:"poutine-mix",      name:"Poutine Mix",              price:600, desc:["Frites","Poulet & bœuf","Mozzarella","Cheddar","Sauce Bros","Sauce fromagère"] },
      { id:"poutine-pouletx2", name:"Poutine Poulet x2",        price:650, desc:["Frites","Double poulet pané","Mozzarella","Cheddar","Sauce Bros","Sauce fromagère"] },
      { id:"poutine-mixx2",    name:"Poutine Mix x2",           price:800, desc:["Frites","Double poulet & bœuf","Mozzarella","Cheddar","Sauce Bros","Sauce fromagère"] },
      { id:"poutine-boeufx2",  name:"Poutine Bœuf x2",          price:750, desc:["Frites","Double bœuf haché","Mozzarella","Cheddar","Sauce Bros","Sauce fromagère"] },
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
      { id:"supp-fromage-gouda",     name:"Fromage (Gouda)",     price:100 },
      { id:"supp-fromage-camembert", name:"Fromage (Camembert)", price:100 },
      { id:"supp-fromage-mozza",     name:"Fromage (Mozza)",     price:100 },
      { id:"supp-fromage-gruyere",   name:"Fromage (Gruyère)",   price:100 },
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
