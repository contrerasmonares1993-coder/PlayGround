(() => {
  const canvas = document.getElementById('scene');
  const ctx = canvas.getContext('2d');
  const $ = (id) => document.getElementById(id);
  const ui = {
    intro: $('introScreen'), hud: $('hud'), prompt: $('duelPrompt'), kicker: $('promptKicker'), promptText: $('promptText'), promptSub: $('promptSub'),
    result: $('resultScreen'), ending: $('endingScreen'), resultEyebrow: $('resultEyebrow'), resultTitle: $('resultTitle'), resultMessage: $('resultMessage'),
    reaction: $('reactionValue'), continue: $('continueButton'), start: $('startButton'), again: $('againButton'), round: $('roundNumber'), roundName: $('roundName'), opponent: $('opponentName'), rank: $('opponentRank'), score: $('scoreValue'), progress: $('duelProgress'),
    hint: $('bottomHint'), draw: $('drawButton'), flash: $('flash'), toast: $('toast'), average: $('averageValue'), sound: $('soundButton')
  };
  const duels = [
    { name: 'CALLE POLVORIENTA', opponent: 'EL FORASTERO', rank: 1, wait: [1700, 3300], window: 1320 },
    { name: 'MESA DEL DIABLO', opponent: 'SILAS “DOS CAÑONES”', rank: 2, wait: [1500, 3100], window: 1120 },
    { name: 'PASO DEL CUERVO', opponent: 'LA VIUDA NEGRA', rank: 2, wait: [1400, 2950], window: 950 },
    { name: 'SANTA CRUZ', opponent: 'HERMANO CAÍN', rank: 3, wait: [1300, 2700], window: 820 },
    { name: 'CIELO ROJO', opponent: 'TOMBSTONE TOM', rank: 3, wait: [1150, 2450], window: 720 },
    { name: 'ÚLTIMA FRONTERA', opponent: 'EL ÁNGEL DE LA MUERTE', rank: 3, wait: [1000, 2250], window: 650 }
  ];
  let width = 0, height = 0, dpr = 1, phase = 'intro', roundIndex = 0, wins = 0, reactionTimes = [], readyAt = 0, deadline = 0, lastShot = 0, startedAt = 0, soundOn = false, audio = null, lastFrame = 0, toastTimer = 0;
  const dust = Array.from({ length: 44 }, (_, i) => ({ x: Math.random(), y: .52 + Math.random() * .48, r: .4 + Math.random() * 2.2, speed: .0007 + Math.random() * .0014, drift: Math.random() * 4, alpha: .08 + Math.random() * .22, seed: i * 19 }));

  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, rect.width); height = Math.max(1, rect.height); dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize); resize();
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  function path(points, fill, stroke, lineWidth = 1) {
    ctx.beginPath(); ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
    ctx.closePath(); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.stroke(); }
  }
  function polygon(points, color) { path(points, color); }
  function mountain(x, y, w, h, color, seed = 0) {
    const pts = [[x, y + h], [x, y + h * .55]];
    for (let i = 0; i <= 8; i++) {
      const px = x + w * i / 8;
      const peak = Math.sin(i * 2.41 + seed) * .2 + Math.cos(i * 4.7 + seed) * .07;
      pts.push([px, y + h * (.22 + peak + (i % 3) * .07)]);
    }
    pts.push([x + w, y + h]); polygon(pts, color);
  }
  function building(x, y, w, h, front, side, roof, sign, variant = 0) {
    // Deep side wall and shadowed timber façade
    polygon([[x + w * .74, y - h * .04], [x + w, y - h * .13], [x + w, y + h], [x + w * .74, y + h * 1.06]], side);
    polygon([[x, y], [x + w * .74, y - h * .04], [x + w * .74, y + h], [x, y + h * .94]], front);
    polygon([[x - w * .055, y], [x + w * .72, y - h * .16], [x + w * .84, y - h * .05], [x + w * .04, y + h * .1]], roof);
    ctx.fillStyle = '#281813'; ctx.fillRect(x - w * .08, y + h * .24, w * .86, h * .065);
    ctx.fillStyle = '#aa7145'; ctx.fillRect(x - w * .08, y + h * .22, w * .86, h * .025);
    // Porch posts and board seams
    ctx.strokeStyle = '#2c1a14'; ctx.lineWidth = Math.max(1, w * .012);
    for (let i = 1; i < 5; i++) { const xx = x + w * i * .145; ctx.beginPath(); ctx.moveTo(xx, y + h * .29); ctx.lineTo(xx, y + h * .92); ctx.stroke(); }
    ctx.fillStyle = '#1b120f';
    const winY = y + h * .38, winW = w * .15, winH = h * .24;
    for (let i = 0; i < 3; i++) {
      const wx = x + w * (.11 + i * .23); ctx.fillRect(wx, winY, winW, winH);
      ctx.fillStyle = '#b36d3e'; ctx.fillRect(wx - 2, winY - 2, winW + 4, 3); ctx.fillStyle = '#1b120f';
      if (variant === 1) { ctx.strokeStyle = '#9b6946'; ctx.lineWidth = 1; ctx.strokeRect(wx, winY, winW, winH); }
    }
    ctx.fillStyle = '#21140f'; ctx.fillRect(x + w * .47, y + h * .62, w * .18, h * .36);
    // Warm signage
    if (sign) {
      ctx.fillStyle = '#d1a069'; ctx.fillRect(x + w * .1, y + h * .13, w * .6, h * .095);
      ctx.fillStyle = '#4d2a1c'; ctx.textAlign = 'center'; ctx.font = `bold ${Math.max(7, w * .055)}px Georgia`; ctx.fillText(sign, x + w * .4, y + h * .195);
    }
    ctx.fillStyle = '#291911'; ctx.fillRect(x - 4, y + h * .92, w * .83, h * .07);
  }
  function tumbleweed(x, y, scale, t) {
    ctx.save(); ctx.translate(x + Math.sin(t * .0004) * 5, y); ctx.rotate(t * .0007);
    ctx.strokeStyle = '#493022'; ctx.lineWidth = 1.2 * scale; ctx.beginPath();
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; ctx.moveTo(Math.cos(a) * 4 * scale, Math.sin(a) * 4 * scale); ctx.lineTo(Math.cos(a) * 12 * scale, Math.sin(a) * 11 * scale); }
    ctx.arc(0, 0, 8 * scale, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  }
  function cowboy(x, footY, scale, isPlayer, t, fallen = false, recoil = 0) {
    ctx.save(); ctx.translate(x, footY); ctx.scale(scale, scale);
    if (fallen) { ctx.rotate(isPlayer ? -.26 : .4); ctx.translate(isPlayer ? 3 : -7, 23); }
    const bob = Math.sin(t * .002 + (isPlayer ? .4 : 1.6)) * 1.7;
    const coat = isPlayer ? '#30201a' : '#251714', edge = isPlayer ? '#a9794d' : '#71432e';
    ctx.globalAlpha = .25; ctx.fillStyle = '#170f0c'; ctx.beginPath(); ctx.ellipse(0, 0, 25, 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    if (fallen) {
      // Sideways body and boots
      ctx.fillStyle = '#1c1411'; ctx.beginPath(); ctx.ellipse(0, -16, 29, 11, -.13, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = coat; ctx.fillRect(-18, -28, 36, 16);
      ctx.fillStyle = '#17110f'; ctx.fillRect(13, -17, 20, 6); ctx.fillRect(-30, -15, 17, 6);
      ctx.fillStyle = '#231714'; ctx.beginPath(); ctx.arc(-24, -23, 8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#120e0c'; ctx.fillRect(-29, -33, 17, 3); ctx.restore(); return;
    }
    // Legs and boots
    ctx.fillStyle = '#211714'; ctx.beginPath(); ctx.moveTo(-12, -43 + bob); ctx.lineTo(-2, -43 + bob); ctx.lineTo(1, -8); ctx.lineTo(-7, -5); ctx.lineTo(-15, -12); ctx.fill();
    ctx.beginPath(); ctx.moveTo(2, -43 + bob); ctx.lineTo(12, -43 + bob); ctx.lineTo(15, -11); ctx.lineTo(8, -5); ctx.lineTo(1, -10); ctx.fill();
    ctx.fillStyle = '#130f0d'; ctx.fillRect(-17, -8, 14, 5); ctx.fillRect(5, -8, 14, 5);
    // Long coat with split tails
    polygon([[-14, -77 + bob], [13, -77 + bob], [17, -45], [13, -31], [5, -44], [-2, -32], [-8, -45], [-16, -35], [-19, -48]], coat);
    ctx.strokeStyle = edge; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-14, -72 + bob); ctx.lineTo(-11, -47); ctx.moveTo(11, -72 + bob); ctx.lineTo(8, -49); ctx.stroke();
    // Neck + head
    ctx.fillStyle = '#a86d49'; ctx.fillRect(-5, -87 + bob, 10, 12);
    ctx.fillStyle = '#bd8259'; ctx.beginPath(); ctx.ellipse(0, -97 + bob, 10, 12, 0, 0, Math.PI * 2); ctx.fill();
    // Hair, hat brim, crown
    ctx.fillStyle = '#241813'; ctx.beginPath(); ctx.arc(0, -101 + bob, 10, Math.PI, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#201511'; ctx.beginPath(); ctx.ellipse(0, -108 + bob, 19, 3, -.04, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(-10, -119 + bob, 20, 12); ctx.fillStyle = '#875532'; ctx.fillRect(-10, -111 + bob, 20, 2);
    // Bandana
    ctx.fillStyle = isPlayer ? '#b54b33' : '#ded0b8'; polygon([[-8, -82 + bob], [8, -82 + bob], [6, -76 + bob], [0, -73 + bob], [-6, -77 + bob]], ctx.fillStyle);
    // Gun hand and revolver: poised at hip before draw, raised after
    const raising = recoil > 0 ? Math.min(1, recoil) : (phase === 'armed' ? 1 : 0);
    const armAngle = isPlayer ? -.15 - raising * .82 : Math.PI + .15 + raising * .82;
    const sx = isPlayer ? 11 : -11, sy = -75 + bob;
    const ex = sx + Math.cos(armAngle) * 22, ey = sy + Math.sin(armAngle) * 22;
    ctx.strokeStyle = coat; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.fillStyle = '#ae7954'; ctx.beginPath(); ctx.arc(ex, ey, 3.5, 0, Math.PI * 2); ctx.fill();
    if (raising > .12 || (isPlayer && phase === 'armed')) {
      const dir = isPlayer ? 1 : -1; ctx.save(); ctx.translate(ex, ey); ctx.rotate(isPlayer ? -.12 : Math.PI + .12);
      ctx.fillStyle = '#231915'; ctx.fillRect(0, -2, 13 * dir, 4); ctx.fillRect(4 * dir, 1, 3 * dir, 7); ctx.fillStyle = '#a98254'; ctx.fillRect(9 * dir, -1, 5 * dir, 2); ctx.restore();
    }
    // Belt and holster
    ctx.strokeStyle = '#a67a4d'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-12, -48); ctx.lineTo(13, -48); ctx.stroke();
    ctx.fillStyle = '#9d7046'; ctx.fillRect(isPlayer ? 5 : -8, -49, 5, 13);
    ctx.restore();
  }
  function drawScene(t) {
    const w = width, h = height, sx = w / 1280, sy = h / 720;
    ctx.setTransform(dpr * sx, 0, 0, dpr * sy, 0, 0);
    // Sunset sky and distant mesa country
    const sky = ctx.createLinearGradient(0, 0, 0, 520); sky.addColorStop(0, '#37201d'); sky.addColorStop(.38, '#9b4e34'); sky.addColorStop(.72, '#d58a50'); sky.addColorStop(1, '#e5ad68'); ctx.fillStyle = sky; ctx.fillRect(0, 0, 1280, 720);
    const sunX = 840, sunY = 250;
    const glow = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 210); glow.addColorStop(0, 'rgba(255,215,145,.65)'); glow.addColorStop(1, 'rgba(238,154,91,0)'); ctx.fillStyle = glow; ctx.fillRect(600, 20, 500, 500);
    ctx.fillStyle = '#efbd78'; ctx.beginPath(); ctx.arc(sunX, sunY, 57, 0, Math.PI * 2); ctx.fill();
    // Fine atmospheric bands
    for (let i = 0; i < 5; i++) { ctx.fillStyle = `rgba(255,222,171,${.035 + i * .009})`; ctx.fillRect(0, 310 + i * 19, 1280, 2); }
    mountain(-120, 330, 600, 205, '#784332', 2); mountain(320, 322, 650, 204, '#69402f', 1); mountain(805, 340, 620, 203, '#75402f', 3);
    mountain(-100, 397, 630, 133, '#98553a', 1); mountain(600, 388, 830, 145, '#9d593c', 4);
    // Town silhouettes and storefront façades
    ctx.fillStyle = '#4c2b21'; ctx.fillRect(0, 434, 1280, 135);
    building(-115, 370, 310, 235, '#71402e', '#48291f', '#3d241d', '', 1);
    building(38, 405, 228, 182, '#9a5738', '#63351f', '#49291e', 'HOTEL', 0);
    building(226, 430, 222, 164, '#82462c', '#512d21', '#45261d', 'SALOON', 1);
    building(828, 425, 213, 171, '#8a4c30', '#552e22', '#47261c', 'GENERAL', 0);
    building(1020, 393, 268, 204, '#9b5937', '#643620', '#4b281d', 'SHERIFF', 1);
    // Saloon swinging doors and boardwalks
    ctx.fillStyle = '#3a2118'; ctx.fillRect(330, 530, 30, 65); ctx.fillRect(916, 528, 36, 67);
    ctx.fillStyle = '#b47749'; ctx.fillRect(326, 530, 4, 61); ctx.fillRect(359, 530, 4, 61);
    // Street floor and perspective road
    const ground = ctx.createLinearGradient(0, 520, 0, 720); ground.addColorStop(0, '#b37446'); ground.addColorStop(.45, '#a2653e'); ground.addColorStop(1, '#563427'); ctx.fillStyle = ground; ctx.fillRect(0, 520, 1280, 200);
    polygon([[390, 520], [886, 520], [1120, 720], [154, 720]], '#b9804c');
    // Road grooves, hoof tracks, scattered boards
    ctx.strokeStyle = 'rgba(63,38,27,.2)'; ctx.lineWidth = 2;
    for (let i = 0; i < 12; i++) { const f = i / 11; const yy = 540 + f * 174; ctx.beginPath(); ctx.moveTo(400 - f * 236, yy); ctx.lineTo(880 + f * 236, yy); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(65,39,28,.26)'; ctx.lineWidth = 1.4;
    for (let i = 0; i < 8; i++) { const x = 440 + i * 52; ctx.beginPath(); ctx.moveTo(x, 555 + (i % 3) * 21); ctx.lineTo(x + 36, 558 + (i % 3) * 21); ctx.stroke(); }
    for (let i = 0; i < 17; i++) { const x = (i * 193 + 77) % 1280, y = 543 + (i * 41) % 167; ctx.fillStyle = `rgba(48,31,24,${.18 + (i % 3) * .05})`; ctx.beginPath(); ctx.ellipse(x, y, 2 + i % 4, 1.2, .4, 0, Math.PI * 2); ctx.fill(); }
    // Hanging lanterns, sign, hitching rails
    ctx.strokeStyle = '#291913'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(221, 464); ctx.lineTo(221, 504); ctx.moveTo(1050, 455); ctx.lineTo(1050, 501); ctx.stroke();
    ctx.fillStyle = '#df994e'; ctx.beginPath(); ctx.arc(221, 507, 6, 0, Math.PI * 2); ctx.arc(1050, 504, 6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#3c241a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(43, 560); ctx.lineTo(206, 559); ctx.moveTo(1070, 559); ctx.lineTo(1225, 559); ctx.stroke();
    // Duelists and moving dust
    const defeated = phase === 'result' && ui.resultTitle.textContent.includes('VICTORIA') || phase === 'ending';
    const playerDown = phase === 'result' && !defeated;
    const opponentDown = phase === 'result' && defeated || phase === 'ending';
    cowboy(421, 633, 1.12, true, t, playerDown, phase === 'armed' ? clamp((t - readyAt) / 400, 0, 1) : 0);
    cowboy(855, 633, 1.12, false, t, opponentDown, phase === 'armed' ? clamp((t - readyAt) / 300, 0, 1) : 0);
    // Drifting dust motes, strongest at sunset street level
    for (const p of dust) {
      const x = ((p.x * 1280 + t * p.speed + p.drift) % 1360) - 40;
      const y = p.y * 720 + Math.sin(t * .001 + p.seed) * 5;
      ctx.fillStyle = `rgba(255,218,165,${p.alpha})`; ctx.beginPath(); ctx.arc(x, y, p.r, 0, Math.PI * 2); ctx.fill();
    }
    tumbleweed(264 + (t * .015 % 850), 620 + Math.sin(t * .001) * 10, .8, t);
    // Soft cinematic vignette
    const vignette = ctx.createRadialGradient(640, 350, 260, 640, 350, 780); vignette.addColorStop(0, 'rgba(24,12,9,0)'); vignette.addColorStop(1, 'rgba(24,12,9,.48)'); ctx.fillStyle = vignette; ctx.fillRect(0, 0, 1280, 720);
  }
  function render(now) { drawScene(now); lastFrame = now; requestAnimationFrame(render); }
  requestAnimationFrame(render);

  function updateProgress() {
    ui.progress.replaceChildren();
    duels.forEach((_, i) => { const dot = document.createElement('span'); dot.className = `progress-dot${i < wins ? ' done' : ''}${i === roundIndex && phase !== 'intro' && phase !== 'ending' ? ' active' : ''}`; ui.progress.appendChild(dot); });
    ui.score.textContent = String(wins).padStart(2, '0');
  }
  function showToast(message) {
    ui.toast.textContent = message; ui.toast.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => ui.toast.classList.remove('show'), 1650);
  }
  function showPrompt(kicker, title, sub, ready = false) {
    ui.kicker.textContent = kicker; ui.promptText.textContent = title; ui.promptSub.textContent = sub; ui.prompt.classList.toggle('ready', ready); ui.prompt.hidden = false;
  }
  function hideScreens() { ui.intro.hidden = true; ui.result.hidden = true; ui.ending.hidden = true; }
  function startGame() {
    wins = 0; roundIndex = 0; reactionTimes = []; hideScreens(); ui.hud.hidden = false; ui.hint.innerHTML = 'AFINA EL OÍDO <span>·</span> NO TE ADELANTES'; beginRound();
  }
  function beginRound() {
    phase = 'waiting'; const duel = duels[roundIndex]; ui.round.textContent = String(roundIndex + 1).padStart(2, '0'); ui.roundName.textContent = duel.name; ui.opponent.textContent = duel.opponent;
    ui.rank.textContent = '◆ '.repeat(duel.rank) + '◇ '.repeat(3 - duel.rank); updateProgress();
    const wait = rand(...duel.wait); readyAt = performance.now() + wait; deadline = readyAt + duel.window; startedAt = 0;
    showPrompt('MANTÉN LA CALMA', 'NO TE ADELANTES', 'Espera la señal...');
    window.clearTimeout(window._duelTimer); window._duelTimer = setTimeout(() => { if (phase === 'waiting') armDuel(); }, wait);
  }
  function armDuel() {
    if (phase !== 'waiting') return;
    phase = 'armed'; readyAt = performance.now(); deadline = readyAt + duels[roundIndex].window;
    showPrompt('¡AHORA!', '¡DESENFUNDA!', 'Pulsa ESPACIO o toca ¡DISPARA!', true); ui.hint.innerHTML = '¡AHORA! <span>·</span> ¡DISPARA!';
    playTone(740, .1, 'square', .04);
    window.clearTimeout(window._shotTimer); window._shotTimer = setTimeout(() => { if (phase === 'armed') lose('Tu rival fue más rápido.'); }, duels[roundIndex].window);
  }
  function shoot() {
    if (phase === 'waiting') { lose('¡Te adelantaste! La paciencia también es un arma.'); return; }
    if (phase !== 'armed') return;
    const reaction = performance.now() - readyAt; phase = 'result'; window.clearTimeout(window._shotTimer); lastShot = performance.now();
    reactionTimes.push(reaction); wins++; updateProgress(); ui.flash.classList.remove('fire'); void ui.flash.offsetWidth; ui.flash.classList.add('fire'); playShot();
    ui.prompt.hidden = true; ui.hud.hidden = true; ui.result.hidden = false;
    ui.resultEyebrow.textContent = reaction < 270 ? 'UNA MANO DE LEYENDA' : 'EL POLVO SE ASIENTA';
    ui.resultTitle.textContent = '¡VICTORIA!'; ui.resultMessage.textContent = reaction < 270 ? 'Ni siquiera vio venir el destello.' : 'Tu mano habló primero.';
    ui.reaction.textContent = (reaction / 1000).toFixed(2) + ' s';
    ui.continue.querySelector('span').textContent = roundIndex === duels.length - 1 ? 'RECLAMAR LA LEYENDA' : 'SIGUIENTE DUELO';
    ui.continue.onclick = () => { if (roundIndex + 1 >= duels.length) finishGame(); else { roundIndex++; ui.result.hidden = true; ui.hud.hidden = false; beginRound(); } };
  }
  function lose(reason) {
    if (phase !== 'waiting' && phase !== 'armed') return;
    phase = 'result'; window.clearTimeout(window._duelTimer); window.clearTimeout(window._shotTimer); playShot();
    ui.prompt.hidden = true; ui.hud.hidden = true; ui.result.hidden = false;
    ui.resultEyebrow.textContent = reason.startsWith('¡Te') ? 'LA PRISA CUESTA CARO' : 'EL POLVO SE ASIENTA'; ui.resultTitle.textContent = 'DERROTA'; ui.resultMessage.textContent = reason;
    ui.reaction.textContent = '—'; ui.continue.querySelector('span').textContent = 'INTENTAR DE NUEVO';
    ui.continue.onclick = () => { ui.result.hidden = true; ui.hud.hidden = false; beginRound(); };
  }
  function finishGame() {
    phase = 'ending'; ui.result.hidden = true; ui.hud.hidden = true; ui.ending.hidden = false;
    const average = reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length; ui.average.textContent = (average / 1000).toFixed(2) + ' s'; updateProgress();
  }
  function playTone(freq, duration, type = 'sine', volume = .1) {
    if (!soundOn) return;
    try { audio ||= new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === 'suspended') audio.resume(); const osc = audio.createOscillator(), gain = audio.createGain(); osc.type = type; osc.frequency.value = freq; gain.gain.setValueAtTime(volume, audio.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + duration); osc.connect(gain); gain.connect(audio.destination); osc.start(); osc.stop(audio.currentTime + duration); } catch (_) {}
  }
  function playShot() { if (!soundOn) return; playTone(100, .24, 'sawtooth', .12); setTimeout(() => playTone(54, .38, 'triangle', .12), 28); }
  ui.start.addEventListener('click', startGame);
  ui.again.addEventListener('click', startGame);
  ui.draw.addEventListener('pointerdown', (event) => { event.preventDefault(); shoot(); });
  canvas.addEventListener('pointerdown', () => { if (phase === 'waiting' || phase === 'armed') shoot(); });
  window.addEventListener('keydown', (event) => {
    if ((event.code === 'Space' || event.code === 'Enter') && !event.repeat) {
      if (phase === 'intro' && event.code === 'Enter') startGame(); else if (phase === 'waiting' || phase === 'armed') { event.preventDefault(); shoot(); }
    }
  });
  ui.sound.addEventListener('click', () => { soundOn = !soundOn; ui.sound.innerHTML = `${soundOn ? '♫' : '×'} <span>${soundOn ? 'SONIDO' : 'SILENCIO'}</span>`; ui.sound.setAttribute('aria-label', soundOn ? 'Desactivar sonido' : 'Activar sonido'); if (soundOn) playTone(500, .08, 'sine', .035); });
})();
