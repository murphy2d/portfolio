document.getElementById('year').textContent = new Date().getFullYear();

/* ---------------- Schematic current-flow: splits at C2, then at C1/diode, merges in two stages ---------------- */
(function schematicCurrentFlow(){
  const pAIn     = document.getElementById('p-a-in');
  const pC2      = document.getElementById('p-c2');
  const pThrough = document.getElementById('p-through');
  const pC1      = document.getElementById('p-c1');
  const pNr      = document.getElementById('p-nr');
  const pM1M2    = document.getElementById('p-m1-m2');
  const pFinal   = document.getElementById('p-final');

  const dotAIn     = document.getElementById('dot-a-in');
  const dotC2      = document.getElementById('dot-c2');
  const dotThrough = document.getElementById('dot-through');
  const dotC1      = document.getElementById('dot-c1');
  const dotNr      = document.getElementById('dot-nr');
  const dotM1M2    = document.getElementById('dot-m1-m2');
  const dotFinal   = document.getElementById('dot-final');

  const pingNodeA  = document.getElementById('ping-node-a');
  const pingNodeB  = document.getElementById('ping-node-b');
  const pingMerge1 = document.getElementById('ping-merge1');
  const pingMerge2 = document.getElementById('ping-merge2');

  const capC1 = document.getElementById('cap-c1');
  const capC2 = document.getElementById('cap-c2');
  const capNr = document.getElementById('cap-nr');

  const paths = { pAIn, pC2, pThrough, pC1, pNr, pM1M2, pFinal };
  const dots  = { dotAIn, dotC2, dotThrough, dotC1, dotNr, dotM1M2, dotFinal };
  if(Object.values(paths).some(p=>!p) || Object.values(dots).some(d=>!d)) return;

  const lenAIn     = pAIn.getTotalLength();
  const lenC2      = pC2.getTotalLength();
  const lenThrough = pThrough.getTotalLength();
  const lenC1      = pC1.getTotalLength();
  const lenNr      = pNr.getTotalLength();
  const lenM1M2    = pM1M2.getTotalLength();
  const lenFinal   = pFinal.getTotalLength();

  function place(el, path, len, frac){
    frac = Math.max(0, Math.min(1, frac));
    const pt = path.getPointAtLength(frac * len);
    el.setAttribute('cx', pt.x.toFixed(2));
    el.setAttribute('cy', pt.y.toFixed(2));
  }
  function edgeFade(frac, inW, outW){
    if(frac < inW) return frac / inW;
    if(frac > 1 - outW) return (1 - frac) / outW;
    return 1;
  }
  function ping(el){
    if(!el) return;
    el.classList.remove('ping-active');
    void el.getBBox();
    el.classList.add('ping-active');
  }
  function flashCap(el){
    if(!el) return;
    el.classList.add('cap-flash');
    setTimeout(()=> el.classList.remove('cap-flash'), 420);
  }
  function active(t, off, dur){ return t >= off && t < off + dur; }

  // Timing model. C2 peels off first, at node A, and doesn't rejoin the
  // main bus until merge 2 — so its journey spans the ENTIRE node-B split
  // + merge-1 chain below, making it read as the slowest of the three
  // branch currents. The Chua's Diode branch covers the longest physical
  // path in the same window as C1 (both must land on merge 1 together),
  // so it naturally reads as the fastest, with C1 in between.
  const T_A       = 550;  // L -> node A
  const T_PING_A  = 90;
  const T_THROUGH = 500;  // node A -> node B (through R)
  const T_PING_B  = 90;
  const T_SPLIT   = 850;  // node B -> merge 1 (C1 & diode, synced arrival) — slowed so the diode dot reads clearly
  const T_PING_M1 = 90;
  const T_M1_M2   = 420;  // merge 1 -> merge 2
  const T_C2      = T_THROUGH + T_PING_B + T_SPLIT + T_PING_M1 + T_M1_M2; // synced with the chain above
  const T_PING_M2 = 90;
  const T_FINAL   = 420;  // merge 2 -> back to L

  const OFF_A       = 0;
  const OFF_PING_A  = OFF_A + T_A;
  const OFF_SPLIT_A = OFF_PING_A + T_PING_A;      // dot-c2 & dot-through both start here
  const OFF_PING_B  = OFF_SPLIT_A + T_THROUGH;
  const OFF_SPLIT_B = OFF_PING_B + T_PING_B;      // dot-c1 & dot-nr both start here
  const OFF_PING_M1 = OFF_SPLIT_B + T_SPLIT;
  const OFF_M1_M2   = OFF_PING_M1 + T_PING_M1;
  const OFF_PING_M2 = OFF_SPLIT_A + T_C2;         // == OFF_M1_M2 + T_M1_M2 — the sync point with dot-c2
  const OFF_FINAL   = OFF_PING_M2 + T_PING_M2;
  const CYCLE       = OFF_FINAL + T_FINAL;

  let start = null;
  let firedA=false, firedB=false, firedM1=false, firedM2=false, firedFlashB=false, firedFlashC2=false;

  function frame(ts){
    requestAnimationFrame(frame);
    if(start === null) start = ts;
    const t = (ts - start) % CYCLE;
    if(t < 16){ firedA=false; firedB=false; firedM1=false; firedM2=false; firedFlashB=false; firedFlashC2=false; }

    // L -> node A
    if(active(t, OFF_A, T_A)){
      const frac = (t - OFF_A) / T_A;
      dotAIn.setAttribute('opacity', edgeFade(frac,0.06,0.06).toFixed(2));
      place(dotAIn, pAIn, lenAIn, frac);
    } else dotAIn.setAttribute('opacity','0');

    if(t >= OFF_PING_A && !firedA){ ping(pingNodeA); firedA = true; }

    // Node A splits: C2 (slow, long) and "through" (to node B)
    if(active(t, OFF_SPLIT_A, T_C2)){
      const frac = (t - OFF_SPLIT_A) / T_C2;
      dotC2.setAttribute('opacity', edgeFade(frac,0.05,0.05).toFixed(2));
      place(dotC2, pC2, lenC2, frac);
      if(!firedFlashC2 && frac > 0.3){ flashCap(capC2); firedFlashC2 = true; }
    } else dotC2.setAttribute('opacity','0');

    if(active(t, OFF_SPLIT_A, T_THROUGH)){
      const frac = (t - OFF_SPLIT_A) / T_THROUGH;
      dotThrough.setAttribute('opacity', edgeFade(frac,0.08,0.08).toFixed(2));
      place(dotThrough, pThrough, lenThrough, frac);
    } else dotThrough.setAttribute('opacity','0');

    if(t >= OFF_PING_B && !firedB){ ping(pingNodeB); firedB = true; }

    // Node B splits: C1 and Chua's Diode, synced arrival at merge 1
    if(active(t, OFF_SPLIT_B, T_SPLIT)){
      const frac = (t - OFF_SPLIT_B) / T_SPLIT;
      const fade = edgeFade(frac,0.08,0.08);
      dotC1.setAttribute('opacity', fade.toFixed(2));
      dotNr.setAttribute('opacity', fade.toFixed(2));
      place(dotC1, pC1, lenC1, frac);
      place(dotNr, pNr, lenNr, frac);
      if(!firedFlashB && frac > 0.35){ flashCap(capC1); flashCap(capNr); firedFlashB = true; }
    } else {
      dotC1.setAttribute('opacity','0');
      dotNr.setAttribute('opacity','0');
    }

    if(t >= OFF_PING_M1 && !firedM1){ ping(pingMerge1); firedM1 = true; }

    // Merge 1 (C1 + diode) -> merge 2 (C2's junction)
    if(active(t, OFF_M1_M2, T_M1_M2)){
      const frac = (t - OFF_M1_M2) / T_M1_M2;
      dotM1M2.setAttribute('opacity', edgeFade(frac,0.1,0.1).toFixed(2));
      place(dotM1M2, pM1M2, lenM1M2, frac);
    } else dotM1M2.setAttribute('opacity','0');

    if(t >= OFF_PING_M2 && !firedM2){ ping(pingMerge2); firedM2 = true; }

    // Merge 2 (+ C2) -> back to L
    if(active(t, OFF_FINAL, T_FINAL)){
      const frac = (t - OFF_FINAL) / T_FINAL;
      dotFinal.setAttribute('opacity', edgeFade(frac,0.08,0.1).toFixed(2));
      place(dotFinal, pFinal, lenFinal, frac);
    } else dotFinal.setAttribute('opacity','0');
  }
  requestAnimationFrame(frame);
})();

