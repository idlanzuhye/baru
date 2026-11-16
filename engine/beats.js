// beatreel engine: builds the reel from window.REEL (written by beatreel.py) onto one paused GSAP timeline.
// Every time is in seconds on the reel clock. All state changes go through the timeline (tl.set / tweens), never
// through callbacks, so the renderer can seek to any frame in any order.
//
// The motion language:
//  - captions reveal one word at a time as it is spoken (key words, written _like this_ in the script, get the
//    theme's highlight), in short phrase blocks that slide up and out when the next block starts;
//  - each idea gets a hero (often a big panel) that builds up piece by piece on the words, then leaves upward;
//  - numbers roll like an odometer; text can decode; stamps slam; grids assemble and drop away;
//  - the presenter rises in on the first beat, can start big ("cam": "big") and shrink when the hero lands,
//    and reacts with burst lines around the head.
(function () {
  const R = window.REEL, st = document.getElementById('stage'), tl = gsap.timeline({ paused: true });
  const $ = (tag, cls, parent, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; (parent || st).appendChild(e); return e; };
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const vis = (el, a, b) => { tl.set(el, { autoAlpha: 0 }, 0); tl.set(el, { autoAlpha: 1 }, Math.max(0, a)); if (b != null) tl.set(el, { autoAlpha: 0 }, b); };
  const on = (el, t) => { tl.set(el, { attr: { 'data-on': 0 } }, 0); tl.set(el, { attr: { 'data-on': 1 } }, t); };
  // seeded random, so a frame always renders the same
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  st.className = 't-' + (R.theme || 'studio') + ' bg-' + (R.bg || 'grid') + (R.wide ? ' wide' : '') + (R.flashes ? ' flashmode' : '');
  Object.entries(R.colors || {}).forEach(([k, v]) => st.style.setProperty('--' + k, v));   // "colors": {"accent": "#0a7", "bg": "#fff8ee", ...}
  const FW = R.W || 1080, FH = R.H || 1920, CX = R.wide && !R.nopres ? 700 : FW / 2;
  const POP = R.theme !== 'paper';   // studio / night: words pop up; paper: words fade in grey and turn ink
  if (R.nopres) document.getElementById('pres').style.display = 'none';

  // ---- meta row: slug on the left, a running counter on the right
  const meta = document.getElementById('meta'); if (R.meta === false) meta.style.display = 'none'; const slug = $('span', '', meta), cnt = $('span', '', meta); cnt.id = 'cnt'; slug.style.position = 'relative'; cnt.style.position = 'relative';
  const counter = R.counter || null; let lastVal = null;
  R.beats.forEach(b => {
    const sp = $('span', '', slug, '// ' + esc(b.slug || '')); sp.style.cssText = 'position:absolute;left:0;top:0;white-space:nowrap'; vis(sp, b.t0, b.t1);
    if (counter) { const v = b.count ?? lastVal ?? counter.start ?? ''; const changed = lastVal !== null && v !== lastVal;
      const cp = $('span', '', cnt, esc(counter.label) + ' <b>' + esc(v) + '</b>'); cp.style.cssText = 'position:absolute;right:0;top:0;white-space:nowrap;transform-origin:100% 50%'; vis(cp, b.t0, b.t1);
      if (changed) tl.fromTo(cp, { scale: 1.35 }, { scale: 1, duration: .3, ease: 'back.out(3)', immediateRender: false }, b.t0);
      lastVal = v; }
  });

  // ---- background floods (a beat can turn the page red / black) and halftone wipes
  const flood = document.getElementById('flood');
  R.beats.forEach(b => {
    const col = b.bg === 'red' ? (getComputedStyle(st).getPropertyValue('--accent').trim() || '#e8452c') : b.bg === 'black' ? '#0d0d0d' : null;
    if (col) { tl.set(flood, { background: col, opacity: 1 }, b.t0); tl.set(flood, { opacity: 0 }, b.t1);
      tl.set(st, { '--ink': '#fff', '--mute': 'rgba(255,255,255,.4)', '--meta': 'rgba(255,255,255,.7)', '--accent': b.bg === 'red' ? '#111' : 'var(--hi)' }, b.t0);
      tl.set(st, { '--ink': '', '--mute': '', '--meta': '', '--accent': '' }, b.t1); }
    if (b.wipe) { const w = document.getElementById('wipe'); tl.set(w, { '--r': '0px' }, 0);
      tl.to(w, { '--r': '30px', duration: .2, ease: 'power2.in' }, b.t0 - .2); tl.to(w, { '--r': '0px', duration: .22, ease: 'power2.out' }, b.t0); }
  });

  // ---- caption: phrase blocks; each word fades in grey on its time and turns ink a beat later
  const cap = document.getElementById('cap');
  R.lines.forEach((ln, k) => {
    const el = $('div', 'cl', cap); el.innerHTML = ln.words.map(w => `<span class="w${w.it ? ' it' : ''}">${esc(w.w)}</span>`).join('');
    const end = k + 1 < R.lines.length ? R.lines[k + 1].start - .07 : R.dur; vis(el, ln.start - .06, end);
    if (R.capY) { const bt = R.beats.find(b => ln.start >= b.t0 - .01 && ln.start < b.t1) || R.beats[0]; el.style.top = ((bt.pres === false ? R.capY[1] : R.capY[0]) - 170) + 'px'; }
    el.querySelectorAll('.w').forEach((s, j) => { const t = ln.words[j].t;
      if (POP) tl.fromTo(s, { opacity: 0, y: 26, scale: .7 }, { opacity: 1, y: 0, scale: 1, duration: .22, ease: 'back.out(2.2)', immediateRender: true }, t - .08);
      else tl.fromTo(s, { opacity: 0, y: 12, filter: 'blur(5px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: .16, ease: 'power2.out', immediateRender: true }, t - .06);
      on(s, t + .08); });
    if (k + 1 < R.lines.length) tl.to(el, { y: -26, opacity: 0, duration: .12, ease: 'power2.in' }, end - .12);
    requestAnimationFrame(() => { const f = Math.min(1, ((el.parentNode && el.parentNode.clientWidth) || 920) / Math.max(1, el.scrollWidth)); if (f < 1) { el.style.transformOrigin = (R.capY || POP) ? '50% 0' : '0 0'; el.style.transform = `scale(${f})`; } });
  });

  // ---- heroes
  const heroes = document.getElementById('heroes'); const fmt = (v, d) => Number(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  const CK = '<svg viewBox="0 0 24 24" width="62%" height="62%" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 12.5l5 5L19.5 7"/></svg>';
  const XX = '<svg viewBox="0 0 24 24" width="58%" height="58%" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  const PC = ['#4f7cff', '#2fbf74', '#f5a524', '#b56cff', '#ff6b8b', '#20c3d0'], NOTE = ['#ffe27a', '#ffb3c7', '#a8e6ff', '#c3f5a0', '#ffd1a1', '#d9c2ff'];
  const sv = (d, f) => `<svg viewBox="0 0 24 24" fill="${f ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const IC = { mic: sv('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>'), cam: sv('<rect x="3" y="7" width="12" height="10" rx="2"/><path d="M15 11l6-3v8l-6-3"/>'),
    chat: sv('<path d="M4 5h16v11H9l-5 4z"/>'), end: sv('<path d="M3 14c5-5 13-5 18 0l-2 3-4-1v-3c-2-1-4-1-6 0v3l-4 1z"/>', 1), link: sv('<path d="M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1"/>'),
    pen: sv('<path d="M4 20l4-1 11-11-3-3L5 16z"/>'), plane: sv('<path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/>'),
    clock: sv('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    env: '<svg viewBox="0 0 120 80"><rect x="2" y="2" width="116" height="76" rx="10" fill="#f8f6f1"/><path d="M8 9 L60 46 L112 9" fill="none" stroke="#c9c4ba" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/></svg>' };
  const B = {
    card: (o, e) => { e.className += ' card hs'; e.style.width = (o.w || 820) + 'px'; e.innerHTML = (o.label ? `<div class="lbl">${esc(o.label)}</div>` : '') + (o.icon ? `<div class="cic">${o.svg}</div>` : '') + (o.title ? `<h3>${o.title}</h3>` : '') + (o.text ? `<p>${o.text}</p>` : '') + (o.img ? `<img src="${o.img}" style="width:100%;border-radius:14px;margin-top:18px">` : ''); },
    // an odometer: digits roll (random, blurred) and settle left to right
    num: (o, e, t) => { e.className += ' num'; if (o.size) e.style.fontSize = o.size + 'px'; const pre = o.prefix ?? '', suf = o.suffix ?? '', d = o.decimals ?? 0, v = { x: o.from ?? 0, p: 0 };
      const span = $('span', 'nv', e); if (o.label) $('small', '', e, esc(o.label));
      const up = () => { const s = fmt(v.x, d); let out = ''; const n = s.length;
        for (let i = 0; i < n; i++) { const c = s[i]; out += (/\d/.test(c) && v.p < 1 && i / n >= v.p) ? String(Math.floor(((v.x * 7.3 + i * 13) * 97) % 10)) : c; }
        span.textContent = pre + out + suf; span.style.textShadow = v.p < 1 ? `0 -22px 8px var(--ghost), 0 22px 8px var(--ghost)` : 'none'; }; up();
      tl.to(v, { x: o.value, p: 1, duration: o.count ?? .9, ease: 'power3.out', onUpdate: up }, t + .05);
      tl.fromTo(span, { filter: 'blur(3px)' }, { filter: 'blur(0px)', duration: o.count ?? .9, ease: 'power3.in', immediateRender: false }, t + .05); },
    // text that decodes from noise, left to right
    scramble: (o, e, t) => { e.className += ' scr' + (o.red ? ' red' : ''); if (o.size) e.style.fontSize = o.size + 'px'; const txt = String(o.text || ''), v = { p: 0 }, A = '#%&@$0123456789XZ';
      const span = $('span', '', e); const up = () => { let s = ''; for (let i = 0; i < txt.length; i++) s += (i / txt.length < v.p || txt[i] === ' ') ? txt[i] : A[Math.floor((i * 31 + v.p * 977) % A.length)]; span.textContent = s; }; up();
      tl.to(v, { p: 1.001, duration: o.decode ?? .7, ease: 'none', onUpdate: up }, t + .05); if (o.label) $('small', '', e, esc(o.label)); },
    sticker: (o, e) => { e.innerHTML = (o.lines || [o.text]).map((s, k) => `<div class="stk ${o.red && k === (o.redLine ?? 0) ? 'red' : ''}" style="display:block;width:max-content;margin:${k ? 10 : 0}px auto 0${o.size ? `;font-size:${o.size}px` : ''}">${esc(s)}</div>`).join(''); },
    stamp: (o, e) => { e.innerHTML = `<div class="stamp"${o.size ? ` style="font-size:${o.size}px"` : ''}>${esc(o.text)}</div>`; },
    shot: (o, e, t) => { e.className += ' shot hs'; e.style.width = (o.w || 900) + 'px';
      e.innerHTML = `<div class="bar"><i></i><i></i><i></i><span>${esc(o.label || '')}</span></div><div style="position:relative"><img src="${o.src}">${(o.rings || []).map(r => `<div class="ring" style="left:${r[0]}%;top:${r[1]}%;width:${r[2]}%;height:${r[3]}%"></div>`).join('')}</div>`;
      e.querySelectorAll('.ring').forEach((r, k) => { const a = o.ringAt?.[k] ?? t + .5; vis(r, a); tl.fromTo(r, { scale: 1.6, opacity: 0 }, { scale: 1, opacity: 1, duration: .3, ease: 'back.out(2)', immediateRender: false }, a); }); },
    phone: (o, e) => { e.className += ' phone hs'; e.innerHTML = `<div class="scr">${o.src ? `<img src="${o.src}">` : `<div class="pt">${o.title || ''}</div>`}</div>`; if (o.scale) e.style.scale = o.scale; },
    term: (o, e, t) => { e.className += ' term hs'; if (o.w) e.style.width = o.w + 'px'; e.innerHTML = `<div class="tb"><i></i><i></i><i></i><span>${esc(o.title || 'terminal')}</span></div><div class="tx"></div>`;
      const tx = e.querySelector('.tx'), full = (o.lines || []).join('\n'), v = { n: 0 };
      const up = () => { const s = full.slice(0, Math.round(v.n)); tx.innerHTML = esc(s).replace(/\$ /g, '<em>$ </em>').replace(/(DO NOT INSTALL|CRITICAL|100\/100|FAILED|TIMEOUT|UNHEALTHY)/g, '<b class="bad">$1</b>').replace(/\b(SAFE|LOW|17\/100)\b/g, '<b class="ok">$1</b>').replace(/\b(HIGH|MEDIUM)\b/g, '<b class="mid">$1</b>') + '<span class="cur"></span>'; }; up();
      tl.to(v, { n: full.length, duration: o.typeDur ?? Math.min(2.2, full.length * .03), ease: 'none', onUpdate: up }, t + .25); },
    logo: (o, e) => { e.className += ' logo'; e.innerHTML = `<div class="mk hs">${o.svg || ''}</div>${o.name ? `<b>${esc(o.name)}</b>` : ''}`; },
    list: (o, e) => { e.className += ' list card hs'; if (o.w) e.style.width = o.w + 'px'; e.innerHTML = (o.title ? `<div class="lbl">${esc(o.title)}</div>` : '') + (o.items || []).map(s => `<div class="li"><div class="bx"><span>${o.mark === 'x' ? XX : CK}</span></div><span>${esc(s)}</span></div>`).join('');
      e.querySelectorAll('.li').forEach((li, k) => { const at = o.ticks?.[k]; if (at == null) return; on(li, at);
        tl.fromTo(li.querySelector('.bx'), { scale: 1.6 }, { scale: 1, duration: .25, ease: 'back.out(3)', immediateRender: false }, at); }); },
    // icon tiles in a row, each landing on its own word
    row: (o, e, t) => { e.className += ' row'; (o.tiles || []).forEach((x, k) => { const c = $('div', 'tile card hs', e, `<div class="ti">${x.svg || ''}</div><b>${esc(x.label || '')}</b>`); const a = o.ats?.[k] ?? t + k * .25;
      vis(c, a); tl.fromTo(c, { y: 60, scale: .5, rotation: k % 2 ? 8 : -8, opacity: 0 }, { y: 0, scale: 1, rotation: 0, opacity: 1, duration: .38, ease: 'back.out(2)', immediateRender: false }, a);
      const xa = o.crossAt?.[k]; if (xa != null) { const xx = $('div', 'tx', c, XX); vis(xx, xa); on(c, xa); tl.fromTo(xx, { scale: 2.2, opacity: 0, rotation: -20 }, { scale: 1, opacity: 1, rotation: 0, duration: .25, ease: 'power4.out', immediateRender: false }, xa); } }); },
    grid: (o, e, t) => { e.className += ' grid' + (o.shape === 'doc' ? ' docs' : ''); e.style.gridTemplateColumns = `repeat(${o.cols || 6}, ${o.shape === 'doc' ? 74 : 92}px)`; for (let k = 0; k < (o.n || 24); k++) $('div', 'p', e);
      const ps = [...e.querySelectorAll('.p')]; tl.fromTo(ps, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: .25, stagger: { each: .012, from: 'random' }, ease: 'back.out(2)', immediateRender: false }, t);
      (o.hi || []).forEach((k, j) => on(ps[k], o.hiAt?.[j] ?? t + .6));
      if (o.dropAt != null) tl.to(ps, { y: () => 260 + rnd() * 300, rotation: () => (rnd() - .5) * 160, opacity: 0, duration: .6, ease: 'power2.in', stagger: { each: .01, from: 'random' } }, o.dropAt); },
    compare: (o, e, t) => { e.className += ' cmp'; const sides = o.swap ? [['good', CK, o.left], ['bad', XX, o.right]] : [['bad', XX, o.left], ['good', CK, o.right]]; e.innerHTML = sides.map(([c, m, s]) => `<div class="card hs ${c}"><div class="mark">${m}</div><h3>${s?.title || ''}</h3><p>${s?.text || ''}</p></div>`).join('');
      const cs = e.querySelectorAll('.card'); const a = o.rightAt ?? t + .6; vis(cs[1], a); tl.fromTo(cs[1], { scale: .6, opacity: 0 }, { scale: 1, opacity: 1, duration: .35, ease: 'back.out(2)', immediateRender: false }, a); },
    comment: (o, e) => { e.className += ' cmt card hs'; e.innerHTML = `<div class="who"><i></i><span>${esc(o.who || 'Your comment')}</span></div><div class="kw">${esc(o.keyword || 'SKILL')}</div>`; },
    date: (o, e) => { e.className += ' date hs'; e.innerHTML = `<div class="m">${esc(o.month)}</div><div class="d">${esc(o.day)}</div>`; },
    image: (o, e) => { e.innerHTML = `<img src="${o.src}" style="width:${o.w || 800}px;display:block;border-radius:${o.radius ?? 20}px">`; if (o.shadow !== false) e.firstChild.className = 'hs'; },
    // a browser window; "incognito": true gives the dark private-window look
    browser: (o, e) => { e.className += ' brw hs' + (o.incognito ? ' inc' : ''); e.style.width = (o.w || 900) + 'px'; e.style.height = (o.h || 560) + 'px';
      e.innerHTML = `<div class="bt"><i></i><i></i><i></i><span class="tab">${esc(o.tab || 'New Tab')}</span></div><div class="ub">${esc(o.url || '')}</div><div class="bb">${o.svg ? `<div class="bic">${o.svg}</div>` : ''}${o.title ? `<h3>${o.title}</h3>` : ''}${o.text ? `<p>${o.text}</p>` : ''}</div>`; },
    // a big panel that holds other items; children are placed in panel pixels and land on their own words
    panel: (o, e) => { e.className += ' panel card hs'; e.style.width = (o.w || 920) + 'px'; e.style.height = (o.h || 760) + 'px';
      if (o.label) $('div', 'lbl plbl', e, esc(o.label)); (o.children || []).forEach(ch => place(ch, e, o)); },
    html: (o, e) => { e.innerHTML = o.html; },
    // a playing clip in a browser window (the <video> is made by beatreel.py so the renderer can drive it)
    video: (o, e) => { e.className += ' brw vid hs'; e.style.width = (o.w || 940) + 'px';
      e.innerHTML = `<div class="bt"><i></i><i></i><i></i><span class="tab">${esc(o.tab || '')}</span><span class="vurl">${esc(o.url || '')}</span></div><div class="vb" style="aspect-ratio:${o.aspect || '16/9'}"></div>`;
      const v = document.getElementById(o.vid); if (v) { v.style.cssText = 'width:100%;height:100%;object-fit:' + (o.fit || 'cover') + ';display:block'; e.querySelector('.vb').appendChild(v); }
      (o.words || []).forEach(([at, txt, red]) => { const w = $('div', 'vword' + (red ? ' red' : ''), e, esc(txt)); vis(w, at, o.until);
        tl.fromTo(w, { scale: 1.8, opacity: 0, rotation: -6 }, { scale: 1, opacity: 1, rotation: -3, duration: .22, ease: 'back.out(2.4)', immediateRender: false }, at);
        e.querySelectorAll('.vword').forEach(x => { if (x !== w) tl.set(x, { autoAlpha: 0 }, at); }); }); },


    // a code/file viewer: line numbers, scrolling to a line, highlight boxes with tags, a scan beam
    code: (o, e, t) => { e.className += ' code card hs'; e.style.width = (o.w || 960) + 'px'; const L = o.lines || [], n0 = o.start || 1, lh = o.lh || 46, rows = o.rows || 11;
      const hl = s_ => { if (o.lang === 'md') { if (/^#/.test(s_)) return `<b class="hd">${esc(s_)}</b>`; return esc(s_).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/^(\w[\w-]*):/, '<i class="k">$1</i>:'); }
        return s_.split(/("[^"]*"|'[^']*'|#.*$)/).map(p_ => /^["']/.test(p_) ? `<i class="s">${esc(p_)}</i>` : /^#/.test(p_) ? `<i class="c">${esc(p_)}</i>` :
          esc(p_).replace(/\b(def|for|in|if|import|return|any|from)\b/g, '<i class="k">$1</i>')).join(''); };
      e.innerHTML = `<div class="cbar"><i></i><i></i><i></i><span>${esc(o.file || '')}</span>${o.tag ? `<em>${esc(o.tag)}</em>` : ''}</div><div class="cwin" style="height:${rows * lh + 24}px"><div class="cin"></div></div>`;
      const win = e.querySelector('.cwin'), cin = e.querySelector('.cin');
      L.forEach((s_, k) => { const r = $('div', 'cl2', cin, `<u>${n0 + k}</u><span>${hl(s_)}</span>`); r.style.height = lh + 'px'; r.style.lineHeight = lh + 'px'; if (o.fs) r.style.fontSize = o.fs + 'px'; });
      if (o.first) tl.set(cin, { y: -(o.first - n0) * lh }, 0);
      (o.scroll || []).forEach(([a, ln]) => tl.to(cin, { y: -(ln - n0) * lh, duration: .55, ease: 'power3.inOut' }, a));
      (o.marks || []).forEach(m => { const k = m.line - n0, bx = $('div', 'cmk' + (m.color ? ' ' + m.color : ''), cin); bx.style.top = (12 + k * lh) + 'px'; bx.style.height = ((m.to ? m.to - m.line + 1 : 1) * lh) + 'px';
        vis(bx, m.at, m.until); tl.fromTo(bx, { scaleX: 0 }, { scaleX: 1, transformOrigin: '0 50%', duration: .3, ease: 'power3.out', immediateRender: false }, m.at);
        if (m.tag) { const tg = $('div', 'ctag' + (m.color ? ' ' + m.color : ''), bx, esc(m.tag)); tl.fromTo(tg, { y: 16, opacity: 0, scale: .7 }, { y: 0, opacity: 1, scale: 1, duration: .28, ease: 'back.out(2.4)', immediateRender: false }, m.at + .18); } });
      if (o.scanAt != null) { const d = o.scanDur || 1.1, bm = $('div', 'cbeam', win); vis(bm, o.scanAt, o.scanAt + d); tl.fromTo(bm, { y: 0 }, { y: rows * lh, duration: d, ease: 'none', immediateRender: false }, o.scanAt); } },
    // a hub: one thing in the middle reaching out to others; lines draw, pulses travel, targets light up
    hub: (o, e, t) => { e.className += ' hub'; const W = o.w || 960, H = o.h || 860; e.style.width = W + 'px'; e.style.height = H + 'px';
      const cx = W / 2, cy = o.cy ?? H / 2, N = o.items || [], R_ = o.r || 340;
      const pos = N.map((n, k) => { const a = (n.a ?? (-90 + 360 * k / N.length)) * Math.PI / 180; return [cx + Math.cos(a) * R_, cy + Math.sin(a) * R_ * (o.squash ?? 1)]; });
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('class', 'hlines'); e.appendChild(svg);
      const c = $('div', 'hc card hs', e, `${o.svg ? `<i>${o.svg}</i>` : ''}<b>${esc(o.label || '')}</b>`); c.style.left = cx + 'px'; c.style.top = cy + 'px';
      if (o.fromSvg || o.plug) { const pg = $('div', 'hplug', c, `${o.fromSvg || ''}<span>${esc(o.plug || '')}</span>`); const a = o.plugAt ?? t + .3; vis(pg, a);
        tl.fromTo(pg, { y: -260, rotation: -20, scale: 1.3 }, { y: 0, rotation: 0, scale: 1, duration: .45, ease: 'bounce.out', immediateRender: false }, a); }
      N.forEach((n, k) => { const [x, y] = pos[k], a = o.ats?.[k] ?? t + .5 + k * .3;
        const ln = document.createElementNS('http://www.w3.org/2000/svg', 'path'); ln.setAttribute('d', `M${cx} ${cy} L${x} ${y}`); ln.setAttribute('pathLength', 1); svg.appendChild(ln);
        tl.set(ln, { attr: { 'stroke-dashoffset': 1 } }, 0); tl.to(ln, { attr: { 'stroke-dashoffset': 0 }, duration: .3, ease: 'power2.out' }, a - .25);
        const nd = $('div', 'hn', e, `<i>${n.svg || ''}</i><b>${esc(n.title || '')}</b>`); nd.style.left = x + 'px'; nd.style.top = y + 'px'; vis(nd, a - .1);
        tl.fromTo(nd, { scale: 0 }, { scale: 1, duration: .35, ease: 'back.out(2.4)', immediateRender: false }, a - .1); on(nd, a + .15);
        for (let j = 0; j < 3; j++) { const d_ = $('div', 'hdot', e); vis(d_, a + j * .35, a + j * .35 + .4); tl.fromTo(d_, { x: cx, y: cy }, { x, y, duration: .4, ease: 'none', immediateRender: false }, a + j * .35); } }); },
    // labels that rain down and pile up at the bottom
    pile: (o, e, t) => { e.className += ' pile'; const W = o.w || 980, H = o.h || 760; e.style.width = W + 'px'; e.style.height = H + 'px';
      const it = o.items || [], fs = o.fs || 30, wOf = s_ => 40 + s_.length * fs * .56, rows = []; let row = [], rw = 0;
      it.forEach((s_, k) => { const w = wOf(s_); if (rw + w > W - 20 && row.length) { rows.push(row); row = []; rw = 0; } row.push([s_, k, w]); rw += w + 12; }); if (row.length) rows.push(row);
      const a0 = o.dropAt ?? t + .1, ea = o.each ?? .06;
      rows.forEach((r, ri) => { const tot = r.reduce((q, x) => q + x[2] + 12, -12); let x = (W - tot) / 2; const y = H - (ri + 1) * (fs + 40);
        r.forEach(([s_, k, w]) => { const el = $('div', 'pc2' + ((o.hi || []).includes(k) ? ' hot' : ''), e, esc(s_)); el.style.left = x + 'px'; el.style.top = y + 'px'; el.style.width = w + 'px'; el.style.fontSize = fs + 'px'; x += w + 12;
          const a = a0 + k * ea; vis(el, a); tl.fromTo(el, { y: -(y + 200 + rnd() * 300), rotation: (rnd() - .5) * 70 }, { y: 0, rotation: (rnd() - .5) * 8, duration: .6, ease: 'bounce.out', immediateRender: false }, a); }); }); },
    // a dial: needle swings to the score, number counts, verdict lands
    gauge: (o, e, t) => { e.className += ' gauge card hs'; const v = o.value ?? 0, a = o.at2 ?? t + .25, d = o.count ?? 1;
      const arc = (a0, a1, col) => { const p_ = q => [100 + 80 * Math.cos(Math.PI * (1 - q / 100)), 100 - 80 * Math.sin(Math.PI * (1 - q / 100))], [x0, y0] = p_(a0), [x1, y1] = p_(a1); return `<path d="M${x0} ${y0} A80 80 0 0 1 ${x1} ${y1}" stroke="${col}"/>`; };
      e.innerHTML = `${o.title ? `<div class="gt">${esc(o.title)}</div>` : ''}<svg viewBox="0 0 200 118">${arc(0, 20, '#2fbf74')}${arc(21, 50, '#f5a524')}${arc(51, 100, 'var(--bad)')}<g class="gn"><line x1="100" y1="100" x2="100" y2="34"/><circle cx="100" cy="100" r="7"/></g></svg><div class="gv"><span>0</span><small>/100</small></div><div class="gk ${v > 50 ? 'bad' : v > 20 ? 'mid' : 'ok'}">${esc(o.verdict || '')}</div>`;
      const nd = e.querySelector('.gn'), sp = e.querySelector('.gv span'), vk = e.querySelector('.gk'), st = { x: 0 };
      tl.set(nd, { rotation: -90, svgOrigin: '100 100' }, 0); tl.to(nd, { rotation: -90 + 1.8 * v, svgOrigin: '100 100', duration: d, ease: 'power3.out' }, a);
      const up = () => { sp.textContent = Math.round(st.x); }; up(); tl.to(st, { x: v, duration: d, ease: 'power3.out', onUpdate: up }, a);
      vis(vk, a + d - .1); tl.fromTo(vk, { scale: 2.2, opacity: 0, rotation: -8 }, { scale: 1, opacity: 1, rotation: -3, duration: .22, ease: 'power4.out', immediateRender: false }, a + d - .1); },
    // a 10 x 10 grid: some cells light up red, a few of those go dark (two levels), legend chips land
    dots: (o, e, t) => { e.className += ' dots'; const n = o.n || 100, cols = o.cols || 10; e.style.gridTemplateColumns = `repeat(${cols}, ${o.cell || 70}px)`;
      const cs = Array.from({ length: n }, () => $('div', 'dc', e)); tl.fromTo(cs, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: .25, stagger: { each: .006, from: 'random' }, ease: 'back.out(2)', immediateRender: false }, t);
      const order = cs.map((c, k) => [rnd(), k]).sort((p_, q) => p_[0] - q[0]).map(x => x[1]);
      const h1 = order.slice(0, o.hi || 0), h2 = h1.slice(0, o.hi2 || 0);
      h1.forEach((k, j) => tl.set(cs[k], { attr: { 'data-on': 1 } }, (o.redAt ?? t + .6) + j * .015));
      h2.forEach((k, j) => tl.set(cs[k], { attr: { 'data-on': 2 } }, (o.darkAt ?? t + 1.4) + j * .05));
      (o.legend || []).forEach(([a, txt, cls]) => { const lg = $('div', 'dl2 ' + (cls || ''), e, esc(txt)); vis(lg, a); tl.fromTo(lg, { scale: 1.6, opacity: 0 }, { scale: 1, opacity: 1, duration: .25, ease: 'back.out(2)', immediateRender: false }, a); }); },
    // ---------- explainer scenes: whole ideas acted out, built on the words
    // a video call: people tiles, an AI note-taker joining, speakers lighting up, an outsider joining and the AI leaving, the call ending
    meet: (o, e, t) => { e.className += ' meet hs'; e.style.width = (o.w || 920) + 'px';
      const ppl = o.people || [{ n: 'Ana' }, { n: 'Ravi' }, { n: 'Sam' }, { n: 'Mia' }];
      let tiles = ppl.map((p, k) => `<div class="mt"><i style="background:${p.c || PC[k % PC.length]}">${esc((p.n || '?')[0])}</i><span>${esc(p.n || '')}</span><s></s></div>`).join('');
      tiles += `<div class="mt cl"><i class="clg">${o.svg || ''}</i><span>${esc(o.bot || 'AI')}</span><s></s><q></q></div>`;
      if (o.outsiderAt != null) tiles += `<div class="mt ext"><i style="background:#6b6b70">${esc((o.outsider || 'Guest')[0])}</i><span>${esc(o.outsider || 'Guest')}</span><em>EXTERNAL</em></div>`;
      e.innerHTML = `<div class="mbar2"><i></i><b>${esc(o.title || 'Team sync')}</b><span>${esc(o.url || 'meet.google.com')}</span></div><div class="mgrid">${tiles}</div>
        <div class="mctl"><u>${IC.mic}</u><u>${IC.cam}</u><u>${IC.chat}</u><u class="end">${IC.end}</u></div>`;
      const ts = [...e.querySelectorAll('.mt')], cl = e.querySelector('.mt.cl'), ex = e.querySelector('.mt.ext');
      tl.fromTo(ts.slice(0, ppl.length), { scale: .7, opacity: 0 }, { scale: 1, opacity: 1, duration: .3, stagger: .05, ease: 'back.out(2)', immediateRender: false }, t + .05);
      const toast = (txt, a, b) => { const x = $('div', 'mtoast', e, `${o.svg ? `<i>${o.svg}</i>` : ''}<span>${txt}</span>`); vis(x, a, b);
        tl.fromTo(x, { y: -30, opacity: 0 }, { y: 0, opacity: 1, duration: .25, ease: 'back.out(2)', immediateRender: false }, a); };
      if (o.claudeAt != null) { const a = o.claudeAt; tl.set(cl, { opacity: 0 }, 0); tl.fromTo(cl, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: .4, ease: 'back.out(2.4)', immediateRender: false }, a);
        const q = cl.querySelector('q'); tl.fromTo(q, { scale: .7, opacity: 1 }, { scale: 1.6, opacity: 0, duration: .7, ease: 'power2.out', immediateRender: false }, a + .1);
        toast((o.bot || 'AI') + ' joined the call', a + .15, o.leaveAt ?? a + 1.6); }
      else tl.fromTo(cl, { scale: .7, opacity: 0 }, { scale: 1, opacity: 1, duration: .3, ease: 'back.out(2)', immediateRender: false }, t + .05 + ppl.length * .05);
      (o.speak || []).forEach(([a, k]) => { const s_ = ts[k]?.querySelector('s'); if (!s_) return; tl.set(s_, { opacity: 1 }, a); tl.set(s_, { opacity: 0 }, a + .45);
        tl.fromTo(s_, { scale: 1.06 }, { scale: 1, duration: .3, immediateRender: false }, a); });
      (o.typing || []).forEach(([a, b]) => { const x = $('div', 'mtype', cl, `${IC.pen}<span>writing</span>`); vis(x, a, b); });
      if (ex) { const a = o.outsiderAt; tl.set(ex, { opacity: 0 }, 0); tl.fromTo(ex, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: .35, ease: 'back.out(2.4)', immediateRender: false }, a); }
      if (o.leaveAt != null) { const a = o.leaveAt; tl.to(cl, { scale: .2, opacity: 0, duration: .35, ease: 'power3.in' }, a); toast((o.bot || 'AI') + ' left: someone outside your company joined', a + .2, o.until); }
      if (o.endAt != null) { const a = o.endAt, en = e.querySelector('.end'); tl.fromTo(en, { scale: 1.3 }, { scale: 1, duration: .25, ease: 'back.out(3)', immediateRender: false }, a);
        tl.to(e.querySelector('.mgrid'), { opacity: .15, duration: .2 }, a + .15); toast('Call ended', a + .15, o.until); } },
    // a doc that writes itself, line by line
    doc: (o, e, t) => { e.className += ' doc hs'; e.style.width = (o.w || 700) + 'px';
      e.innerHTML = `<div class="dh">${o.svg ? `<i>${o.svg}</i>` : ''}<div><b>${esc(o.title || 'Meeting notes')}</b><span>${esc(o.by || (o.bot || 'AI') + ' is writing…')}</span></div></div><div class="db"></div>`;
      const db = e.querySelector('.db'); (o.lines || []).forEach((s_, k) => { const h = s_.startsWith('#'); const ln = $('div', h ? 'dl hh' : 'dl', db, esc(s_.replace(/^#\s*/, '')));
        const a = o.ats?.[k] ?? t + .25 + k * (o.step ?? .26); vis(ln, a);
        tl.fromTo(ln, { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: h ? .18 : .26, ease: 'none', immediateRender: false }, a); }); },
    // someone speaking: a live waveform and the words typing out
    speak: (o, e, t) => { e.className += ' spk hs';
      e.innerHTML = `<i class="sav" style="background:${o.c || '#4f7cff'}">${esc((o.who || 'You')[0])}</i><div class="sbody"><span>${esc(o.who || 'You')} · speaking</span><div class="stx"></div><div class="swave">${'<b></b>'.repeat(22)}</div></div>`;
      const bars = [...e.querySelectorAll('.swave b')], d = o.dur ?? 1.3, tx = e.querySelector('.stx'), full = String(o.text || ''), v = { n: 0 };
      const up = () => { tx.textContent = full.slice(0, Math.round(v.n)); }; up(); tl.to(v, { n: full.length, duration: d, ease: 'none', onUpdate: up }, t + .1);
      bars.forEach(b => { for (let j = 0; j * .11 < d; j++) tl.to(b, { scaleY: .15 + rnd() * .85, duration: .11, ease: 'sine.inOut' }, t + .1 + j * .11); tl.to(b, { scaleY: .12, duration: .2 }, t + .1 + d); }); },
    // a whiteboard: sticky notes fly in, then sort into columns; columns can light up
    sort: (o, e, t) => { e.className += ' wb hs'; const W = o.w || 960, H = o.h || 660; e.style.width = W + 'px'; e.style.height = H + 'px';
      e.innerHTML = `<div class="wbh">${o.svg ? `<i>${o.svg}</i>` : ''}<b>${esc(o.title || 'Whiteboard')}</b><span>${esc(o.sub || '')}</span></div>`;
      const cols = o.cols || ['Easiest', 'Medium', 'Hardest'], cw = (W - 60) / cols.length, heads = [];
      if (o.sortAt != null) cols.forEach((c, k) => { const h = $('div', 'wbc', e, `<span>${k + 1}</span>${esc(c)}`); h.style.left = (30 + k * cw) + 'px'; h.style.width = (cw - 14) + 'px';
        heads.push(h); vis(h, o.sortAt + k * .08); tl.fromTo(h, { y: -24, opacity: 0 }, { y: 0, opacity: 1, duration: .25, ease: 'back.out(2)', immediateRender: false }, o.sortAt + k * .08); });
      if (!(o.notes || []).length && o.empty) { const z = $('div', 'wbe', e, esc(o.empty)); }
      const cnt = cols.map(() => 0), NW = cw - 30;
      (o.notes || []).forEach((n, k) => { const el = $('div', 'wn', e, esc(n.t)); el.style.background = n.c || NOTE[k % NOTE.length]; el.style.width = NW + 'px';
        const sx = 40 + (k % 3) * (W - 80 - NW) / 2 + (rnd() - .5) * 40, sy = 150 + Math.floor(k / 3) * 190 + rnd() * 50; el.style.left = sx + 'px'; el.style.top = sy + 'px';
        const a = o.ats?.[k] ?? t + .15 + k * .12, r0 = (rnd() - .5) * 12; vis(el, a);
        tl.fromTo(el, { x: (rnd() - .5) * 1000, y: (k % 2 ? 1 : -1) * (600 + rnd() * 300), rotation: (rnd() - .5) * 120, scale: .5 }, { x: 0, y: 0, rotation: r0, scale: 1, duration: .5, ease: 'power3.out', immediateRender: false }, a);
        if (o.sortAt != null) { const c = n.col ?? k % cols.length, tx = 30 + c * cw + 8, ty = 150 + cnt[c]++ * 118; tl.to(el, { x: tx - sx, y: ty - sy, rotation: 0, duration: .55, ease: 'power3.inOut' }, o.sortAt + .15 + k * .05); } });
      (o.hiAt || []).forEach((a, j) => { const h = heads[o.hi?.[j] ?? j]; if (!h) return; on(h, a); tl.fromTo(h, { scale: 1.12 }, { scale: 1, duration: .3, ease: 'back.out(3)', immediateRender: false }, a); }); },
    // a question, the AI checking the docs, the answer with its source
    answer: (o, e, t) => { e.className += ' ans'; e.style.width = (o.w || 920) + 'px';
      e.innerHTML = `<div class="aq card hs"><i style="background:${o.c || '#2fbf74'}">${esc((o.who || 'T')[0])}</i><div><b>${esc(o.who || 'Teammate')}</b><p>${esc(o.q || '')}</p></div></div>
        <div class="adocs">${(o.docs || ['Sourcing doc', 'Supplier sheet', 'Budget']).map(d => `<div class="ad hs"><u></u><u></u><u></u><u></u><span>${esc(d)}</span></div>`).join('')}<div class="ascan"></div></div>
        <div class="aa card hs"><i class="clg">${o.svg || ''}</i><div><b>${esc(o.bot || 'AI')}</b><p>${esc(o.a || '')}</p><div class="alink">${IC.link}<span>${esc(o.link || 'source')}</span></div></div></div>`;
      const q = e.querySelector('.aq'), dk = e.querySelector('.adocs'), ds = [...e.querySelectorAll('.ad')], sc = e.querySelector('.ascan'), aa = e.querySelector('.aa'), lk = e.querySelector('.alink');
      tl.fromTo(q, { x: -80, opacity: 0 }, { x: 0, opacity: 1, duration: .32, ease: 'back.out(1.6)', immediateRender: false }, t + .05);
      const ca = o.checkAt ?? t + .7; vis(dk, ca);
      tl.fromTo(ds, { y: 60, opacity: 0, rotation: 0 }, { y: 0, opacity: 1, rotation: i => [-7, 0, 7][i % 3], stagger: .07, duration: .3, ease: 'back.out(2)', immediateRender: false }, ca);
      vis(sc, ca + .25, ca + 1.25); tl.fromTo(sc, { x: 0 }, { x: 640, duration: .5, ease: 'sine.inOut', repeat: 1, yoyo: true, immediateRender: false }, ca + .25);
      on(ds[o.hit ?? 0], ca + 1.05); tl.fromTo(ds[o.hit ?? 0], { scale: 1.15 }, { scale: 1, duration: .3, ease: 'back.out(3)', immediateRender: false }, ca + 1.05);
      const aat = o.answerAt ?? ca + 1.1; vis(aa, aat); tl.fromTo(aa, { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: .32, ease: 'back.out(1.8)', immediateRender: false }, aat);
      const la = o.linkAt ?? aat + .4; on(lk, la); tl.fromTo(lk, { scale: 1.3 }, { scale: 1, duration: .3, ease: 'back.out(3)', immediateRender: false }, la); },
    // the meeting page: rows land one per word
    mpage: (o, e, t) => { e.className += ' mpg card hs'; e.style.width = (o.w || 880) + 'px';
      e.innerHTML = `<div class="mph">${o.svg ? `<i>${o.svg}</i>` : ''}<div><b>${esc(o.title || 'Meeting')}</b><span>${esc(o.sub || '')}</span></div></div>` +
        (o.items || []).map(x => `<div class="mpr"><i>${x.svg || ''}</i><div><b>${esc(x.title)}</b><span>${esc(x.sub || '')}</span></div><em>${CK}</em></div>`).join('');
      e.querySelectorAll('.mpr').forEach((r, k) => { const a = o.ats?.[k] ?? t + .3 + k * .25; vis(r, a);
        tl.fromTo(r, { x: 160, opacity: 0 }, { x: 0, opacity: 1, duration: .32, ease: 'back.out(1.6)', immediateRender: false }, a);
        tl.fromTo(r.querySelector('em'), { scale: 0 }, { scale: 1, duration: .25, ease: 'back.out(3)', immediateRender: false }, a + .2); }); },
    // audio waveform that gets struck out
    wave: (o, e, t) => { e.className += ' wav card hs';
      e.innerHTML = `<div class="wl">${IC.mic}<span>${esc(o.label || 'Call audio')}</span></div><div class="wbars">${'<b></b>'.repeat(30)}</div><svg class="wx" viewBox="0 0 100 40" preserveAspectRatio="none"><line x1="3" y1="37" x2="97" y2="3" pathLength="1"/></svg>`;
      const bars = [...e.querySelectorAll('.wbars b')], sa = o.strikeAt ?? t + 1;
      bars.forEach(b => { for (let j = 0; j * .12 < sa - t + .3; j++) tl.to(b, { scaleY: .12 + rnd() * .88, duration: .12, ease: 'sine.inOut' }, t + j * .12); tl.to(b, { scaleY: .1, duration: .25 }, sa + .3); });
      const ln = e.querySelector('.wx line'); tl.set(ln, { attr: { 'stroke-dashoffset': 1 } }, 0); tl.to(ln, { attr: { 'stroke-dashoffset': 0 }, duration: .25, ease: 'power2.in' }, sa); on(e, sa + .25); },
    // plan cards: the ones that don't get it grey out with a cross, the ones that do light up with a tick
    plans: (o, e, t) => { e.className += ' pln';
      e.innerHTML = (o.items || []).map(x => `<div class="pc card hs" data-ok="${x.ok ? 1 : 0}"><b>${esc(x.t)}</b><em>${x.ok ? CK : XX}</em></div>`).join('');
      const cs = [...e.querySelectorAll('.pc')]; tl.fromTo(cs, { y: 60, opacity: 0 }, { y: 0, opacity: 1, stagger: .06, duration: .3, ease: 'back.out(2)', immediateRender: false }, t + .05);
      const m = o.markAt ?? t + .6; cs.forEach((c, k) => { const a = m + k * .07; on(c, a); tl.fromTo(c.querySelector('em'), { scale: 0 }, { scale: 1, duration: .25, ease: 'back.out(3)', immediateRender: false }, a); }); },
    // calendar pages flipping to a date
    flip: (o, e, t) => { e.className += ' flp'; const P_ = o.pages || [], a0 = o.flipAt ?? t + .3, d = o.dur ?? .8;
      P_.forEach((p, k) => { const c = $('div', 'date hs fp', e, `<div class="m">${esc(p.m)}</div><div class="d">${esc(p.d)}</div><div class="y">${p.y ? esc(p.y) : '&nbsp;'}</div>`); c.style.zIndex = P_.length - k;
        if (k < P_.length - 1) tl.to(c, { rotationX: -95, opacity: 0, duration: .16, ease: 'power2.in', transformOrigin: '50% 0%', transformPerspective: 900 }, a0 + k * d / (P_.length - 1)); }); },
    // sending: a paper plane flies from one card to a person, who bounces
    send: (o, e, t) => { e.className += ' snd';
      e.innerHTML = `<div class="sf card hs">${o.fromSvg ? `<i>${o.fromSvg}</i>` : ''}<b>${esc(o.from || 'This reel')}</b></div><svg class="sarc" viewBox="0 0 520 220"><path d="M20 190 Q260 -40 500 150" pathLength="1"/></svg>
        <div class="st"><i style="background:${o.c || '#f5a524'}">${o.toSvg || ''}</i><b>${esc(o.to || '')}</b></div>${Array.from({ length: o.n || 1 }, () => `<div class="spl">${o.payloadSvg || IC.plane}</div>`).join('')}`;
      const a = o.sendAt ?? t + .5, pls = [...e.querySelectorAll('.spl')], pl = pls[0], arc = e.querySelector('.sarc path'), to = e.querySelector('.st');
      tl.fromTo(to, { scale: 0 }, { scale: 1, duration: .35, ease: 'back.out(2)', immediateRender: false }, t + .2);
      tl.set(arc, { attr: { 'stroke-dashoffset': 1 } }, 0); tl.to(arc, { attr: { 'stroke-dashoffset': 0 }, duration: .6, ease: 'power1.inOut' }, a);
      pls.forEach((p_, j) => { const b = a + j * .2; vis(p_, b, b + .62); tl.set(p_, { x: 0, y: 0, rotation: o.payloadSvg ? 0 : -30 }, b);
        tl.to(p_, { x: 250, y: -170, rotation: o.payloadSvg ? 10 : 0, duration: .3, ease: 'power1.out' }, b); tl.to(p_, { x: 500, y: -30, rotation: o.payloadSvg ? 25 : 35, duration: .3, ease: 'power1.in' }, b + .3); });
      tl.fromTo(to, { scale: 1.25 }, { scale: 1, duration: .4, ease: 'elastic.out(1.2,.4)', immediateRender: false }, a + .6); on(to, a + .6); },

    // the follow end card: avatar, handle, a Follow button that gets tapped, and a grid of earlier reels flipping in
    profile: (o, e, t) => { e.className += ' prof card hs'; e.style.width = (o.w || 900) + 'px';
      e.innerHTML = `<div class="ph"><div class="pav"><img src="${o.img || ''}"></div><div class="pn"><b>${esc(o.handle || '')}</b><span>${esc(o.cat || '')}</span><p>${esc(o.bio || '')}</p></div></div>
        <div class="pbtn"><span class="a">Follow</span><span class="b">Following ✓</span></div><div class="pgrid">${(o.covers || []).map(c => `<div class="pg"><img src="${c}"></div>`).join('')}</div><div class="ptap"></div>`;
      const btn = e.querySelector('.pbtn'), tap = e.querySelector('.ptap'), pav = e.querySelector('.pav'), a = o.tapAt ?? t + .6;
      tl.fromTo(pav, { scale: .3, rotation: -40 }, { scale: 1, rotation: 0, duration: .45, ease: 'back.out(2.2)', immediateRender: false }, t + .05);
      vis(tap, a - .35, a + .45); tl.fromTo(tap, { x: 260, y: 220, scale: 1 }, { x: 0, y: 0, duration: .3, ease: 'power2.out', immediateRender: false }, a - .35);
      tl.to(tap, { scale: .7, duration: .08, yoyo: true, repeat: 1 }, a - .05); on(btn, a);
      tl.fromTo(btn, { scale: .9 }, { scale: 1, duration: .35, ease: 'back.out(3)', immediateRender: false }, a);
      for (let k = 0; k < 7; k++) { const hz = $('div', 'pheart', e, '♥'); vis(hz, a, a + .9); tl.fromTo(hz, { x: 0, y: 0, scale: .4, opacity: 1 }, { x: (rnd() - .5) * 340, y: -160 - rnd() * 200, scale: 1 + rnd() * .6, opacity: 0, duration: .85, ease: 'power2.out', immediateRender: false }, a + k * .03); }
      const gs = [...e.querySelectorAll('.pg')], ga = o.gridAt ?? t + .3;
      tl.fromTo(gs, { rotationY: 90, opacity: 0, transformPerspective: 900 }, { rotationY: 0, opacity: 1, duration: .32, stagger: .06, ease: 'power3.out', immediateRender: false }, ga); },
    // the follow card: avatar, handle, a button that gets tapped and turns into "Following"
    follow: (o, e, t) => { e.className += ' fol card hs';
      e.innerHTML = (o.img ? `<img src="${o.img}">` : `<i class="fav">${esc((o.handle || '?').replace('@', '')[0] || '?').toUpperCase()}</i>`) + `<b>${esc(o.handle || '')}</b><span>${esc(o.text || '')}</span><div class="fbtn"><span class="a">Follow</span><span class="b">Following ✓</span></div>`;
      const btn = e.querySelector('.fbtn'), at = o.tapAt ?? t + .6; on(btn, at);
      tl.fromTo(btn, { scale: .86 }, { scale: 1, duration: .3, ease: 'back.out(3)', immediateRender: false }, at); },
    // ---------- scenes v4 (outage explainer): world map, status board, report spike, social post, dominoes, restart, freeze, mail, clock, 3D clip
    // a dotted world map: dots sweep in, city pins blink in a wave (red or green), a logo above it can crack, traffic arcs fly between cities
    world: (o, e, t) => { e.className += ' wmap'; const M = window.WORLD, Wd = o.w || 900, k = Wd / M.W, Hd = M.H * k; e.style.width = Wd + 'px'; e.style.height = Hd + 'px';
      const NS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', `0 0 ${Wd} ${Hd}`); svg.setAttribute('class', 'wsvg'); e.appendChild(svg);
      const g = document.createElementNS(NS, 'g'); svg.appendChild(g);
      g.innerHTML = M.pts.map(([x, y]) => `<circle cx="${(x * k).toFixed(1)}" cy="${(y * k).toFixed(1)}" r="${((o.dot || .3) * k).toFixed(2)}"/>`).join('');
      if (o.pop !== false) tl.fromTo(svg, { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: .5, ease: 'power2.out', immediateRender: false }, t);
      const cities = o.cities === false ? [] : M.cities.filter(c => !o.only || o.only.includes(c.n)), ra = o.redAt;
      cities.forEach((c, j) => { const p = $('div', 'wpin ' + (o.pin || 'red'), e); p.style.left = c.x * k + 'px'; p.style.top = c.y * k + 'px';
        const a = ra != null ? ra + (c.x / M.W) * (o.spread ?? .6) + rnd() * .08 : t + .25 + rnd() * .4; vis(p, a);
        tl.fromTo(p, { scale: 0 }, { scale: 1, duration: .25, ease: 'back.out(3)', immediateRender: false }, a);
        const rg = $('i', '', p); tl.fromTo(rg, { scale: .5, opacity: .9 }, { scale: 2.8, opacity: 0, duration: .75, repeat: 3, ease: 'power1.out', immediateRender: false }, a); });
      (o.arcs || []).forEach(([fa, fb], j) => { const A = M.cities.find(c => c.n === fa), Bc = M.cities.find(c => c.n === fb); if (!A || !Bc) return;
        const x1 = A.x * k, y1 = A.y * k, x2 = Bc.x * k, y2 = Bc.y * k, mx = (x1 + x2) / 2, my = Math.min(y1, y2) - Math.abs(x2 - x1) * .35;
        const pth = document.createElementNS(NS, 'path'); pth.setAttribute('d', `M${x1} ${y1} Q${mx} ${my} ${x2} ${y2}`); pth.setAttribute('pathLength', 1); pth.setAttribute('class', 'warc'); svg.appendChild(pth);
        const a = (o.arcsAt ?? t + .3) + j * (o.arcEach ?? .12); tl.set(pth, { attr: { 'stroke-dashoffset': 1 } }, 0); tl.to(pth, { attr: { 'stroke-dashoffset': 0 }, duration: .45, ease: 'power2.out' }, a);
        for (let q = 0; q < 3; q++) { const d_ = $('div', 'wdot', e), b = a + .2 + q * .32; vis(d_, b, b + .55); const pv = { u: 0 };
          const up = () => { const u = pv.u, x = (1 - u) * (1 - u) * x1 + 2 * (1 - u) * u * mx + u * u * x2, y = (1 - u) * (1 - u) * y1 + 2 * (1 - u) * u * my + u * u * y2; d_.style.transform = `translate(${x}px, ${y}px)`; }; up();
          tl.fromTo(pv, { u: 0 }, { u: 1, duration: .55, ease: 'none', onUpdate: up, immediateRender: false }, b); } });
      if (o.svg) { const lg = $('div', 'wlogo', e, o.svg); lg.style.top = (o.logoY ?? -150) + 'px';
        tl.fromTo(lg, { scale: 0, rotation: -12 }, { scale: 1, rotation: 0, duration: .4, ease: 'back.out(2)', immediateRender: false }, o.logoAt ?? t + .1);
        if (o.crackAt != null) { const cr = $('div', 'wcrack', lg, `<svg viewBox="0 0 100 100"><path d="M54 0 L45 28 L60 44 L41 66 L52 100" pathLength="1"/><path d="M60 44 L90 36" pathLength="1"/><path d="M45 28 L14 18" pathLength="1"/><path d="M41 66 L12 74" pathLength="1"/></svg>`);
          cr.querySelectorAll('path').forEach(p_ => { tl.set(p_, { attr: { 'stroke-dashoffset': 1 } }, 0); tl.to(p_, { attr: { 'stroke-dashoffset': 0 }, duration: .22, ease: 'power3.out' }, o.crackAt); });
          tl.to(lg.firstChild, { filter: 'grayscale(1) brightness(.6)', duration: .3 }, o.crackAt + .1); on(lg, o.crackAt + .1);
          tl.fromTo(lg, { x: -16 }, { x: 0, duration: .45, ease: 'elastic.out(1.3,.25)', immediateRender: false }, o.crackAt); } }
      if (o.label) { const lb = $('div', 'wlbl', e, esc(o.label)); vis(lb, o.labelAt ?? t + .3); tl.fromTo(lb, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: .25, immediateRender: false }, o.labelAt ?? t + .3); } },
    // an update rolling out: the bar fills, "installed", then a bug pops out of it
    upgrade: (o, e, t) => { e.className += ' upg card hs'; e.style.width = (o.w || 820) + 'px';
      e.innerHTML = `<div class="uh"><i>${o.svg || ''}</i><div><b>${esc(o.title || 'Update')}</b><span>${esc(o.sub || '')}</span></div></div><div class="ubar"><u></u></div><div class="ust"><span class="a">${esc(o.doing || 'Rolling out…')}</span><span class="b">${esc(o.done || 'Installed')}</span><em>0%</em></div>${o.bugSvg ? `<div class="ubug">${o.bugSvg}</div>` : ''}`;
      const bar = e.querySelector('.ubar u'), pct = e.querySelector('.ust em'), st_ = e.querySelector('.ust'), v = { p: 0 }, da = o.doneAt ?? t + 1;
      const up = () => { pct.textContent = Math.round(v.p) + '%'; bar.style.width = v.p + '%'; }; up();
      tl.to(v, { p: 100, duration: Math.max(.2, da - t - .15), ease: 'power1.inOut', onUpdate: up }, t + .15); on(st_, da);
      const bug = e.querySelector('.ubug'); if (bug) { const a = o.bugAt ?? da + .2; vis(bug, a); on(e, a);
        tl.fromTo(bug, { scale: 0, rotation: -40 }, { scale: 1, rotation: 0, duration: .35, ease: 'back.out(3)', immediateRender: false }, a);
        tl.to(bug, { rotation: 12, duration: .08, yoyo: true, repeat: 7, ease: 'sine.inOut' }, a + .35); } },
    // a status board: services listed as operational, flipping to DOWN one by one
    status: (o, e, t) => { e.className += ' sts card hs'; e.style.width = (o.w || 840) + 'px';
      e.innerHTML = (o.title ? `<div class="lbl">${esc(o.title)}</div>` : '') + (o.items || []).map(x => `<div class="sr"><i>${x.svg || ''}</i><b>${esc(x.title)}</b><em><s></s><span class="a">Operational</span><span class="b">${esc(o.downText || 'Down')}</span></em></div>`).join('');
      const rows = [...e.querySelectorAll('.sr')]; if (o.pop !== false) rows.forEach((r_, k) => { const a = o.ats?.[k] ?? t + .05 + k * .08; vis(r_, a); tl.fromTo(r_, { x: 120, opacity: 0 }, { x: 0, opacity: 1, duration: .3, ease: 'back.out(1.6)', immediateRender: false }, a); });
      rows.forEach((r_, k) => { const a = o.downAt?.[k]; if (a == null) return; on(r_, a); tl.fromTo(r_, { x: -16 }, { x: 0, duration: .45, ease: 'elastic.out(1.4,.3)', immediateRender: false }, a);
        tl.fromTo(r_.querySelector('s'), { boxShadow: '0 0 0 0px rgba(255,255,255,.7)' }, { boxShadow: '0 0 0 16px rgba(255,255,255,0)', duration: .6, repeat: 3, ease: 'power1.out', immediateRender: false }, a); }); },
    // a report spike: baseline, then the line shoots up; the peak label counts up
    spike: (o, e, t) => { e.className += ' spk2 card hs'; const Wd = o.w || 860, cw = Wd - 80, ch = o.ch || 330; e.style.width = Wd + 'px';
      const pts = o.points || [3, 2, 3, 2, 4, 3, 26, 74, 100, 90, 72, 58, 46, 38, 30], n = pts.length;
      const P_ = pts.map((v, k) => [k / (n - 1) * cw, ch - v / 100 * ch]), d = 'M' + P_.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L');
      e.innerHTML = `<div class="lbl">${esc(o.title || '')}</div><div class="sw" style="width:${cw}px;height:${ch}px"><svg viewBox="0 0 ${cw} ${ch}" style="width:${cw}px;height:${ch}px">${[.25, .5, .75].map(q => `<line x1="0" x2="${cw}" y1="${ch * q}" y2="${ch * q}"/>`).join('')}<path class="sa" d="${d} L${cw} ${ch} L0 ${ch} Z"/><path class="sl" d="${d}" pathLength="1"/></svg><div class="speak"><b>0</b><small>${esc(o.peakLabel || 'reports')}</small></div></div><div class="sx"><span>${esc(o.from || '')}</span><span>${esc(o.to || '')}</span></div>`;
      const ln = e.querySelector('.sl'), ar = e.querySelector('.sa'), pk = e.querySelector('.speak'), b_ = pk.querySelector('b'), dd = o.dur ?? 1.1, a = o.drawAt ?? t + .2;
      tl.set(ln, { attr: { 'stroke-dashoffset': 1 } }, 0); tl.to(ln, { attr: { 'stroke-dashoffset': 0 }, duration: dd, ease: 'power1.in' }, a);
      tl.fromTo(ar, { opacity: 0 }, { opacity: 1, duration: .4, immediateRender: false }, a + dd * .6);
      const pi = pts.indexOf(Math.max(...pts)), [px, py] = P_[pi]; pk.style.left = px + 'px'; pk.style.top = py + 'px'; gsap.set(pk, { xPercent: -50, yPercent: -118 });
      const pa = a + dd * .62, v = { x: 0 }; vis(pk, pa); const up = () => { b_.textContent = fmt(v.x, 0) + (o.suffix || ''); }; up();
      tl.fromTo(pk, { scale: 0 }, { scale: 1, duration: .3, ease: 'back.out(2.4)', immediateRender: false }, pa); tl.to(v, { x: o.peak || 130000, duration: .7, ease: 'power3.out', onUpdate: up }, pa); },
    // a social post screenshot: its header and one passage, with a highlighter sweeping the key words (white text on red)
    xpost: (o, e, t) => { e.className += ' xp hs'; const Wd = o.w || 880, k = Wd / (o.iw || 1080), hd = o.head || [0, 0], cr = o.crop || [0, 400];
      const win = (y0, y1, cls) => `<div class="${cls}" style="height:${((y1 - y0) * k).toFixed(1)}px"><img src="${o.src}" style="width:${Wd}px;top:${(-y0 * k).toFixed(1)}px">${cls === 'xb' ? '<div class="xmk"></div>' : ''}</div>`;
      e.style.width = Wd + 'px'; e.innerHTML = (hd[1] > hd[0] ? win(hd[0], hd[1], 'xh') : '') + win(cr[0], cr[1], 'xb') + (o.label ? `<div class="xl">${esc(o.label)}</div>` : '');
      const mk = e.querySelector('.xmk');
      (o.marks || []).forEach(m => { const [x0, y0, x1, y1] = m.r, b_ = $('div', 'xm', mk); Object.assign(b_.style, { left: (x0 - 8) * k + 'px', top: (y0 - 6 - cr[0]) * k + 'px', width: (x1 - x0 + 16) * k + 'px', height: (y1 - y0 + 12) * k + 'px' });
        const a = m.at ?? t + .5; tl.set(b_, { scaleX: 0 }, 0); tl.to(b_, { scaleX: 1, duration: m.dur ?? .3, ease: 'power2.inOut' }, a); }); },
    // dominoes: labelled tiles that topple one after another, turning red
    domino: (o, e, t) => { e.className += ' dom'; const it = o.items || [], a0 = o.fallAt ?? t + .4, ea = o.each ?? .16;
      e.innerHTML = it.map(s_ => `<div class="dm"><div class="dt"><u></u><u></u></div><b>${esc(s_)}</b></div>`).join('');
      tl.fromTo([...e.querySelectorAll('.dm')], { y: 80, opacity: 0 }, { y: 0, opacity: 1, duration: .3, stagger: .04, ease: 'back.out(2)', immediateRender: false }, t);
      [...e.querySelectorAll('.dt')].forEach((d_, k) => { const a = a0 + k * ea, last = k === it.length - 1;
        tl.fromTo(d_, { rotation: 0 }, { rotation: last ? 84 : 27, duration: last ? .4 : .2, ease: last ? 'bounce.out' : 'power2.in', transformOrigin: '100% 100%', immediateRender: false }, a); on(d_, a + .1); }); },
    // a power button: pressed, then the ring fills while it restarts
    restart: (o, e, t) => { e.className += ' rst'; e.innerHTML = `<svg class="rsv" viewBox="0 0 200 200"><circle class="rb" cx="100" cy="100" r="88"/><circle class="rr" cx="100" cy="100" r="88" pathLength="1"/></svg><div class="rp">${o.svg || ''}</div><b>${esc(o.text || 'Restarting')}</b>`;
      const rr = e.querySelector('.rr'), rp = e.querySelector('.rp'), a = o.pressAt ?? t + .2, d = o.dur ?? 1;
      tl.fromTo(rp, { scale: 1 }, { scale: .84, duration: .1, yoyo: true, repeat: 1, ease: 'power2.inOut', immediateRender: false }, a); on(e, a + .12);
      tl.set(rr, { attr: { 'stroke-dashoffset': 1 } }, 0); tl.to(rr, { attr: { 'stroke-dashoffset': 0 }, duration: d, ease: 'power1.inOut' }, a + .1); },
    // deployments on a conveyor that freeze: the chips stop, frost spreads, a lock drops
    freeze: (o, e, t) => { e.className += ' frz card hs'; e.style.width = (o.w || 860) + 'px'; const it = o.items || ['update', 'config change', 'patch', 'update'], fa = o.freezeAt ?? t + .8;
      e.innerHTML = `<div class="lbl">${esc(o.title || 'Deployments')}</div><div class="fz"><div class="ftrack"></div>${it.map(s_ => `<div class="fc">${esc(s_)}</div>`).join('')}<div class="frost">${o.snowSvg || ''}</div></div><div class="flock">${o.svg || ''}</div><div class="fst">${esc(o.text || 'All updates paused')}</div>`;
      e.querySelectorAll('.fc').forEach((c, k) => { const x0 = -300 + k * 250, run = Math.max(.2, fa - t); tl.fromTo(c, { x: x0 }, { x: x0 + run * 280, duration: run, ease: 'none', immediateRender: true }, t);
        tl.fromTo(c, { y: 0 }, { y: 5, duration: .05, yoyo: true, repeat: 3, immediateRender: false }, fa); });
      const fr = e.querySelector('.frost'), lk = e.querySelector('.flock'), tx = e.querySelector('.fst');
      tl.set(fr, { opacity: 0 }, 0); tl.to(fr, { opacity: 1, duration: .3 }, fa); on(e, fa);
      vis(lk, fa); tl.fromTo(lk, { y: -300, rotation: -25 }, { y: 0, rotation: 0, duration: .5, ease: 'bounce.out', immediateRender: false }, fa);
      vis(tx, fa + .3); tl.fromTo(tx, { scale: 1.7, opacity: 0 }, { scale: 1, opacity: 1, duration: .25, ease: 'back.out(2)', immediateRender: false }, fa + .3); },
    // mail held in a tray: envelopes drop in and stack, a timer counts the hours, then they fly out delivered
    mail: (o, e, t) => { e.className += ' mail'; const n = o.n || 6, ha = o.countAt, hd = o.hours ?? 48;
      e.innerHTML = `<div class="mtray card hs">${o.svg ? `<i class="mlg">${o.svg}</i>` : ''}<b>${esc(o.title || 'Held mail')}</b>${ha != null ? `<div class="mtime">${IC.clock}<span>0 h</span></div>` : ''}</div>` + Array.from({ length: n }, () => `<div class="env">${IC.env}</div>`).join('') + (o.okAt != null ? `<div class="mok">${CK}<span>${esc(o.okText || 'Delivered')}</span></div>` : '');
      [...e.querySelectorAll('.env')].forEach((v, k) => { const a = (o.dropAt ?? t + .1) + k * (o.each ?? .12), y = 40 - k * 24, x = (k % 2 ? 1 : -1) * 16, r0 = (rnd() - .5) * 10;
        vis(v, o.instant ? t : a, o.releaseAt != null ? o.releaseAt + k * .07 + .5 : null);
        if (!o.instant) tl.fromTo(v, { x: x + (rnd() - .5) * 500, y: -700, rotation: (rnd() - .5) * 90 }, { x, y, rotation: r0, duration: .5, ease: 'power3.out', immediateRender: false }, a);
        else tl.set(v, { x, y, rotation: r0 }, 0);
        if (o.releaseAt != null) tl.to(v, { x: 760, y: y - 420, rotation: 35, duration: .5, ease: 'power2.in' }, o.releaseAt + k * .07); });
      if (ha != null) { const sp = e.querySelector('.mtime span'), v = { h: 0 }; const up = () => { sp.textContent = Math.round(v.h) + ' h'; }; up(); tl.to(v, { h: hd, duration: o.countDur ?? 1, ease: 'power2.inOut', onUpdate: up }, ha); }
      const ok = e.querySelector('.mok'); if (ok) { vis(ok, o.okAt); tl.fromTo(ok, { scale: 1.8, opacity: 0 }, { scale: 1, opacity: 1, duration: .25, ease: 'back.out(2)', immediateRender: false }, o.okAt); } },
    // a 24-hour dial: the hand sweeps round, the swept part fills
    clock: (o, e, t) => { e.className += ' clk card hs';
      e.innerHTML = `<svg viewBox="0 0 200 200"><circle cx="100" cy="100" r="86" class="cf"/>${Array.from({ length: 24 }, (_, k) => { const a = k / 24 * Math.PI * 2, r1 = k % 6 ? 76 : 66; return `<line x1="${(100 + Math.sin(a) * 82).toFixed(1)}" y1="${(100 - Math.cos(a) * 82).toFixed(1)}" x2="${(100 + Math.sin(a) * r1).toFixed(1)}" y2="${(100 - Math.cos(a) * r1).toFixed(1)}"/>`; }).join('')}<path class="csw" d=""/><line class="ch" x1="100" y1="100" x2="100" y2="30"/><circle cx="100" cy="100" r="8" class="cc"/></svg><div class="ct"><b>${esc(o.text || '')}</b><span>${esc(o.sub || '')}</span></div>`;
      const h = e.querySelector('.ch'), sw = e.querySelector('.csw'), v = { a: 0 }, d = o.dur ?? 1, a0 = o.spinAt ?? t + .15, fr = o.turn ?? 1;
      const up = () => { const ang = v.a * Math.PI * 2, x = 100 + Math.sin(ang) * 62, y = 100 - Math.cos(ang) * 62; sw.setAttribute('d', v.a <= .001 ? '' : `M100 100 L100 38 A62 62 0 ${v.a > .5 ? 1 : 0} 1 ${x.toFixed(2)} ${y.toFixed(2)} Z`); }; up();
      tl.set(h, { rotation: 0, svgOrigin: '100 100' }, 0); tl.to(h, { rotation: 360 * fr, svgOrigin: '100 100', duration: d, ease: 'power2.inOut' }, a0); tl.to(v, { a: fr * .9999, duration: d, ease: 'power2.inOut', onUpdate: up }, a0); },
    // a pre-rendered clip (e.g. a 3D shot with a transparent background), no frame around it
    clip: (o, e) => { e.className += ' clip3'; e.style.width = (o.w || 1080) + 'px'; e.style.height = (o.h || 1280) + 'px';
      const v = document.getElementById(o.vid); if (v) { v.style.cssText = 'width:100%;height:100%;display:block'; e.appendChild(v); } },
    // ---------- scenes v5 (MarkItDown explainer)
    // a token counter that runs away: digits climb, heat glow rises, embers fly, it shakes
    burn: (o, e, t) => { e.className += ' brn'; e.innerHTML = `<div class="bl">${esc(o.label || '')}</div><div class="bn">0</div><div class="bs">${esc(o.sub || '')}</div>`;
      const n = e.querySelector('.bn'), v = { x: 0 }, d = o.dur ?? 1.4, a = t + .05; const up = () => { n.textContent = fmt(v.x, 0); }; up();
      tl.to(v, { x: o.to || 48213, duration: d, ease: 'power2.in', onUpdate: up }, a);
      tl.fromTo(e, { '--heat': 0 }, { '--heat': 1, duration: d, ease: 'power2.in', immediateRender: false }, a);
      for (let k = 0; k < 26; k++) { const s_ = $('i', 'emb', e); s_.style.left = (8 + rnd() * 84) + '%'; const b = a + .25 + rnd() * d; vis(s_, b, b + .9);
        tl.fromTo(s_, { y: 0, opacity: 1, scale: .5 + rnd() }, { y: -260 - rnd() * 260, x: (rnd() - .5) * 140, opacity: 0, duration: .9, ease: 'power1.out', immediateRender: false }, b); }
      tl.fromTo(n, { x: -5 }, { x: 5, duration: .045, repeat: 15, yoyo: true, ease: 'none', immediateRender: false }, a + d * .55); },
    // a chat window: a file drops in, the token meter climbs (red for a PDF, small and green for Markdown)
    chat: (o, e, t) => { e.className += ' cht card hs' + (o.kind === 'md' ? ' md' : ''); e.style.width = (o.w || 860) + 'px';
      e.innerHTML = `<div class="ch1"><i>${o.svg || ''}</i><b>${esc(o.title || 'AI')}</b></div><div class="ch2"><div class="cfile"><u>${esc(o.ext || 'PDF')}</u><div><b>${esc(o.file || 'report.pdf')}</b><span>${esc(o.meta || '')}</span></div></div><div class="cmsg">${esc(o.msg || 'Summarise this for me')}</div></div><div class="ctok"><span>${esc(o.tokLabel || 'tokens used')}</span><b>0</b><div class="cbar"><u></u></div></div>`;
      const f = e.querySelector('.cfile'), m = e.querySelector('.cmsg'), tk = e.querySelector('.ctok b'), bar = e.querySelector('.cbar u'), a = o.dropAt ?? t + .2, v = { x: 0 }, mx = o.max || 200000, d = o.dur || 1.1;
      vis(f, a); tl.fromTo(f, { y: -320, rotation: -10, scale: 1.25 }, { y: 0, rotation: 0, scale: 1, duration: .5, ease: 'bounce.out', immediateRender: false }, a);
      vis(m, a + .35); tl.fromTo(m, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: .22, immediateRender: false }, a + .35);
      const up = () => { tk.textContent = fmt(v.x, 0); bar.style.width = Math.min(100, v.x / mx * 100) + '%'; }; up();
      tl.to(v, { x: o.tokens || 150000, duration: d, ease: o.kind === 'md' ? 'power3.out' : 'power2.in', onUpdate: up }, a + .4); if (o.kind !== 'md') on(e, a + .4 + d * .55); },
    // a page in 3D: a reading beam scans it; it splits into a TEXT layer and a PICTURE layer; the picture layer can shatter away
    page3d: (o, e, t) => { e.className += ' p3'; const pg = (c) => `<div class="pl ${c}"><s></s>${'<i></i>'.repeat(3)}<em></em>${'<i></i>'.repeat(4)}</div>`;
      e.innerHTML = `<div class="p3s"><div class="p3a img">${pg('pi')}<b>PICTURE</b></div><div class="p3a txt">${pg('pt')}<b>TEXT</b></div><div class="p3scan"></div></div>`;
      const s_ = e.querySelector('.p3s'), A = e.querySelector('.img'), T = e.querySelector('.txt'), sc = e.querySelector('.p3scan'), end = o.until ?? t + 2.5, rz = o.rz ?? -28;
      gsap.set(s_, { rotationX: o.rx ?? 52, rotationZ: rz }); tl.fromTo(s_, { rotationZ: rz - 14 }, { rotationZ: rz + 8, duration: Math.max(.5, end - t), ease: 'none', immediateRender: false }, t);
      if (o.split) gsap.set(T, { z: 230 });
      if (o.scanAt != null) { vis(sc, o.scanAt, o.scanAt + 1.1); tl.fromTo(sc, { y: 0 }, { y: 560, duration: 1, ease: 'power1.inOut', immediateRender: false }, o.scanAt); }
      if (o.splitAt != null) tl.fromTo(T, { z: 0 }, { z: 230, duration: .55, ease: 'back.out(1.7)', immediateRender: false }, o.splitAt);
      if (o.textAt != null) on(T, o.textAt); if (o.picAt != null) on(A, o.picAt); if (o.split) { on(T, t); on(A, t); }
      if (o.shatterAt != null) { const x = $('div', 'p3x', A, XX); vis(x, o.shatterAt); tl.fromTo(x, { scale: 2.4, opacity: 0 }, { scale: 1, opacity: 1, duration: .22, ease: 'power4.out', immediateRender: false }, o.shatterAt);
        tl.to(A, { z: -260, rotationZ: 24, opacity: 0, duration: .55, ease: 'power2.in' }, o.shatterAt + .35); } },
    // coins fly from two labelled sources into a token jar that fills and turns red
    coins: (o, e, t) => { e.className += ' cns'; e.innerHTML = `<div class="cs a">${esc(o.a || 'TEXT')}</div><div class="cs b">${esc(o.b || 'PICTURE')}</div><div class="cj"><u></u><b>${esc(o.jar || 'TOKENS')}</b></div>${o.text ? `<div class="cst">${esc(o.text)}</div>` : ''}`;
      const jar = e.querySelector('.cj u'), a0 = t + .15, n = o.n || 18;
      for (let k = 0; k < n; k++) { const c = $('i', 'coin', e, 'T'), left = k % 2 === 0, a = a0 + k * .055, sx = left ? 130 : 690, jx = 410 + (rnd() - .5) * 60;
        vis(c, a, a + .55); tl.fromTo(c, { x: sx, y: 70 }, { x: (sx + jx) / 2, y: -40, duration: .25, ease: 'power1.out', immediateRender: false }, a); tl.to(c, { x: jx, y: 330, duration: .3, ease: 'power2.in' }, a + .25); }
      tl.fromTo(jar, { height: '0%' }, { height: '92%', duration: n * .055 + .4, ease: 'power1.in', immediateRender: false }, a0 + .4); on(e, a0 + n * .055 * .7);
      const st = e.querySelector('.cst'); if (st) { vis(st, o.textAt ?? a0 + .6); tl.fromTo(st, { scale: 1.8, opacity: 0, rotation: -8 }, { scale: 1, opacity: 1, rotation: -4, duration: .25, ease: 'back.out(2)', immediateRender: false }, o.textAt ?? a0 + .6); } },
    // a gift box: the lid pops, a logo rises out with sparkles, a FREE tag swings in
    gift: (o, e, t) => { e.className += ' gft'; e.innerHTML = `<div class="gl">${o.svg || ''}</div><div class="gb"><div class="gbd"></div><div class="glid"></div></div><div class="gtag">${esc(o.tag || 'FREE')}</div>`;
      const lid = e.querySelector('.glid'), lg = e.querySelector('.gl'), tg = e.querySelector('.gtag'), a = o.openAt ?? t + .5;
      tl.fromTo(e.querySelector('.gb'), { rotation: 0 }, { rotation: 4, duration: .07, yoyo: true, repeat: 5, ease: 'sine.inOut', immediateRender: false }, a - .45);
      tl.to(lid, { y: -260, x: 140, rotation: 38, duration: .45, ease: 'power3.out' }, a); vis(lg, a); tl.fromTo(lg, { y: 120, scale: .3 }, { y: -170, scale: 1, duration: .55, ease: 'back.out(1.8)', immediateRender: false }, a + .05);
      for (let k = 0; k < 14; k++) { const sp = $('i', 'gsp', e), ang = k / 14 * Math.PI * 2, r = 220 + rnd() * 80; vis(sp, a + .1, a + .8);
        tl.fromTo(sp, { x: 0, y: -60, scale: 0 }, { x: Math.cos(ang) * r, y: -170 + Math.sin(ang) * r * .7, scale: 1, opacity: 0, duration: .7, ease: 'power2.out', immediateRender: false }, a + .1); }
      vis(tg, o.tagAt ?? a + .5); tl.fromTo(tg, { rotation: -60, scale: 0 }, { rotation: -10, scale: 1, duration: .45, ease: 'elastic.out(1,.5)', immediateRender: false }, o.tagAt ?? a + .5); },
    // a name typed in the code font after a blinking cursor, then a badge pops
    wordmark: (o, e, t) => { e.className += ' wmk'; e.innerHTML = `<div class="wq"><span class="wt"></span><i class="wc"></i></div><div class="wbg">${o.badgeSvg || ''}<span>${esc(o.badge || '')}</span></div><div class="wsub">${esc(o.sub || '')}</div>`;
      const wt = e.querySelector('.wt'), wc = e.querySelector('.wc'), a = o.typeAt ?? t + .5, txt = o.text || '', d = o.typeDur ?? .5, v = { n: 0 };
      const up = () => { wt.textContent = txt.slice(0, Math.round(v.n)); }; up(); tl.to(v, { n: txt.length, duration: d, ease: 'none', onUpdate: up }, a);
      tl.fromTo(wc, { opacity: 1 }, { opacity: 0, duration: .25, repeat: 12, yoyo: true, ease: 'steps(1)', immediateRender: false }, t);
      const bg = e.querySelector('.wbg'), sb = e.querySelector('.wsub'); vis(bg, a + d + .05); tl.fromTo(bg, { scale: 0, rotation: -20 }, { scale: 1, rotation: 0, duration: .35, ease: 'back.out(2.5)', immediateRender: false }, a + d + .05);
      vis(sb, a + d + .2); tl.fromTo(sb, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: .25, immediateRender: false }, a + d + .2); },
    // file tiles land in a fan, one per word; with suckAt they shrink into a funnel and a .md file pops out
    files: (o, e, t) => { e.className += ' fls'; const it = o.items || [];
      e.innerHTML = it.map(x => `<div class="ft" style="--c:${x.c}"><b>${esc(x.ext)}</b><span>${esc(x.name || '')}</span></div>`).join('') + (o.suckAt != null ? `<div class="fun"></div><div class="fout"><b>.md</b><span>${esc(o.outName || 'plain text')}</span></div>` : '');
      const tiles = [...e.querySelectorAll('.ft')], nn = tiles.length;
      tiles.forEach((c, k) => { const x = (k - (nn - 1) / 2) * 200, r = (k - (nn - 1) / 2) * 7, a = o.ats?.[k] ?? t + .05 + k * .1; gsap.set(c, { x, y: Math.abs(k - (nn - 1) / 2) * 18, rotation: r });
        if (!o.instant) { vis(c, a); tl.fromTo(c, { y: -700, rotation: r - 40 }, { y: Math.abs(k - (nn - 1) / 2) * 18, rotation: r, duration: .45, ease: 'back.out(1.4)', immediateRender: false }, a); }
        if (o.suckAt != null) tl.to(c, { x: 0, y: 330, scale: .15, rotation: r * 6, opacity: 0, duration: .45, ease: 'power3.in' }, o.suckAt + k * .07); });
      if (o.suckAt != null) { const fu = e.querySelector('.fun'), out = e.querySelector('.fout'), oa = o.outAt ?? o.suckAt + .8;
        tl.fromTo(fu, { scaleY: 1 }, { scaleY: .82, duration: .1, yoyo: true, repeat: 5, ease: 'sine.inOut', immediateRender: false }, o.suckAt + .3);
        vis(out, oa); tl.fromTo(out, { y: 330, scale: .2 }, { y: 560, scale: 1, duration: .5, ease: 'back.out(2)', immediateRender: false }, oa); on(e, oa); } },
    // a document flips round into its Markdown: "before" (a styled doc, a sheet, slides) turns into real Markdown lines
    morph: (o, e, t) => { e.className += ' mph'; const W = o.w || 860; e.style.width = W + 'px';
      const md = (o.lines || []).map(l => { const h = esc(l).replace(/^(#+ )/, '<em>$1</em>').replace(/(&lt;!--.*--&gt;)/, '<u>$1</u>').replace(/\|/g, '<s>|</s>'); return `<div>${h || '&nbsp;'}</div>`; }).join('');
      e.innerHTML = `<div class="mfa">${o.before || ''}</div><div class="mfb card"><div class="lbl">${esc(o.file || 'output.md')}</div><div class="mmd">${md}</div></div>`;
      const fa = e.querySelector('.mfa'), fb = e.querySelector('.mfb'), a = o.flipAt ?? t + .7;
      gsap.set(fb, { rotationY: -90, opacity: 0 }); tl.to(fa, { rotationY: 90, duration: .28, ease: 'power2.in' }, a); tl.to(fb, { rotationY: 0, opacity: 1, duration: .32, ease: 'back.out(1.6)' }, a + .28);
      [...fb.querySelectorAll('.mmd > div')].forEach((r_, k) => { tl.fromTo(r_, { x: 40, opacity: 0 }, { x: 0, opacity: 1, duration: .18, immediateRender: false }, a + .32 + k * .06); }); },
    // stacked token bars per page: PDF = text + picture, Markdown = text only (counts up)
    tokbars: (o, e, t) => { e.className += ' tkb card hs'; e.style.width = (o.w || 880) + 'px'; const mx = o.max || 4000;
      e.innerHTML = `<div class="lbl">${esc(o.title || '')}</div>` + (o.rows || []).map(r => `<div class="tr"><b>${esc(r.name)}</b><div class="tt">${r.parts.map(p => `<u style="--c:${p.c};--w:${p.v / mx * 100}%"><i>${esc(p.label)}</i></u>`).join('')}</div><em>0</em></div>`).join('') + `<div class="tnote">${esc(o.note || '')}</div>`;
      [...e.querySelectorAll('.tr')].forEach((r_, k) => { const a = o.ats?.[k] ?? t + .2 + k * .5, row = o.rows[k], tot = row.parts.reduce((s2, p) => s2 + p.v, 0), em = r_.querySelector('em'), v = { x: 0 }; const up = () => { em.textContent = '~' + fmt(v.x, 0); }; up();
        r_.querySelectorAll('u').forEach((u, j) => { tl.fromTo(u, { width: '0%' }, { width: `var(--w)`, duration: .45, ease: 'power2.out', immediateRender: false }, a + j * .35); });
        tl.to(v, { x: tot, duration: .45 + (row.parts.length - 1) * .35, ease: 'power1.out', onUpdate: up }, a); }); },
    // two usage limits draining: one empties and hits the limit, the other barely moves
    limits: (o, e, t) => { e.className += ' lmt'; e.innerHTML = (o.items || []).map(x => `<div class="lb"><div class="lbx"><u></u><b>100%</b></div><span>${esc(x.name)}</span><em>${esc(x.end || '')}</em></div>`).join('');
      [...e.querySelectorAll('.lb')].forEach((b_, k) => { const x = o.items[k], u = b_.querySelector('u'), lb = b_.querySelector('b'), v = { p: 100 }, d = o.dur ?? 1.3, a = o.drainAt ?? t + .2;
        const up = () => { u.style.height = v.p + '%'; lb.textContent = Math.round(v.p) + '%'; b_.dataset.low = v.p < 25 ? 1 : 0; }; up();
        tl.to(v, { p: x.to, duration: d, ease: 'power1.in', onUpdate: up }, a); const em = b_.querySelector('em'); vis(em, a + d); tl.fromTo(em, { scale: 1.8, opacity: 0 }, { scale: 1, opacity: 1, duration: .25, ease: 'back.out(2)', immediateRender: false }, a + d); }); },
    // a GitHub-style repo card: owner/name, description, chips that light up, a star button
    repo: (o, e, t) => { e.className += ' rpo card hs'; e.style.width = (o.w || 880) + 'px';
      e.innerHTML = `<div class="rh"><i>${o.svg || ''}</i><b>${esc(o.owner || '')} / <strong>${esc(o.name || '')}</strong></b></div><div class="rd">${esc(o.desc || '')}</div><div class="rc">${(o.chips || []).map(c => `<span>${esc(c)}</span>`).join('')}</div><div class="rs"><div class="rbtn">★ Star</div><div class="rn">${esc(o.count || '')}</div></div>`;
      [...e.querySelectorAll('.rc span')].forEach((c, k) => { const a = o.chipAt?.[k] ?? t + .3 + k * .15; on(c, a); tl.fromTo(c, { scale: 1.35 }, { scale: 1, duration: .3, ease: 'back.out(3)', immediateRender: false }, a); }); },
    // the star storm: cursors fly in from every side and click Star, +1s pop, the counter rolls up to the real total
    stars: (o, e, t) => { e.className += ' sts2'; e.innerHTML = `<div class="sbtn"><span>★</span> Star</div><div class="scnt"><b>0</b><small>${esc(o.label || 'stars')}</small></div>`;
      const btn = e.querySelector('.sbtn'), cnt = e.querySelector('.scnt b'), v = { x: 0 }, d = o.dur ?? 1.6, a0 = o.rollAt ?? t + .15; const up = () => { cnt.textContent = fmt(v.x, 0); }; up();
      tl.to(v, { x: o.to || 194200, duration: d, ease: 'power3.out', onUpdate: up }, a0);
      for (let k = 0; k < (o.n || 30); k++) { const cur = $('i', 'scur', e, o.curSvg || '▲'), ang = rnd() * Math.PI * 2, r = 620 + rnd() * 200, a = a0 + k * (d * .8 / (o.n || 30)), tx = (rnd() - .5) * 160, ty = 300 + (rnd() - .5) * 40;
        vis(cur, a, a + .55); tl.fromTo(cur, { x: Math.cos(ang) * r, y: 300 + Math.sin(ang) * r * 1.2 }, { x: tx, y: ty, duration: .3, ease: 'power2.out', immediateRender: false }, a);
        const pl = $('i', 'splus', e, '+1'); vis(pl, a + .3, a + .8); tl.fromTo(pl, { x: tx, y: ty - 60, opacity: 1 }, { y: ty - 220 - rnd() * 80, x: tx + (rnd() - .5) * 120, opacity: 0, duration: .5, ease: 'power1.out', immediateRender: false }, a + .3);
        tl.fromTo(btn, { scale: .93 }, { scale: 1, duration: .12, ease: 'power2.out', immediateRender: false }, a + .3); }
      on(btn, a0 + .3); },
    // a giant star bursting: rays spin, small stars explode outward, the total sits big inside
    starburst: (o, e, t) => { e.className += ' sbr'; e.innerHTML = `<div class="sray"></div><div class="sbig">★</div><div class="stxt"><b>${esc(o.text || '')}</b><small>${esc(o.sub || '')}</small></div>${o.svg ? `<i class="slg">${o.svg}</i>` : ''}`;
      const ray = e.querySelector('.sray'), big = e.querySelector('.sbig'), a = o.burstAt ?? t + .1;
      tl.fromTo(ray, { rotation: 0, scale: .4, opacity: 0 }, { rotation: 70, scale: 1, opacity: 1, duration: 2.4, ease: 'power1.out', immediateRender: false }, a);
      tl.fromTo(big, { scale: 0, rotation: -90 }, { scale: 1, rotation: 0, duration: .6, ease: 'elastic.out(1,.5)', immediateRender: false }, a);
      for (let k = 0; k < 40; k++) { const sp = $('i', 'sbs', e, '★'), ang = rnd() * Math.PI * 2, r = 280 + rnd() * 320, b = a + .1 + rnd() * .3; vis(sp, b, b + 1.2);
        tl.fromTo(sp, { x: 0, y: 0, scale: .3, rotation: 0 }, { x: Math.cos(ang) * r, y: Math.sin(ang) * r, scale: .6 + rnd() * .9, rotation: (rnd() - .5) * 360, opacity: 0, duration: 1.2, ease: 'power2.out', immediateRender: false }, b); }
      const tx = e.querySelector('.stxt'); vis(tx, a + .25); tl.fromTo(tx, { scale: 1.6, opacity: 0 }, { scale: 1, opacity: 1, duration: .35, ease: 'back.out(2)', immediateRender: false }, a + .25); },
  };
  // ---- effects: varied entrances, a camera shake on impacts, sparks
  const AUTO_IN = ['pop', 'zoom', 'left', 'up', 'right', 'flip', 'pop', 'swing']; let nIn = 0;
  const shake = (t, a) => tl.fromTo(heroes, { x: a, y: -a * .5, rotation: .4 }, { x: 0, y: 0, rotation: 0, duration: .45, ease: 'elastic.out(1.4, .28)', immediateRender: false }, t);
  const sparks = (x, y, t, n) => { for (let i = 0; i < n; i++) { const s_ = $('i', 'spk3', heroes); const ang = (i / n) * Math.PI * 2 + rnd() * .5, r = 180 + rnd() * 160;
    s_.style.left = x + 'px'; s_.style.top = y + 'px'; if (i % 3 === 1) s_.className += ' b'; if (i % 3 === 2) s_.className += ' c';
    vis(s_, t, t + .7); tl.fromTo(s_, { x: 0, y: 0, scale: 1.2, opacity: 1 }, { x: Math.cos(ang) * r, y: Math.sin(ang) * r, scale: .2, opacity: 0, duration: .65, ease: 'power3.out', immediateRender: false }, t); } };
  function place(o, parent, owner) {
    // the moving wrapper (.h) holds the built object, so the object's shadow can sit behind its own background
    const e = $('div', 'h', parent), inner = $('div', '', e); const t = o.at, u = o.until ?? owner?.until ?? R.dur;
    (B[o.type] || B.card)(o, inner, t);
    // zone for a scene: under the caption, above Kai's head (or the whole frame without a presenter)
    const Z = R.wide ? [200, 1020] : R.nopres ? [300, 1700] : [300, 1235], ZC = (Z[0] + Z[1]) / 2;
    e.style.left = (o.x ?? (owner ? (owner.w || 920) / 2 : CX)) + 'px'; e.style.top = (o.y ?? (owner ? (owner.h || 760) / 2 : ZC)) + 'px'; e.style.zIndex = o.z ?? 1;
    let S1 = (o.scale || 1) * (owner ? 1 : (R.heroScale ?? 1.3));
    if (!owner && o.fit !== false) {   // keep it inside the frame: scale down to fit 960 px wide and the zone's height
      const w = inner.offsetWidth, h = inner.offsetHeight, x = o.x ?? CX, xr = R.wide && !R.nopres ? 1330 : FW - 30;
      const maxW = Math.min(R.wide ? 1180 : 980, 2 * Math.min(x - 30, xr - x)), maxH = (Z[1] - Z[0]) * 1.02;
      const slack = ['num', 'scramble', 'stamp', 'sticker', 'wordmark', 'starburst'].includes(o.type) ? .8 : .97;   // big type: room for wider webfont glyphs
      if (w && h) { S1 = Math.min(S1, maxW * slack / w, maxH / h);
        if (o.y == null) { const half = h * S1 / 2; e.style.top = Math.min(Math.max(ZC, Z[0] + half), Z[1] - half) + 'px'; } } }
    gsap.set(e, { xPercent: -50, yPercent: -50, rotation: o.rot || 0, scale: S1 });
    vis(e, t, u);
    const stamp = o.type === 'stamp', stk = o.type === 'sticker';
    const pop = stamp ? { scale: 2.6, opacity: 0, rotation: (o.rot || 0) - 14 } : { scale: .55, opacity: 0, y: 46, rotation: (o.rot || 0) + (stk ? -12 : -4) };
    const IN = { zoom: { scale: S1 * 1.6, opacity: 0, filter: 'blur(10px)' }, left: { x: -480, opacity: 0, rotation: (o.rot || 0) - 6 }, right: { x: 480, opacity: 0, rotation: (o.rot || 0) + 6 },
      up: { y: 300, opacity: 0 }, down: { y: -300, opacity: 0 }, flip: { rotationY: -85, opacity: 0, transformPerspective: 1400 }, drop: { y: -620, opacity: 1 }, swing: { rotationX: -70, opacity: 0, transformPerspective: 1400, transformOrigin: '50% 0%' } };
    pop.scale *= S1;
    if (!o.in && !owner && R.fx !== false && !stamp && !stk && o.pop !== false && o.type !== 'clip') o.in = AUTO_IN[(nIn++) % AUTO_IN.length];   // vary entrances
    if (!owner && R.fx !== false && (stamp || o.type === 'starburst')) { shake(t + (stamp ? .16 : .1), stamp ? 16 : 10); sparks(parseFloat(e.style.left), parseFloat(e.style.top), t + .14, stamp ? 14 : 22); }
    if (!owner && R.fx !== false && stk) sparks(parseFloat(e.style.left), parseFloat(e.style.top), t + .1, 10);
    if (o.in && IN[o.in]) tl.fromTo(e, IN[o.in], { x: 0, y: 0, scale: S1, opacity: 1, rotation: o.rot || 0, rotationY: 0, rotationX: 0, filter: 'blur(0px)', duration: o.in === 'drop' ? .55 : .36, ease: o.in === 'drop' ? 'bounce.out' : 'power3.out', immediateRender: false }, t);
    else if (o.pop !== false) tl.fromTo(e, pop, { scale: S1, opacity: 1, y: 0, rotation: o.rot || 0, duration: stamp ? .2 : .42, ease: stamp ? 'power4.out' : 'back.out(1.8)', immediateRender: false }, t);
    if (o.tilt) tl.fromTo(inner, { rotationX: o.tilt[0], rotationY: o.tilt[1] || 0, transformPerspective: 1500 }, { rotationX: 0, rotationY: 0, transformPerspective: 1500, duration: o.tiltDur ?? 1.2, ease: 'power3.out', immediateRender: true }, t);
    if (o.push) tl.fromTo(inner, { scale: 1 }, { scale: o.push, duration: Math.max(.5, u - t), ease: 'none', immediateRender: false }, t);
    if (!owner && o.float !== false && u - t > 1.4) tl.to(e, { y: -10, duration: (u - t - .5) / 2, ease: 'sine.inOut', yoyo: true, repeat: 1 }, t + .45);
    const OUT = { left: { x: -520, opacity: 0 }, right: { x: 520, opacity: 0 }, zoom: { scale: S1 * 1.5, opacity: 0, filter: 'blur(8px)' }, down: { y: 360, opacity: 0 }, shrink: { scale: S1 * .4, opacity: 0 } };
    if (o.out && OUT[o.out] && u < R.dur) tl.to(e, Object.assign({ duration: .18, ease: 'power2.in' }, OUT[o.out]), u - .18);
    else if (o.exit !== 'cut' && u < R.dur && (!owner || o.until != null)) tl.to(e, { y: owner ? -20 : -70, opacity: 0, duration: .16, ease: 'power2.in' }, u - .16);
    return e;
  }
  R.items.forEach(o => place(o, heroes, null));
  if (R.fx !== false) R.beats.forEach((b, k) => { if (k) tl.fromTo(heroes, { scale: 1.035 }, { scale: 1, duration: .4, ease: 'power3.out', transformOrigin: '50% 40%', immediateRender: false }, b.t0); });

  // ---- presenter: rises in, can start big and shrink when the hero lands, bounces on beat changes, reacts
  const pres = document.getElementById('pres'), pin = document.getElementById('presin'); const P = R.presenter || {};
  if (R.beats[0]?.pres !== false && !R.flashes) tl.fromTo(pres, { y: 700 }, { y: 0, duration: .5, ease: 'back.out(1.3)', immediateRender: true }, 0);
  const pbox = null;
  if (pbox && R.beats[0]?.pres !== false && !R.flashes) { tl.fromTo(pbox, { y: 700 }, { y: 0, duration: .5, ease: 'back.out(1.1)', immediateRender: true }, 0);
  }
  (R.cams || []).forEach(c => { tl.set(pin, { scale: c.scale, y: c.y }, c.t0); if (c.t1 != null) tl.to(pin, { scale: 1, y: 0, duration: .38, ease: 'power3.inOut' }, c.t1); });
  if (R.flashes) { const ps = [pres, pbox].filter(Boolean); gsap.set(ps, { autoAlpha: 0 }); tl.set(ps, { autoAlpha: 0, y: 0 }, 0);
    R.flashes.forEach(([a, d]) => { tl.fromTo(ps, { autoAlpha: 0, scale: .82, y: 60 }, { autoAlpha: 1, scale: 1, y: 0, duration: .2, ease: 'back.out(2)', transformOrigin: '50% 60%', immediateRender: false }, a);
      tl.to(ps, { autoAlpha: 0, scale: 1.06, duration: .14, ease: 'power2.in' }, a + d - .14); }); }
  else { const ps = [pres, pbox].filter(Boolean); let shown = R.beats[0]?.pres !== false;
    if (!shown) { gsap.set(ps, { y: 900, autoAlpha: 0 }); tl.set(ps, { y: 900, autoAlpha: 0 }, 0); }   // hidden from frame 0 (no flash of the presenter)
    R.beats.forEach((b, k) => { if (!k) return; const want = b.pres !== false; if (want === shown) return; shown = want;
      if (want) tl.fromTo(ps, { y: 900, autoAlpha: 1 }, { y: 0, autoAlpha: 1, duration: .45, ease: 'back.out(1.2)', immediateRender: false }, b.t0 - .05);
      else { tl.to(ps, { y: 900, duration: .35, ease: 'power3.in' }, b.t0 - .1); tl.set(ps, { autoAlpha: 0 }, b.t0 + .26); } }); }
  // Kai walks along the bottom: "kai": "left" | "center" | "right" per beat, or the default rhythm
  if (!R.flashes && !R.nopres) { const X = R.wide ? { left: -120, center: 0, right: 40 } : { left: -150, center: 0, right: 150 }, AUTO = ['center', 'left', 'center', 'right']; let cur = 0;
    R.beats.forEach((b, k) => { const want = X[b.spot] ?? (R.kaiMove === false ? 0 : X[AUTO[k % AUTO.length]]);
      if (!k) { gsap.set(pres, { x: want }); tl.set(pres, { x: want }, 0); cur = want; return; }
      if (want !== cur) { tl.to(pres, { x: want, duration: .6, ease: 'power3.inOut' }, b.t0 - .2); tl.fromTo(pin, { rotation: 0 }, { rotation: want > cur ? 3 : -3, duration: .3, yoyo: true, repeat: 1, ease: 'sine.inOut', transformOrigin: '50% 100%', immediateRender: false }, b.t0 - .2); cur = want; } }); }
  R.beats.forEach((b, k) => { if (k && !R.flashes) tl.fromTo(pres, { scale: .975 }, { scale: 1, duration: .28, ease: 'back.out(3)', transformOrigin: '50% 100%', immediateRender: false }, b.t0); });
  const hx = (P.headX ?? .517) * 100, hy = (P.headY ?? .31) * 100;
  (R.reacts || []).forEach(t => {
    const bu = $('div', 'burst', pin); bu.style.left = hx + '%'; bu.style.top = hy + '%';
    bu.innerHTML = '<svg viewBox="-100 -100 200 200">' + Array.from({ length: 10 }, (_, i) => { const a = i / 10 * Math.PI * 2 + .2; const r1 = 70, r2 = 92 + (i % 2) * 8;
      return `<line x1="${(Math.cos(a) * r1).toFixed(1)}" y1="${(Math.sin(a) * r1).toFixed(1)}" x2="${(Math.cos(a) * r2).toFixed(1)}" y2="${(Math.sin(a) * r2).toFixed(1)}"/>`; }).join('') + '</svg>';
    vis(bu, t, t + .55); tl.fromTo(bu, { scale: .6, opacity: 1 }, { scale: 1.15, opacity: 0, duration: .55, ease: 'power2.out', immediateRender: false }, t);
    tl.fromTo(pin, { x: -8 }, { x: 0, duration: .3, ease: 'elastic.out(1.2, .3)', immediateRender: false }, t);
  });

  window.__timelines = window.__timelines || {}; window.__timelines['reel'] = tl;
})();
