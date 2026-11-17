/* simon teague · portfolio. vanilla js, no dependencies. */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const root = document.documentElement;
  const reduceMq = matchMedia('(prefers-reduced-motion: reduce)');
  const reduced = () => reduceMq.matches;
  const behavior = () => (reduced() ? 'auto' : 'smooth');

  const projects = $$('.proj');
  const rows = $$('.row');
  const names = projects.map((p) => p.dataset.name);
  const browser = $('#browser');
  const rowsEl = $('#rows');
  const modeEl = $('#mode');
  const pathEl = $('#path');
  const posEl = $('#pos');
  const toastEl = $('#toast');
  const palette = $('#palette');
  const palInput = $('#pal-input');
  const palList = $('#pal-list');
  const keysDlg = $('#keys');
  const shellIn = $('#shell-in');
  const shellOut = $('#shell-out');
  const shellBody = $('#shell-body');
  const ssVideo = $('#ss-video');
  const ssToggle = $('#ss-toggle');

  let active = -1;
  let section = 'home';
  let ssUserPaused = false;

  const pad = (n) => String(n).padStart(2, '0');
  const titleOf = (p) => $('h3', p).textContent.trim();

  /* ── toast ─────────────────────────────────────────── */
  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('on'), 2200);
  }

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.append(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch { /* nothing else to try */ }
      ta.remove();
      if (!ok) { toast("couldn't reach the clipboard"); return; }
    }
    toast('copied: ' + text);
  }

  /* ── status line ───────────────────────────────────── */
  function setMode() {
    const m = palette.open ? 'COMMAND' : document.activeElement === shellIn ? 'INSERT' : 'NORMAL';
    modeEl.textContent = m;
    modeEl.dataset.m = m;
  }
  function setPath() {
    const base = $('#' + section).dataset.path;
    pathEl.textContent = section === 'projects' && active >= 0 ? base + '/' + names[active] : base;
  }

  /* ── project browser ───────────────────────────────── */
  function reveal() {
    const r = browser.getBoundingClientRect();
    if (r.top < -8 || r.top > innerHeight * 0.45) {
      const top = parseFloat(getComputedStyle(root).scrollPaddingTop) || 60;
      scrollTo({ top: scrollY + r.top - top, behavior: behavior() });
    }
  }

  function select(i, opts = {}) {
    const n = projects.length;
    i = ((i % n) + n) % n;
    const changed = i !== active;
    active = i;
    projects.forEach((p, j) => p.classList.toggle('is-active', j === i));
    rows.forEach((r, j) => {
      if (j === i) r.setAttribute('aria-current', 'true');
      else r.removeAttribute('aria-current');
    });
    posEl.textContent = pad(i + 1) + '/' + pad(n);
    $('#prev span').textContent = names[(i - 1 + n) % n];
    $('#next span').textContent = names[(i + 1) % n];

    // keep the active chip in view when the list is a horizontal strip
    const row = rows[i];
    if (rowsEl.scrollWidth > rowsEl.clientWidth) {
      const target = row.offsetLeft - (rowsEl.clientWidth - row.offsetWidth) / 2;
      rowsEl.scrollTo({ left: target, behavior: behavior() });
    }

    if (changed) {
      $$('video').forEach((v) => { if (!projects[i].contains(v)) v.pause(); });
      syncDemo();
    }
    if (opts.hash !== false) history.replaceState(null, '', '#' + projects[i].id);
    if (opts.reveal) reveal();
    if (opts.focus) {
      const h = $('h3', projects[i]);
      h.tabIndex = -1;
      h.focus({ preventScroll: true });
    }
    setPath();
  }

  function selectByName(name, opts) {
    const i = names.indexOf(name);
    if (i < 0) return false;
    select(i, opts);
    return true;
  }

  rows.forEach((r, i) => r.addEventListener('click', (e) => {
    e.preventDefault();
    // keyboard activation moves focus into the detail pane; a pointer click leaves it alone
    select(i, { reveal: true, focus: e.detail === 0 });
  }));
  $$('a[href^="#p-"]').filter((a) => !a.classList.contains('row')).forEach((a) => {
    a.dataset.w = '1';
    a.addEventListener('click', (e) => {
      const i = projects.findIndex((p) => '#' + p.id === a.getAttribute('href'));
      if (i < 0) return;
      e.preventDefault();
      select(i, { reveal: true });
    });
  });
  $('#prev').addEventListener('click', () => select(active - 1, { reveal: true }));
  $('#next').addEventListener('click', () => select(active + 1, { reveal: true }));

  function fromHash(revealIt) {
    const i = projects.findIndex((p) => '#' + p.id === location.hash);
    if (i >= 0) { select(i, { hash: false, reveal: revealIt }); return true; }
    return false;
  }
  addEventListener('hashchange', () => fromHash(true));

  function openActive() {
    const p = projects[active];
    if (p.dataset.open) window.open(p.dataset.open, '_blank', 'noopener');
    else toast(names[active] + ' is private until its first public release');
  }
  function yankActive() {
    const y = projects[active].dataset.yank;
    if (y) copy(y);
    else toast('nothing to copy for ' + names[active]);
  }
  $$('[data-copy]').forEach((b) => b.addEventListener('click', () => copy(b.dataset.copy)));

  /* ── skill-shelf demo: loop it, but let people stop it ─ */
  let demoVisible = false;
  function syncDemo() {
    if (!ssVideo || reduced()) return;
    const want = demoVisible && !ssUserPaused && projects[active] && projects[active].contains(ssVideo);
    if (want) ssVideo.play().catch(() => {});
    else ssVideo.pause();
  }
  if (ssVideo && !reduced()) {
    ssVideo.removeAttribute('controls');
    ssToggle.hidden = false;
    const label = () => { ssToggle.textContent = ssVideo.paused ? 'play' : 'pause'; };
    const flip = () => {
      ssUserPaused = !ssVideo.paused;
      if (ssVideo.paused) ssVideo.play().catch(() => {}); else ssVideo.pause();
    };
    ssToggle.addEventListener('click', flip);
    ssVideo.addEventListener('click', flip);
    ssVideo.addEventListener('play', label);
    ssVideo.addEventListener('pause', label);
    new IntersectionObserver((es) => { demoVisible = es[0].isIntersecting; syncDemo(); }, { threshold: 0.25 }).observe(ssVideo);
  }

  /* ── psst mock ─────────────────────────────────────── */
  const psst = $('#psst-mock');
  const cards = $$('.card', psst);
  let cardSel = 0;
  function pickCard(i, focus) {
    cardSel = (i + cards.length) % cards.length;
    cards.forEach((c, j) => {
      c.classList.toggle('is-sel', j === cardSel);
      c.setAttribute('aria-pressed', j === cardSel);
    });
    if (focus) cards[cardSel].focus();
  }
  function describe(c) {
    const s = c.dataset.status;
    c.setAttribute('aria-label', $('.role', c).textContent + ', ' + $('.co', c).textContent + (s ? ', ' + s : ''));
  }
  function markCard(k) {
    const c = cards[cardSel];
    c.dataset.status = k === 'a' ? 'applied' : k === 'd' ? 'dismissed' : '';
    describe(c);
  }
  cards.forEach((c, i) => { describe(c); c.addEventListener('click', () => pickCard(i)); });
  pickCard(0);
  $$('[data-k]', psst).forEach((b) => b.addEventListener('click', () => markCard(b.dataset.k)));
  psst.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    if (k === 'j' || k === 'ArrowDown') pickCard(cardSel + 1, true);
    else if (k === 'k' || k === 'ArrowUp') pickCard(cardSel - 1, true);
    else if (k === 'Escape') document.activeElement.blur();
    else return;
    e.preventDefault();
    e.stopPropagation();
  });

  /* ── workout heatmap (decorative) ──────────────────── */
  const heat = $('#heat');
  if (heat) {
    let s = 7;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < 84; i++) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      const cell = document.createElement('i');
      const v = (s >> 8) % 10;
      cell.dataset.l = v < 4 ? 0 : v < 6 ? 1 : v < 9 ? 2 : 3;
      frag.append(cell);
    }
    heat.append(frag);
  }

  /* ── scroll spy ────────────────────────────────────── */
  const sections = $$('main > section');
  const navLinks = $$('.topnav a');
  let ticking = false;
  function spy() {
    ticking = false;
    let cur = sections[0].id;
    for (const s of sections) if (s.getBoundingClientRect().top <= innerHeight * 0.45) cur = s.id;
    if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) cur = sections[sections.length - 1].id;
    if (cur !== section) {
      section = cur;
      navLinks.forEach((a) => {
        if (a.dataset.sec === cur) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
      setPath();
    }
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(spy); } }, { passive: true });
  addEventListener('resize', spy);

  function goSection(id) {
    const el = $('#' + id);
    if (id === 'home') scrollTo({ top: 0, behavior: behavior() });
    else el.scrollIntoView({ behavior: behavior(), block: 'start' });
  }

  /* ── hero shell ────────────────────────────────────── */
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const alias = { 'ollama-model-tester': 'omt', aloud: 'aloud-tts', workout: 'workout-app', china: 'china-website', agents: 'agent-extensions', 'jev-scam-detector': 'jev', helpwanted: 'help-wanted', skillshelf: 'skill-shelf' };
  const resolve = (arg) => {
    const a = (arg || '').toLowerCase().replace(/^(~\/)?(projects\/)?/, '').replace(/\/$/, '');
    return names.includes(a) ? a : alias[a] || null;
  };
  const lsHtml = () => '<div class="out ls">' + names.map((n) => `<a href="#p-${n}">${n}/</a>`).join('') + '</div>';
  const HELP = [
    ['ls', 'list projects'],
    ['cd <project>', 'read one, e.g. cd psst'],
    ['open <project>', 'open its repo or live site'],
    ['whoami', 'the short version'],
    ['about, contact', 'jump to a section'],
    ['keys', 'keyboard shortcuts'],
    ['clear', 'tidy up'],
  ];

  function run(raw) {
    const line = raw.trim();
    const [cmd, ...rest] = line.split(/\s+/);
    const arg = rest.join(' ');
    const c = cmd.toLowerCase();
    const text = (s, cls = '') => `<div class="out ${cls}"><p>${s}</p></div>`;

    switch (c) {
      case '': return '';
      case 'help': case 'man':
        return '<div class="out">' + HELP.map(([a, b]) => `<p>${esc(a.padEnd(16)).replace(/ /g, '&nbsp;')}<span class="dim">${b}</span></p>`).join('') + '</div>';
      case 'ls': case 'll': case 'la': case 'tree':
        return lsHtml();
      case 'whoami':
        return '<div class="out"><p>simon teague</p><p class="dim">cs sophomore, utsa, class of 2029</p><p class="dim">project advisor, rowdy creators (acm at utsa)</p></div>';
      case 'pwd': return text('~');
      case 'cd': case 'cat': case 'less': case 'show': {
        if (c === 'cd' && (!arg || arg === '~' || arg === '..')) { goSection('home'); return ''; }
        const a = arg.toLowerCase().replace(/\.md$/, '');
        if (a === 'about' || a === 'contact' || a === 'projects' || a === 'projects/') { goSection(a.replace('/', '')); return ''; }
        const n = resolve(arg);
        if (!n) return text(`${esc(c)}: no such project: ${esc(arg || '(nothing)')}. try ls.`, 'err');
        selectByName(n, { reveal: true });
        return '';
      }
      case 'open': case 'o': {
        const n = resolve(arg);
        if (!n) return text(`open: no such project: ${esc(arg || '(nothing)')}. try ls.`, 'err');
        const p = projects[names.indexOf(n)];
        if (!p.dataset.open) return text(`${n} is private until its first public release.`);
        window.open(p.dataset.open, '_blank', 'noopener');
        return text(`opening ${esc(p.dataset.open.replace(/^https?:\/\//, ''))}`, 'dim');
      }
      case 'about': case 'contact': case 'projects': case 'home':
        goSection(c); return '';
      case 'keys': case '?':
        showKeys(); return '';
      case 'clear':
        shellOut.innerHTML = ''; return '';
      case 'psst':
        selectByName('psst', { reveal: true });
        return text('Psst. Found a few openings.');
      case 'npx': case 'npm': case 'pip': case 'uv': case 'go': case 'brew':
        return text('This prompt is a web page. That one needs a real terminal.');
      case 'skill-shelf': case 'omt': case 'help-wanted':
        selectByName(c, { reveal: true });
        return text('Not installed in this browser. Here is the page for it instead.', 'dim');
      case 'vim': case 'nvim': case 'vi':
        return text('You are already in normal mode. Press esc, then j.');
      case 'sudo': return text('simon is not in the sudoers file. Neither are you.');
      case 'exit': case 'quit': case 'q': case ':q': case ':wq':
        shellIn.blur();
        return text('It is a browser tab. It closes the usual way.');
      case 'echo': return text(esc(arg));
      case 'date': return text(esc(new Date().toString()));
      default:
        return text(`zsh: command not found: ${esc(cmd)}. try help.`, 'err');
    }
  }

  const history_ = [];
  let histAt = 0;
  $('#shell-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = shellIn.value;
    shellOut.insertAdjacentHTML('beforeend', `<p class="ln"><span class="pr">›</span> <span class="cmd">${esc(v)}</span></p>`);
    if (v.trim()) { history_.push(v); }
    histAt = history_.length;
    shellIn.value = '';
    const out = run(v);
    if (out) shellOut.insertAdjacentHTML('beforeend', out);
    // keep the session short enough to stay on screen
    while (shellOut.children.length > 14) shellOut.firstElementChild.remove();
    wireLs();
  });
  function wireLs() {
    $$('a[href^="#p-"]', shellOut).forEach((a) => {
      if (a.dataset.w) return;
      a.dataset.w = '1';
      a.addEventListener('click', (e) => {
        e.preventDefault();
        selectByName(a.getAttribute('href').slice(3), { reveal: true });
      });
    });
  }
  shellIn.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { shellIn.blur(); return; }
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      if (!history_.length) return;
      e.preventDefault();
      histAt = Math.max(0, Math.min(history_.length, histAt + (e.key === 'ArrowUp' ? -1 : 1)));
      shellIn.value = history_[histAt] || '';
      return;
    }
    if (e.key === 'Tab' && shellIn.value.trim()) {
      // complete command names and project names
      const parts = shellIn.value.split(/\s+/);
      const last = parts[parts.length - 1].toLowerCase();
      const pool = parts.length === 1 ? ['help', 'ls', 'cd', 'open', 'whoami', 'about', 'contact', 'keys', 'clear'] : names;
      const hits = last ? pool.filter((x) => x.startsWith(last)) : [];
      if (hits.length === 1) {
        e.preventDefault();
        parts[parts.length - 1] = hits[0];
        shellIn.value = parts.join(' ') + (parts.length === 1 ? ' ' : '');
      } else if (hits.length > 1) {
        e.preventDefault();
        let pre = hits[0];
        for (const h of hits) while (!h.startsWith(pre)) pre = pre.slice(0, -1);
        parts[parts.length - 1] = pre;
        shellIn.value = parts.join(' ');
      }
    }
  });
  shellIn.addEventListener('focus', setMode);
  shellIn.addEventListener('blur', setMode);
  shellBody.addEventListener('click', (e) => {
    if (!e.target.closest('a, input') && !String(getSelection())) shellIn.focus({ preventScroll: true });
  });

  /* typed intro */
  function intro() {
    const steps = $$('.step', shellBody);
    if (reduced()) return;
    shellBody.classList.add('intro');
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    let skip = false;
    const stop = () => { skip = true; };
    addEventListener('keydown', stop, { once: true });
    addEventListener('pointerdown', stop, { once: true });
    (async () => {
      await wait(350);
      for (const st of steps) {
        const t = $('[data-type]', st);
        if (t && !skip) {
          const full = t.textContent;
          t.textContent = '';
          t.classList.add('type-caret');
          st.classList.add('on');
          await wait(260);
          for (const ch of full) {
            if (skip) break;
            t.textContent += ch;
            await wait(38 + Math.random() * 50);
          }
          t.textContent = full;
          if (!skip) await wait(220);
          t.classList.remove('type-caret');
        } else {
          st.classList.add('on');
          if (!skip) await wait(140);
        }
      }
      shellBody.classList.remove('intro');
    })();
  }

  /* ── dialogs ───────────────────────────────────────── */
  const anyDialog = () => palette.open || keysDlg.open;
  function showKeys() {
    if (palette.open) palette.close();
    if (!keysDlg.open) keysDlg.showModal();
  }
  [palette, keysDlg].forEach((d) => {
    d.addEventListener('click', (e) => { if (e.target === d || e.target.closest('[data-close]')) d.close(); });
    d.addEventListener('close', setMode);
  });

  const items = [
    ...sections.map((s, i) => ({ k: 'go', t: s.id, h: String(i + 1), run: () => goSection(s.id) })),
    ...projects.map((p, i) => ({ k: 'project', t: names[i], h: $('.tagline', p).textContent.trim(), kw: titleOf(p) + ' ' + $('.meta', p).textContent, run: () => select(i, { reveal: true, focus: true }) })),
    { k: 'open', t: 'github.com/simonteague6', h: 'profile', run: () => window.open('https://github.com/simonteague6', '_blank', 'noopener') },
    { k: 'open', t: 'npmjs.com/~simonteague6', h: 'packages', run: () => window.open('https://www.npmjs.com/~simonteague6', '_blank', 'noopener') },
    { k: 'open', t: 'china.simonteague.xyz', h: 'live site', run: () => window.open('https://china.simonteague.xyz', '_blank', 'noopener') },
    { k: 'copy', t: 'npx @simonteague6/skill-shelf', h: 'run skill-shelf', run: () => copy('npx @simonteague6/skill-shelf') },
    { k: 'copy', t: 'pip install help-wanted', h: 'install help wanted', run: () => copy('pip install help-wanted') },
    { k: 'toggle', t: 'grain and scanlines', h: 'on / off', kw: 'effects fx texture', run: () => { root.classList.toggle('no-fx'); toast(root.classList.contains('no-fx') ? 'grain and scanlines off' : 'grain and scanlines on'); } },
    { k: 'show', t: 'keys', h: '?', kw: 'keyboard shortcuts help', run: showKeys },
    { k: 'focus', t: 'shell', h: 'i', kw: 'terminal prompt type', run: focusShell },
  ];
  let shown = [];
  let palAt = 0;

  function score(it, q) {
    const t = it.t.toLowerCase();
    const at = t.indexOf(q);
    if (at >= 0) return 100 - at;
    const hay = (it.k + ' ' + (it.kw || '') + ' ' + it.h).toLowerCase();
    if (hay.includes(q)) return 40;
    // loose match: the letters of the query, in order, within the name
    let i = 0;
    for (const ch of t) if (ch === q[i]) i++;
    return i === q.length ? 10 : 0;
  }
  function mark(t, q) {
    const at = q ? t.toLowerCase().indexOf(q) : -1;
    return at < 0 ? esc(t) : esc(t.slice(0, at)) + '<b>' + esc(t.slice(at, at + q.length)) + '</b>' + esc(t.slice(at + q.length));
  }
  function renderPal() {
    const q = palInput.value.trim().toLowerCase();
    shown = q ? items.map((it) => [score(it, q), it]).filter((x) => x[0] > 0).sort((a, b) => b[0] - a[0]).map((x) => x[1]) : items.slice();
    palAt = Math.min(palAt, Math.max(0, shown.length - 1));
    palList.innerHTML = shown.length
      ? shown.map((it, i) => `<li role="option" id="pal-${i}" aria-selected="${i === palAt}"><span class="k">${it.k}</span><span class="t">${mark(it.t, q)}</span><span class="h">${esc(it.h)}</span></li>`).join('')
      : `<li class="none" role="option" aria-disabled="true" aria-selected="false">nothing matches “${esc(q)}”</li>`;
    if (shown.length) palInput.setAttribute('aria-activedescendant', 'pal-' + palAt);
    else palInput.removeAttribute('aria-activedescendant');
  }
  function movePal(d) {
    if (!shown.length) return;
    palAt = (palAt + d + shown.length) % shown.length;
    $$('li', palList).forEach((li, i) => li.setAttribute('aria-selected', i === palAt));
    palInput.setAttribute('aria-activedescendant', 'pal-' + palAt);
    $('#pal-' + palAt).scrollIntoView({ block: 'nearest' });
  }
  function runPal(i) {
    const it = shown[i];
    if (!it) return;
    palette.close();
    it.run();
  }
  function openPalette() {
    if (keysDlg.open) keysDlg.close();
    if (palette.open) { palette.close(); return; }
    palInput.value = '';
    palAt = 0;
    renderPal();
    palette.showModal();
    palList.scrollTop = 0;
    setMode();
  }
  palInput.addEventListener('input', () => { palAt = 0; renderPal(); });
  palInput.addEventListener('keydown', (e) => {
    const ctrl = e.ctrlKey && !e.metaKey;
    if (e.key === 'ArrowDown' || (ctrl && (e.key === 'n' || e.key === 'j'))) { e.preventDefault(); movePal(1); }
    else if (e.key === 'ArrowUp' || (ctrl && e.key === 'p')) { e.preventDefault(); movePal(-1); }
    else if (e.key === 'Enter') { e.preventDefault(); runPal(palAt); }
  });
  palList.addEventListener('click', (e) => {
    const li = e.target.closest('li[id]');
    if (li) runPal(Number(li.id.slice(4)));
  });
  palList.addEventListener('pointermove', (e) => {
    const li = e.target.closest('li[id]');
    if (!li) return;
    const i = Number(li.id.slice(4));
    if (i !== palAt) { palAt = i; $$('li', palList).forEach((x, j) => x.setAttribute('aria-selected', j === palAt)); }
  });

  function focusShell() {
    goSection('home');
    shellIn.focus({ preventScroll: true });
  }

  $$('[data-act]').forEach((b) => b.addEventListener('click', () => {
    const a = b.dataset.act;
    if (a === 'palette') openPalette();
    else if (a === 'help') showKeys();
    else if (a === 'next') select(active < 0 ? 0 : active, { reveal: true, focus: true });
  }));

  /* ── keys ──────────────────────────────────────────── */
  document.addEventListener('keydown', (e) => {
    const k = e.key;
    if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && k.toLowerCase() === 'k') {
      // ctrl-k inside the palette input means "up one"; leave it alone there
      if (palette.open && e.ctrlKey && !e.metaKey) { e.preventDefault(); movePal(-1); return; }
      e.preventDefault();
      openPalette();
      return;
    }
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || anyDialog()) return;
    const t = e.target;
    if (t.closest && t.closest('input, textarea, select, video, [contenteditable]')) return;

    switch (k) {
      case 'j': select(active + 1, { reveal: true }); break;
      case 'k': select(active - 1, { reveal: true }); break;
      case 'Enter':
        if (t.closest('a, button, summary')) return;
        select(active, { reveal: true, focus: true });
        break;
      case 'o': openActive(); break;
      case 'y': yankActive(); break;
      case 'a': case 'd': case 'u':
        if (names[active] !== 'psst' || section !== 'projects') return;
        markCard(k);
        break;
      case 'g': scrollTo({ top: 0, behavior: behavior() }); break;
      case 'G': scrollTo({ top: document.documentElement.scrollHeight, behavior: behavior() }); break;
      case '1': case '2': case '3': case '4': goSection(sections[Number(k) - 1].id); break;
      case 'i': focusShell(); break;
      case '/': openPalette(); break;
      case '?': showKeys(); break;
      default: return;
    }
    e.preventDefault();
  });

  /* ── boot ──────────────────────────────────────────── */
  if (!fromHash(false)) select(0, { hash: false });
  if (location.hash.startsWith('#p-')) requestAnimationFrame(reveal);
  wireLs();
  section = '';
  spy();
  setMode();
  intro();
})();