/* ---------------- Mini scope in header ---------------- */
(function miniScope(){
  const canvas = document.getElementById('mini-scope-canvas');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  let w,h,dpr;

  function resize(){
    dpr = window.devicePixelRatio || 1;
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = w*dpr;
    canvas.height = h*dpr;
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.fillStyle = '#0E1013';
    ctx.fillRect(0,0,w,h);
  }
  resize();

  let scoreResizeQueued = false;
  new ResizeObserver(() => {
    if(scoreResizeQueued) return;
    scoreResizeQueued = true;
    requestAnimationFrame(() => { scoreResizeQueued = false; resize(); });
  }).observe(canvas);

  let t = 0;
  function draw(){
    requestAnimationFrame(draw);
    t += 0.06;
    const scrollFrac = Math.min(1, window.scrollY / (document.body.scrollHeight - window.innerHeight || 1));
    const freq = 0.9 + scrollFrac*1.6;
    
    ctx.fillStyle = 'rgba(21,24,28,0.38)';
    ctx.fillRect(0, 0, w, h);
    
    const midY = h/2;
    const amp = h * 0.3;
    
    ctx.beginPath();
    for(let x=0; x<=w; x+=2){
      const y = midY + Math.sin((x/w)*Math.PI*2*freq + t) * amp;
      if(x===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.lineJoin = 'round';
    
    ctx.strokeStyle = '#DF4533'; 
    ctx.lineWidth = 1.0;
    ctx.shadowColor = '#DF4533';
    ctx.shadowBlur = 4;
    ctx.stroke();
    
    ctx.lineWidth = 0.5;
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#F26A5A';
    ctx.stroke();
  }
  draw();
})();

/* ---------------- CHUA ATTRACTOR & EASTER EGG TOGGLE ---------------- */
(function chuaAttractor(){
  const wrapper = document.getElementById('chua-wrapper');
  const trigger = document.getElementById('schematic-trigger');
  const canvas = document.getElementById('chua-canvas');
  const btn = document.getElementById('chua-info-btn');
  const panel = document.getElementById('chua-panel');
  const slider = document.getElementById('chua-alpha');
  const valDisplay = document.getElementById('alpha-val');
  if(!canvas || !wrapper || !trigger || !btn || !panel) return;

  const ctx = canvas.getContext('2d');
  let w, h, dpr;
  let scaleX = 1, scaleY = 1, centerRawX = 0, centerRawY = 0;
  let rawMinX = 0, rawMaxX = 0, rawMinY = 0, rawMaxY = 0;
  
  let isSimulating = false;

  trigger.addEventListener('click', () => {
    isSimulating = true;
    wrapper.classList.add('is-active');
    resize();
  });

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = panel.classList.contains('open');
    panel.classList.toggle('open');
    btn.setAttribute('aria-expanded', !isOpen);
    wrapper.classList.toggle('panel-open', !isOpen);
  });

  wrapper.addEventListener('mouseleave', () => {
    panel.classList.remove('open');
    wrapper.classList.remove('panel-open');
    btn.setAttribute('aria-expanded', 'false');
  });

  function strokeSegment(flatPts, startIdx, style, lineWidth){
    if(startIdx >= flatPts.length) return;
    ctx.beginPath();
    let first = true;
    for(let i=startIdx; i<flatPts.length; i+=3){
      const p = project(flatPts[i], flatPts[i+1], flatPts[i+2]);
      if(first){ ctx.moveTo(p[0], p[1]); first = false; } else { ctx.lineTo(p[0], p[1]); }
    }
    ctx.strokeStyle = style;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  }

  function fullRedraw(){
    ctx.clearRect(0, 0, w, h);
    strokeSegment(pts, 0, backdropGradient, 1.5);
    strokeSegment(pts, Math.max(0, pts.length - HEAD_PTS3), headStroke, 2.0);
  }

  let backdropGradient, headStroke;

  function resize(){
    dpr = window.devicePixelRatio || 1;
    w = wrapper.clientWidth || canvas.clientWidth || 300;
    h = wrapper.clientHeight || canvas.clientHeight || 300;
    
    canvas.width = w * dpr;  
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    
    computeScale();
    
    backdropGradient = ctx.createLinearGradient(0, 0, w, h);
    backdropGradient.addColorStop(0, 'rgba(101, 121, 138, 0.2)'); 
    backdropGradient.addColorStop(1, 'rgba(223, 69, 51, 0.5)'); 
    headStroke = 'rgba(255, 92, 74, 0.9)'; 
    
    if(isSimulating) fullRedraw();
  }

  let attractorResizeQueued = false;
  new ResizeObserver(() => {
    if(attractorResizeQueued) return;
    attractorResizeQueued = true;
    requestAnimationFrame(() => { attractorResizeQueued = false; resize(); });
  }).observe(wrapper);

  let alpha = 15.3;
  const beta = 28;
  const m0 = -1.143;
  const m1 = -0.714;
  const dt = 0.01;

  const CAPACITY = 5000;    
  const SEED_STEPS = 6000;  
  const STEPS_PER_FRAME = 4; 
  const REBUILD_EVERY = 6;  
  const HEAD_PTS3 = 130 * 3; 

  let x = 0.1, y = 0, z = 0;
  let pts = [];  
  let frameCount = 0;

  function f(xVal){
    return m1 * xVal + 0.5 * (m0 - m1) * (Math.abs(xVal + 1) - Math.abs(xVal - 1));
  }

  function step(){
    const dx = alpha * (y - x - f(x));
    const dy = x - y + z;
    const dz = -beta * y;
    x += dx * dt; y += dy * dt; z += dz * dt;
    if(isNaN(x) || Math.abs(x) > 100){ x = 0.1; y = 0; z = 0; }
  }

  function seed(){
    x = 0.1; y = 0; z = 0;
    for(let i=0; i<4000; i++) step();  
    const settledX = x, settledY = y, settledZ = z;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for(let i=0; i<SEED_STEPS; i++){
      step();
      const r = rawProject(x, y, z);
      if(r[0] < minX) minX = r[0];
      if(r[0] > maxX) maxX = r[0];
      if(r[1] < minY) minY = r[1];
      if(r[1] > maxY) maxY = r[1];
    }
    rawMinX = minX; rawMaxX = maxX; rawMinY = minY; rawMaxY = maxY;
    computeScale();
    x = settledX; y = settledY; z = settledZ;
    pts = [];
  }
  seed();

  function rawProject(px_, py_, pz_){
    return [ px_*0.85 + py_*0.3, -(pz_*0.85 - px_*0.1) ];
  }

  function computeScale(){
    if(!w || !h) return; 
    const spanX = Math.max(0.0001, rawMaxX - rawMinX);
    const spanY = Math.max(0.0001, rawMaxY - rawMinY);
    centerRawX = (rawMinX + rawMaxX) / 2;
    centerRawY = (rawMinY + rawMaxY) / 2;
    const availW = w * 0.92;
    const availH = h * 0.72;
    scaleX = availW / spanX;
    scaleY = availH / spanY;
  }

  function project(px_, py_, pz_){
    const r = rawProject(px_, py_, pz_);
    return [ w/2 + (r[0] - centerRawX) * scaleX, h/2 + (r[1] - centerRawY) * scaleY ];
  }

  slider.addEventListener('input', (e) => {
    alpha = parseFloat(e.target.value);
    valDisplay.textContent = alpha.toFixed(1);
    seed();
    if(isSimulating) fullRedraw();
  });

  function draw(){
    requestAnimationFrame(draw);
    if(!isSimulating) return;

    for(let i=0; i<STEPS_PER_FRAME; i++){ step(); pts.push(x, y, z); }
    if(pts.length > CAPACITY*3) pts.splice(0, pts.length - CAPACITY*3);
    frameCount++;

    if(frameCount % REBUILD_EVERY === 0){
      fullRedraw();
    } else {
      strokeSegment(pts, Math.max(0, pts.length - (STEPS_PER_FRAME + 1) * 3), headStroke, 2.0);
    }
  }
  draw();
})();

