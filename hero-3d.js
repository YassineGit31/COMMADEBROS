/* ==========================================================
   BRO'S BURGER — Interactive 3D Hero Burger (PRO EDITION)
   Self-contained, procedural Three.js burger (no .glb needed).
   - Extra-cheesy melted drips, a flame ring at the base, and a
     glowing floating "BRO'S BURGER" sign above the burger.
   - Auto rotates slowly, reacts cinematically to scroll,
     and can be dragged with mouse/finger (with inertia).
   - Falls back to a floating emoji if WebGL is unavailable.
   - Pauses rendering when the hero is off-screen or the tab
     is hidden, to keep things light on mobile.

   PRO UPGRADE NOTES (what changed vs. the original):
   - Filmic tone mapping + correct sRGB color management so
     colors read as rich/contrasty instead of flat/washed out.
   - A tiny procedural "studio" environment map (via
     PMREMGenerator) so the glossy bun/cheese/tomato actually
     pick up soft reflections, instead of looking like flat
     plastic. No external HDRI file or network fetch needed.
   - Real shadow mapping (soft PCF shadows) on top of the
     stylized blob shadow, so the burger grounds itself
     believably instead of floating.
   - Sesame seeds are now individual instanced 3D capsules on
     the bun instead of just painted highlights, so they catch
     light and read correctly from any angle.
   - Seared, mottled patty-side texture instead of a flat
     brown cylinder wall.
   - The flame ring around the base was silently disabled in
     the original (flameCount was hardcoded to 0) — it's fixed
     and tuned to stay cheap on mobile.
   - Textures are power-of-two, sRGB-tagged, and anisotropically
     filtered so text/edges stay crisp at grazing angles.
   - Small UX polish: grab/grabbing cursor while dragging.
   ========================================================== */