/* ---------------- Gauge / skill-bar charge-in on scroll ---------------- */
(function chargeReadouts(){
  const targets = document.querySelectorAll('.gauge-fill, .skill-bar-fill');
  if(!targets.length) return;
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        const el = entry.target;
        const fill = el.getAttribute('data-fill') || '0%';
        requestAnimationFrame(()=>{ el.style.width = fill; });
        io.unobserve(el);
      }
    });
  }, {threshold:0.35});
  targets.forEach(el=>io.observe(el));
})();

/* ---------------- Section trace dividers ---------------- */
(function traceDividers(){
  const dividers = document.querySelectorAll('[data-trace]');
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        entry.target.classList.add('lit');
        io.unobserve(entry.target);
      }
    });
  }, {threshold:0.4});
  dividers.forEach(d=>io.observe(d));
})();

/* ---------------- Corner HUD Logic ---------------- */
(function chargeHUD(){
  const unit = document.getElementById('cap-unit');
  const fillRect = document.getElementById('cap-fill-rect');
  const coil = document.getElementById('coil-path');
  const canvas = document.getElementById('hud-graph');
  if(!unit || !fillRect || !coil || !canvas) return;
  const ctx = canvas.getContext('2d');

  let w,h,dpr;
  function resize(){
    dpr = window.devicePixelRatio || 1;
    w = canvas.clientWidth || 48;
    h = canvas.clientHeight || 32;
    canvas.width = w*dpr;
    canvas.height = h*dpr;
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  resize();

  let hudResizeQueued = false;
  new ResizeObserver(() => {
    if(hudResizeQueued) return;
    hudResizeQueued = true;
    requestAnimationFrame(() => { hudResizeQueued = false; resize(); });
  }).observe(canvas);

  const GAP_TOP = 25, GAP_H = 22; 
  const SMOOTH = 0.07;              
  const EPS = 0.0015;

  let level = 0;
  let mode = 'capacitor';           
  let state = 'idle';               
  const samples = [];
  const MAX_SAMPLES = 90;

  function target(){
    const max = document.body.scrollHeight - window.innerHeight;
    return max > 0 ? Math.max(0, Math.min(1, window.scrollY / max)) : 0;
  }

  function drawGraph(){
    ctx.clearRect(0,0,w,h);
    if(samples.length < 2) return;
    ctx.beginPath();
    for(let i=0;i<samples.length;i++){
      const px = (i/(MAX_SAMPLES-1))*w;
      const py = h - samples[i]*h*0.9 - h*0.05;
      if(i===0) ctx.moveTo(px,py); else ctx.lineTo(px,py);
    }
    
    const color = state === 'idle' ? '#637281' : '#DF4533';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.4;
    ctx.shadowColor = color;
    ctx.shadowBlur = state === 'idle' ? 0 : 4;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  function tick(){
    requestAnimationFrame(tick);
    const t = target();
    const delta = t - level;

    if(Math.abs(delta) < EPS){
      state = 'idle';
    } else if(delta > 0){
      state = 'charging';
      level += delta*SMOOTH;
    } else {
      state = 'discharging';
      level += delta*SMOOTH;
    }
    level = Math.max(0, Math.min(1, level));

    const nextMode = state === 'discharging' ? 'inductor' : 'capacitor';
    if(nextMode !== mode){
      mode = nextMode;
      unit.classList.toggle('mode-inductor', mode === 'inductor');
      unit.classList.toggle('mode-capacitor', mode === 'capacitor');
    }
    unit.classList.toggle('charging', state === 'charging');
    unit.classList.toggle('discharging', state === 'discharging');

    const fillH = level*GAP_H;
    fillRect.setAttribute('y', (GAP_TOP + GAP_H - fillH).toFixed(2));
    fillRect.setAttribute('height', fillH.toFixed(2));
    fillRect.setAttribute('fill', 'var(--copper)');

    if (mode === 'inductor') {
      coil.style.strokeOpacity = (0.3 + (1 - level) * 0.7).toFixed(2);
    } else {
      coil.style.strokeOpacity = (0.3 + level * 0.7).toFixed(2);
    }

    samples.push(level);
    if(samples.length > MAX_SAMPLES) samples.shift();
    drawGraph();
  }
  requestAnimationFrame(tick);
})();

/* ---------------- Back to top ---------------- */
(function backToTop(){
  const btn = document.getElementById('totop-btn');
  if(!btn) return;
  const hero = document.querySelector('.hero');

  function checkVisibility(){
    const threshold = hero ? hero.offsetHeight*0.6 : window.innerHeight*0.5;
    btn.classList.toggle('visible', window.scrollY > threshold);
  }
  window.addEventListener('scroll', checkVisibility, {passive:true});
  checkVisibility();

  btn.addEventListener('click', ()=>{
    window.scrollTo({top:0, behavior:'smooth'});
  });
})();