(function () {
  'use strict';

  const container  = document.getElementById('hero3dContainer');
  const canvas     = document.getElementById('burgerCanvas');
  const fallback   = document.getElementById('heroFallback');
  const heroSection = document.getElementById('hero');
  if (!container || !canvas || !heroSection) return;

  /* ---------- WebGL feature detection ---------- */
  function webglAvailable() {
    try {
      const c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext &&
        (c.getContext('webgl') || c.getContext('experimental-webgl')));
    } catch (e) {
      return false;
    }
  }

  function showFallback() {
    canvas.hidden = true;
    if (fallback) fallback.hidden = false;
  }

  if (typeof THREE === 'undefined' || !webglAvailable()) {
    showFallback();
    return;
  }

  const isMobile = window.matchMedia('(max-width: 768px)').matches ||
    /Mobi|Android/i.test(navigator.userAgent);
  const isLowEnd = (navigator.hardwareConcurrency || 4) <= 4;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const texSize = isMobile ? 256 : 512;

  /* ---------- Scene basics ---------- */
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 1.25, 6.8);
  camera.lookAt(0, 0.55, 0);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: !isMobile,
      powerPreference: 'high-performance',
    });
  } catch (e) {
    showFallback();
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2));
  if (THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;

  /* Filmic tone mapping gives the warm highlights (cheese, flame,
     neon sign) a much richer, less "washed out" look. */
  if (THREE.ACESFilmicToneMapping) {
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
  }

  /* Real soft shadows, layered under the stylized blob shadow. */
  renderer.shadowMap.enabled = true;
  if (THREE.PCFSoftShadowMap) renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const maxAniso = (renderer.capabilities && renderer.capabilities.getMaxAnisotropy)
    ? renderer.capabilities.getMaxAnisotropy() : 1;

  /* ---------- Tiny canvas-texture helpers (zero external assets) ---------- */
  function makeCanvasTexture(draw, size) {
    size = size || 256;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    draw(c.getContext('2d'), size);
    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
  }
  function makeCanvasTextureWH(draw, w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
  }
  /* Marks a texture as color (sRGB) data and sharpens it at
     grazing angles — call on every texture that holds "what
     color is this surface" info (not masks/glows). */
  function tagAsColorTexture(tex) {
    if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = maxAniso;
    return tex;
  }

  const bunTopTexture = tagAsColorTexture(makeCanvasTexture(function (ctx, s) {
    const grad = ctx.createRadialGradient(s * 0.4, s * 0.35, s * 0.05, s * 0.5, s * 0.5, s * 0.65);
    grad.addColorStop(0, '#f0b463');
    grad.addColorStop(0.55, '#cf8a34');
    grad.addColorStop(1, '#a4661f');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = 'rgba(255,240,190,0.95)';
    for (let i = 0; i < 75; i++) {
      const x = Math.random() * s, y = Math.random() * s;
      const w = 3 + Math.random() * 4, h = 1.5 + Math.random() * 2;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.random() * Math.PI);
      ctx.beginPath();
      ctx.ellipse(0, 0, w, h, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }, texSize));

  const grillTexture = tagAsColorTexture(makeCanvasTexture(function (ctx, s) {
    ctx.fillStyle = '#4a2716';
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = 'rgba(20,8,4,0.55)';
    ctx.lineWidth = s * 0.035;
    for (let i = -2; i < 10; i++) {
      ctx.beginPath();
      ctx.moveTo(i * s * 0.16, 0);
      ctx.lineTo(i * s * 0.16 - s * 0.3, s);
      ctx.stroke();
    }
    for (let i = 0; i < 40; i++) {
      ctx.beginPath();
      ctx.arc(Math.random() * s, Math.random() * s, 1 + Math.random() * 2.5, 0, Math.PI * 2);
      ctx.fillStyle = Math.random() > 0.5 ? '#2a1508' : '#6b3a1f';
      ctx.globalAlpha = 0.6;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }, texSize));

  /* NEW: seared/mottled patty side wall instead of a flat brown color */
  const pattySideTexture = tagAsColorTexture(makeCanvasTextureWH(function (ctx, w, h) {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#5c3520');
    grad.addColorStop(0.18, '#4a2716');
    grad.addColorStop(0.82, '#3a1c0f');
    grad.addColorStop(1, '#26120a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) {
      const x = Math.random() * w, y = Math.random() * h;
      ctx.beginPath();
      ctx.ellipse(x, y, 3 + Math.random() * 6, 2 + Math.random() * 3.5, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(15,6,3,0.5)' : 'rgba(120,70,35,0.35)';
      ctx.fill();
    }
  }, 512, 128));

  const cheeseTexture = tagAsColorTexture(makeCanvasTexture(function (ctx, s) {
    const grad = ctx.createLinearGradient(0, 0, 0, s);
    grad.addColorStop(0, '#ffe680');
    grad.addColorStop(0.5, '#ffb823');
    grad.addColorStop(1, '#e8830a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 10; i++) {
      const x = Math.random() * s;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.bezierCurveTo(x + 20, s * 0.3, x - 18, s * 0.6, x + 12, s);
      ctx.stroke();
    }
  }, texSize));

  const shadowTexture = makeCanvasTexture(function (ctx, s) {
    const grad = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    grad.addColorStop(0, 'rgba(0,0,0,0.55)');
    grad.addColorStop(0.7, 'rgba(0,0,0,0.22)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, s, s);
  }, 128);

  const flameTexture = makeCanvasTexture(function (ctx, s) {
    ctx.clearRect(0, 0, s, s);
    const cx = s / 2;
    ctx.beginPath();
    ctx.moveTo(cx, s * 0.04);
    ctx.bezierCurveTo(s * 0.9, s * 0.32, s * 0.78, s * 0.78, cx, s * 0.98);
    ctx.bezierCurveTo(s * 0.22, s * 0.78, s * 0.1, s * 0.32, cx, s * 0.04);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, s * 0.04, 0, s * 0.98);
    grad.addColorStop(0, 'rgba(255,246,190,1)');
    grad.addColorStop(0.32, 'rgba(255,178,60,0.95)');
    grad.addColorStop(0.7, 'rgba(249,90,20,0.85)');
    grad.addColorStop(1, 'rgba(200,30,10,0)');
    ctx.fillStyle = grad;
    ctx.fill();
  }, 128);

  const glowTexture = makeCanvasTexture(function (ctx, s) {
    const grad = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    grad.addColorStop(0, 'rgba(255,150,50,0.6)');
    grad.addColorStop(0.5, 'rgba(249,115,22,0.28)');
    grad.addColorStop(1, 'rgba(249,115,22,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, s, s);
  }, 256);

  function drawBrand(ctx, w, h, fontFamily) {
    ctx.clearRect(0, 0, w, h);
    const fontSize = h * 0.58;
    ctx.font = '800 ' + fontSize + 'px ' + fontFamily;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    const partA = "BRO'S ";
    const partB = 'BURGER';
    const widthA = ctx.measureText(partA).width;
    const widthB = ctx.measureText(partB).width;
    const startX = (w - (widthA + widthB)) / 2;

    ctx.shadowColor = 'rgba(249,115,22,0.85)';
    ctx.shadowBlur = fontSize * 0.28;
    ctx.fillStyle = '#f5f1ea';
    ctx.fillText(partA, startX, h * 0.52);

    ctx.shadowColor = 'rgba(249,115,22,1)';
    ctx.shadowBlur = fontSize * 0.55;
    ctx.fillStyle = '#f97316';
    ctx.fillText(partB, startX + widthA, h * 0.52);
  }

  let brandTexture = tagAsColorTexture(makeCanvasTextureWH(function (ctx, w, h) {
    drawBrand(ctx, w, h, '800 Impact, "Arial Narrow", sans-serif');
  }, 1024, 260));

  /* ---------- Materials ---------- */
  const bunTopMat = new THREE.MeshPhysicalMaterial({
    map: bunTopTexture, roughness: 0.48, clearcoat: 0.35, clearcoatRoughness: 0.35,
    metalness: 0.02, envMapIntensity: 0.7,
  });
  const bunBottomMat = new THREE.MeshPhysicalMaterial({
    color: 0xb87a2e, roughness: 0.7, clearcoat: 0.15, metalness: 0.02, envMapIntensity: 0.4,
  });
  const pattySideMat = new THREE.MeshStandardMaterial({ map: pattySideTexture, roughness: 0.9, envMapIntensity: 0.2 });
  const pattyTopMat = new THREE.MeshStandardMaterial({ map: grillTexture, roughness: 0.82, envMapIntensity: 0.25 });
  const cheeseMat = new THREE.MeshPhysicalMaterial({
    map: cheeseTexture, roughness: 0.2, clearcoat: 0.9, clearcoatRoughness: 0.15,
    sheen: 1, sheenColor: 0xffcf70, envMapIntensity: 0.9,
  });
  const sauceMat = new THREE.MeshPhysicalMaterial({ color: 0x9c2a1e, roughness: 0.22, clearcoat: 0.85, envMapIntensity: 0.6 });
  const lettuceMat = new THREE.MeshStandardMaterial({ color: 0x5fae3d, roughness: 0.82, envMapIntensity: 0.35 });
  const tomatoMat = new THREE.MeshPhysicalMaterial({ color: 0xd6432c, roughness: 0.32, clearcoat: 0.55, envMapIntensity: 0.6 });
  const seedMat = new THREE.MeshStandardMaterial({ color: 0xfdf0cf, roughness: 0.5, envMapIntensity: 0.5 });
  const shadowMat = new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false });
  const brandMat = new THREE.MeshBasicMaterial({ map: brandTexture, transparent: true, depthWrite: false });

  /* ---------- Small shape helpers for organic layers ---------- */
  function jaggedCircleShape(radius, points, jitter) {
    const shape = new THREE.Shape();
    for (let i = 0; i <= points; i++) {
      const a = (i / points) * Math.PI * 2;
      const r = radius * (1 - jitter / 2 + Math.random() * jitter);
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
    }
    return shape;
  }

  function dripSquareShape(half, dripDepth) {
    const s = half;
    const shape = new THREE.Shape();
    shape.moveTo(-s, s);
    shape.quadraticCurveTo(0, s + dripDepth * 0.3, s, s);
    shape.quadraticCurveTo(s + dripDepth * 0.3, s * 0.3, s, -s * 0.2);
    shape.quadraticCurveTo(s * 0.6, -s - dripDepth, s * 0.1, -s * 0.4);
    shape.quadraticCurveTo(0, -s - dripDepth * 1.4, -s * 0.3, -s * 0.3);
    shape.quadraticCurveTo(-s - dripDepth * 0.3, -s * 0.2, -s, s * 0.2);
    shape.quadraticCurveTo(-s - dripDepth * 0.2, s * 0.6, -s, s);
    return shape;
  }

  /* ---------- Build the burger ---------- */
  const burger = new THREE.Group();

  const bottomBunGeo = new THREE.SphereGeometry(1.35, 32, 16, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.45);
  const bottomBun = new THREE.Mesh(bottomBunGeo, bunBottomMat);
  bottomBun.scale.set(1, 0.5, 1);
  bottomBun.rotation.x = Math.PI;
  bottomBun.position.y = -0.55;
  bottomBun.receiveShadow = true;
  burger.add(bottomBun);

  const pattyGeo = new THREE.CylinderGeometry(1.28, 1.22, 0.28, 32);
  const patty = new THREE.Mesh(pattyGeo, [pattySideMat, pattyTopMat, pattySideMat]);
  patty.position.y = -0.22;
  patty.castShadow = true;
  patty.receiveShadow = true;
  burger.add(patty);

  const sauceGeo = new THREE.ExtrudeGeometry(jaggedCircleShape(1.1, 20, 0.18), { depth: 0.03, bevelEnabled: false });
  sauceGeo.rotateX(-Math.PI / 2);
  const sauce = new THREE.Mesh(sauceGeo, sauceMat);
  sauce.position.y = -0.02;
  sauce.receiveShadow = true;
  burger.add(sauce);

  /* extra-cheesy: bigger, deeper drips */
  const cheeseGeo = new THREE.ExtrudeGeometry(dripSquareShape(1.2, 0.65), {
    depth: 0.06, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.025, bevelSegments: 3,
  });
  cheeseGeo.rotateX(-Math.PI / 2);
  const cheese = new THREE.Mesh(cheeseGeo, cheeseMat);
  cheese.position.y = 0.04;
  cheese.rotation.y = Math.PI / 4;
  cheese.castShadow = true;
  cheese.receiveShadow = true;
  burger.add(cheese);

  /* dangling melted-cheese strands hanging over the patty */
  const cheeseDrips = new THREE.Group();
  const dripCount = 8;
  for (let i = 0; i < dripCount; i++) {
    const angle = (i / dripCount) * Math.PI * 2 + Math.random() * 0.2;
    const r = 1.02 + Math.random() * 0.18;
    const sx = Math.cos(angle) * r, sz = Math.sin(angle) * r;
    const len = 0.3 + Math.random() * 0.42;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(sx, 0.05, sz),
      new THREE.Vector3(sx * 1.04, -len * 0.55, sz * 1.04),
      new THREE.Vector3(sx * 1.07, -len, sz * 1.07),
    ]);
    const tubeGeo = new THREE.TubeGeometry(curve, 10, 0.04 + Math.random() * 0.025, 7, false);
    const dripMesh = new THREE.Mesh(tubeGeo, cheeseMat);
    dripMesh.castShadow = true;
    cheeseDrips.add(dripMesh);
  }
  burger.add(cheeseDrips);

  const tomatoGeo = new THREE.CylinderGeometry(1.04, 1.04, 0.1, 28);
  const tomato = new THREE.Mesh(tomatoGeo, tomatoMat);
  tomato.position.y = 0.4;
  tomato.castShadow = true;
  tomato.receiveShadow = true;
  burger.add(tomato);

  const lettuceGeo = new THREE.ExtrudeGeometry(jaggedCircleShape(1.32, 24, 0.3), {
    depth: 0.07, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 1,
  });
  lettuceGeo.rotateX(-Math.PI / 2);
  const lettuce = new THREE.Mesh(lettuceGeo, lettuceMat);
  lettuce.position.y = 0.24;
  lettuce.castShadow = true;
  lettuce.receiveShadow = true;
  burger.add(lettuce);

  const topBunGeo = new THREE.SphereGeometry(1.32, 30, 24, 0, Math.PI * 2, 0, Math.PI * 0.62);
  const topBun = new THREE.Mesh(topBunGeo, bunTopMat);
  topBun.scale.set(1, 0.65, 1);
  topBun.position.y = 0.76;
  topBun.castShadow = true;
  burger.add(topBun);

  /* NEW: real sesame seeds — instanced 3D capsules scattered across the
     dome, standing in for the painted dots so they catch light properly. */
  (function addSesameSeeds() {
    const seedGeo = new THREE.SphereGeometry(0.035, 6, 5);
    seedGeo.scale(1, 0.55, 1.8);
    const seedCount = isMobile ? 36 : 64;
    const seeds = new THREE.InstancedMesh(seedGeo, seedMat, seedCount);
    seeds.castShadow = true;
    const dummy = new THREE.Object3D();
    const domeTopY = 0.76;         // topBun.position.y
    const domeRadiusY = 1.32 * 0.65; // topBun radius * y-scale
    const domeRadiusXZ = 1.32 * 0.92; // stay a bit inside the visual edge
    let placed = 0;
    let attempts = 0;
    while (placed < seedCount && attempts < seedCount * 25) {
      attempts++;
      const r = Math.sqrt(Math.random()) * domeRadiusXZ;
      const a = Math.random() * Math.PI * 2;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const frac = Math.min(1, r / domeRadiusXZ);
      const yFrac = Math.sqrt(Math.max(0, 1 - frac * frac));
      const y = domeTopY + yFrac * domeRadiusY - 0.015;
      dummy.position.set(x, y, z);
      dummy.rotation.set(
        (Math.random() - 0.5) * 0.6,
        Math.random() * Math.PI * 2,
        (Math.random() - 0.5) * 0.6
      );
      dummy.scale.setScalar(0.75 + Math.random() * 0.55);
      dummy.updateMatrix();
      seeds.setMatrixAt(placed, dummy.matrix);
      placed++;
    }
    seeds.instanceMatrix.needsUpdate = true;
    burger.add(seeds);
  })();

  const shadowMesh = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3.6), shadowMat);
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = -0.98;
  burger.add(shadowMesh);

  burger.position.y = 0.08;
  scene.add(burger);

  /* NEW: a real shadow-catching ground plane (kept as a scene sibling,
     not a child of `burger`, so it never tilts with the scroll dolly). */
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 8),
    new THREE.ShadowMaterial({ opacity: 0.32 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.9;
  ground.receiveShadow = true;
  scene.add(ground);

  /* ---------- Flame ring around the base ---------- */
  /* NOTE: the original had flameCount hardcoded to 0, which silently
     disabled the whole flame ring despite the flicker code running
     every frame. Re-enabled here, capped low on mobile for perf. */
  const flames = [];
  const flameCount = reducedMotion ? 0 : (isMobile ? 6 : 12);
  for (let i = 0; i < flameCount; i++) {
    const mat = new THREE.SpriteMaterial({
      map: flameTexture, transparent: true, blending: THREE.AdditiveBlending,
      depthWrite: false, rotation: (Math.random() - 0.5) * 0.5,
    });
    const sprite = new THREE.Sprite(mat);
    const angle = (i / flameCount) * Math.PI * 2 + Math.random() * 0.2;
    const radius = 1.05 + Math.random() * 0.3;
    sprite.position.set(Math.cos(angle) * radius, -0.95, Math.sin(angle) * radius);
    const scale = 0.5 + Math.random() * 0.55;
    sprite.scale.set(scale * 0.6, scale, 1);
    sprite.userData.phase = Math.random() * Math.PI * 2;
    sprite.userData.speed = 3 + Math.random() * 2.4;
    sprite.userData.baseY = sprite.position.y;
    sprite.userData.baseScaleY = sprite.scale.y;
    scene.add(sprite);
    flames.push(sprite);
  }

  const fireGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  fireGlow.scale.set(4.4, 4.4, 1);
  fireGlow.position.set(0, -0.9, 0);
  scene.add(fireGlow);

  /* ---------- Floating glowing brand banner ---------- */
  const brandGeo = new THREE.PlaneGeometry(3.7, 0.94);
  const brandMesh = new THREE.Mesh(brandGeo, brandMat);
  brandMesh.position.set(0, 1.95, 0.25);
  scene.add(brandMesh);

  const brandGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  brandGlow.scale.set(4.6, 1.7, 1);
  brandGlow.position.set(0, 1.95, -0.05);
  scene.add(brandGlow);

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      try {
        const crisp = tagAsColorTexture(makeCanvasTextureWH(function (ctx, w, h) {
          drawBrand(ctx, w, h, '800 \'Anton\', Impact, sans-serif');
        }, 1024, 260));
        brandMat.map = crisp;
        brandMat.needsUpdate = true;
      } catch (e) { /* keep the initial fallback texture */ }
    });
  }

  /* ---------- Procedural studio environment (for reflections) ---------- */
  /* Gives the glossy clearcoat/sheen materials (bun, cheese, tomato) real
     soft reflections instead of looking flat, with zero network requests —
     it's a tiny gradient rendered to an equirect texture and convolved
     with PMREMGenerator, exactly like baking a 1-pixel-wide HDRI. */
  let envRenderTarget = null;
  if (THREE.PMREMGenerator) {
    try {
      const pmrem = new THREE.PMREMGenerator(renderer);
      if (pmrem.compileEquirectangularShader) pmrem.compileEquirectangularShader();

      const envCanvas = document.createElement('canvas');
      envCanvas.width = 4; envCanvas.height = 256;
      const ectx = envCanvas.getContext('2d');
      const egrad = ectx.createLinearGradient(0, 0, 0, 256);
      egrad.addColorStop(0, '#4a3420');
      egrad.addColorStop(0.42, '#8a5628');
      egrad.addColorStop(0.52, '#e0913f');
      egrad.addColorStop(0.62, '#8a5628');
      egrad.addColorStop(1, '#100a06');
      ectx.fillStyle = egrad;
      ectx.fillRect(0, 0, 4, 256);
      const envTex = new THREE.CanvasTexture(envCanvas);
      envTex.mapping = THREE.EquirectangularReflectionMapping;
      if (THREE.SRGBColorSpace) envTex.colorSpace = THREE.SRGBColorSpace;
      envTex.needsUpdate = true;

      envRenderTarget = pmrem.fromEquirectangular(envTex);
      scene.environment = envRenderTarget.texture;

      envTex.dispose();
      pmrem.dispose();
    } catch (e) {
      /* Environment reflections are optional polish — safe to skip
         on older three.js builds or constrained contexts. */
    }
  }

  /* ---------- Lighting (warm, premium, orange-branded) ---------- */
  scene.add(new THREE.AmbientLight(0x3a2a1c, 0.6));
  const keyLight = new THREE.DirectionalLight(0xffd9a0, 1.7);
  keyLight.position.set(3, 5, 4);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(isMobile ? 512 : 1024, isMobile ? 512 : 1024);
  keyLight.shadow.camera.near = 1;
  keyLight.shadow.camera.far = 12;
  keyLight.shadow.camera.left = -3;
  keyLight.shadow.camera.right = 3;
  keyLight.shadow.camera.top = 3;
  keyLight.shadow.camera.bottom = -3;
  keyLight.shadow.bias = -0.0018;
  keyLight.shadow.radius = 3;
  scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0xff7a2e, 0.95);
  rimLight.position.set(-4, 2, -3);
  scene.add(rimLight);
  const glowLight = new THREE.PointLight(0xf97316, 6, 12, 2);
  glowLight.position.set(0, 0.4, -2.4);
  scene.add(glowLight);
  const fireUpLight = new THREE.PointLight(0xff5a1f, 3.4, 6, 2);
  fireUpLight.position.set(0, -0.7, 1.3);
  scene.add(fireUpLight);

  /* ---------- Subtle floating embers ---------- */
  let particles = null;
  if (!isLowEnd && !reducedMotion) {
    const count = isMobile ? 16 : 36;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const emberPalette = [
      [0.98, 0.45, 0.13], [1, 0.7, 0.25], [0.85, 0.2, 0.1],
    ];
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 5.5;
      positions[i * 3 + 1] = -0.7 + Math.random() * 3.2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 4 - 0.5;
      const c = emberPalette[i % emberPalette.length];
      colors[i * 3] = c[0]; colors[i * 3 + 1] = c[1]; colors[i * 3 + 2] = c[2];
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.05, transparent: true, opacity: 0.7, vertexColors: true,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    particles = new THREE.Points(geo, mat);
    scene.add(particles);
  }

  /* ---------- Resize handling ---------- */
  function resize() {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }
  resize();
  window.addEventListener('resize', resize);
  if ('ResizeObserver' in window) {
    new ResizeObserver(resize).observe(container);
  }

  /* ---------- Drag-to-rotate (mouse + touch), with inertia ---------- */
  let isDragging = false;
  let lastX = 0, lastY = 0;
  let targetRotY = 0.35, targetRotX = 0.12;
  let velY = 0;
  let autoRotate = true;
  let resumeAutoTimer = null;

  canvas.style.cursor = 'grab';

  function pointerDown(e) {
    isDragging = true;
    autoRotate = false;
    canvas.style.cursor = 'grabbing';
    if (resumeAutoTimer) clearTimeout(resumeAutoTimer);
    const p = e.touches ? e.touches[0] : e;
    lastX = p.clientX; lastY = p.clientY;
    velY = 0;
  }
  function pointerMove(e) {
    if (!isDragging) return;
    const p = e.touches ? e.touches[0] : e;
    const dx = p.clientX - lastX;
    const dy = p.clientY - lastY;
    lastX = p.clientX; lastY = p.clientY;
    targetRotY += dx * 0.008;
    targetRotX = Math.max(-0.32, Math.min(0.32, targetRotX + dy * 0.006));
    velY = dx * 0.008;
    if (e.cancelable) e.preventDefault();
  }
  function pointerUp() {
    if (!isDragging) return;
    isDragging = false;
    canvas.style.cursor = 'grab';
    resumeAutoTimer = setTimeout(function () { autoRotate = true; }, 2200);
  }

  canvas.addEventListener('mousedown', pointerDown);
  window.addEventListener('mousemove', pointerMove);
  window.addEventListener('mouseup', pointerUp);
  canvas.addEventListener('touchstart', pointerDown, { passive: true });
  window.addEventListener('touchmove', pointerMove, { passive: false });
  window.addEventListener('touchend', pointerUp);

  /* ---------- Scroll-driven cinematic motion ---------- */
  let scrollProgress = 0;
  function updateScrollProgress() {
    const rect = heroSection.getBoundingClientRect();
    const total = rect.height || 1;
    const scrolledPast = Math.min(Math.max(-rect.top, 0), total);
    scrollProgress = scrolledPast / total;
  }
  window.addEventListener('scroll', updateScrollProgress, { passive: true });
  updateScrollProgress();

  /* ---------- Pause rendering when off-screen / tab hidden ---------- */
  let heroVisible = true;
  let rafId = null;

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      heroVisible = entries[0].isIntersecting;
      if (heroVisible && !rafId) animate();
    }, { threshold: 0 }).observe(heroSection);
  }
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && heroVisible && !rafId) animate();
  });

  /* ---------- Animation loop ---------- */
  const clock = new THREE.Clock();
  let curRotY = targetRotY, curRotX = targetRotX;
  let curScale = 1;

  function animate() {
    rafId = requestAnimationFrame(animate);

    if (document.hidden || !heroVisible) {
      cancelAnimationFrame(rafId);
      rafId = null;
      return;
    }

    const dt = Math.min(clock.getDelta(), 0.05);
    const elapsed = clock.getElapsedTime();

    if (!reducedMotion) {
      if (autoRotate && !isDragging) targetRotY += dt * 0.18;
      if (!isDragging) {
        velY *= 0.94;
        targetRotY += velY;
      }
    }

    curRotY += (targetRotY - curRotY) * Math.min(1, dt * 6);
    curRotX += (targetRotX - curRotX) * Math.min(1, dt * 6);

    const scrollRotY = reducedMotion ? 0 : scrollProgress * 1.1;
    const scrollRotX = reducedMotion ? 0 : scrollProgress * 0.18;
    const scrollZoom = reducedMotion ? 1 : 1 - scrollProgress * 0.18;
    const scrollLift = reducedMotion ? 0 : scrollProgress * 0.35;

    burger.rotation.y += ((curRotY + scrollRotY) - burger.rotation.y) * Math.min(1, dt * 5);
    burger.rotation.x += ((curRotX + scrollRotX) - burger.rotation.x) * Math.min(1, dt * 5);
    burger.position.y += ((0.08 + scrollLift) - burger.position.y) * Math.min(1, dt * 5);

    curScale += (scrollZoom - curScale) * Math.min(1, dt * 5);
    burger.scale.set(curScale, curScale, curScale);

    /* fire flicker */
    if (!reducedMotion) {
      flames.forEach(function (f) {
        const t = elapsed * f.userData.speed + f.userData.phase;
        const flick = 0.85 + Math.sin(t) * 0.12 + Math.sin(t * 2.7) * 0.07;
        f.scale.y = f.userData.baseScaleY * flick;
        f.position.y = f.userData.baseY + Math.sin(t * 1.3) * 0.05;
        f.material.opacity = 0.7 + Math.sin(t * 1.7) * 0.22;
      });
      glowLight.intensity = 5.6 + Math.sin(elapsed * 8) * 1.1 + Math.sin(elapsed * 13.3) * 0.5;
      fireUpLight.intensity = 3.1 + Math.sin(elapsed * 9.5) * 0.7;

      brandMesh.position.y = 1.95 + Math.sin(elapsed * 0.9) * 0.05;
      brandGlow.position.y = brandMesh.position.y - 0.25;
      brandMesh.rotation.z = Math.sin(elapsed * 0.6) * 0.02;

      if (particles) {
        const pos = particles.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          let y = pos.getY(i) + dt * 0.35;
          if (y > 2.6) y = -0.7;
          pos.setY(i, y);
        }
        pos.needsUpdate = true;
        particles.rotation.y += dt * 0.02;
      }
    }

    renderer.render(scene, camera);
  }
  animate();

  /* ---------- Cleanup on unload (avoid leaking GPU memory in SPAs) ---------- */
  window.addEventListener('beforeunload', function () {
    if (rafId) cancelAnimationFrame(rafId);
    if (envRenderTarget) envRenderTarget.dispose();
    renderer.dispose();
  });
})();
