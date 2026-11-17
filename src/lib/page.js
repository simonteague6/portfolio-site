import { emit, listen } from "./actions.js";

(() => {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const root = document.documentElement;
  const reduceMq = matchMedia("(prefers-reduced-motion: reduce)");
  const reduced = () => reduceMq.matches;
  const behavior = () => (reduced() ? "auto" : "smooth");

  const projects = $$(".proj");
  const rows = $$(".row");
  const names = projects.map((p) => p.dataset.name);
  const browser = $("#browser");
  const rowsEl = $("#rows");
  const modeEl = $("#mode");
  const pathEl = $("#path");
  const posEl = $("#pos");
  const toastEl = $("#toast");

  const keysDlg = $("#keys");

  const ssVideo = $("#ss-video");
  const ssToggle = $("#ss-toggle");

  let active = -1;
  let section = "home";
  let ssUserPaused = false;

  const pad = (n) => String(n).padStart(2, "0");

  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("on"), 2200);
  }

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.cssText = "position:fixed;opacity:0";
      document.body.append(ta);
      ta.select();
      let ok = false;
      try {
        ok = document.execCommand("copy");
      } catch {}
      ta.remove();
      if (!ok) {
        toast("couldn't reach the clipboard");
        return;
      }
    }
    toast("copied: " + text);
  }

  function setMode() {
    const m = $("#palette")?.open
      ? "COMMAND"
      : document.activeElement?.id === "shell-in"
        ? "INSERT"
        : "NORMAL";
    modeEl.textContent = m;
    modeEl.dataset.m = m;
  }
  function setPath() {
    const base = $("#" + section).dataset.path;
    pathEl.textContent = section === "projects" && active >= 0 ? base + "/" + names[active] : base;
  }

  // on a phone the open project has screens of its own under the list: bring that screen up instead
  const stackedMq = matchMedia("(max-width: 639px)");
  function reveal() {
    const stacked = stackedMq.matches;
    const r = (stacked ? $("#detail") : browser).getBoundingClientRect();
    if (r.top < -8 || r.top > innerHeight * 0.45) {
      const top = stacked ? 0 : parseFloat(getComputedStyle(root).scrollPaddingTop) || 60;
      scrollTo({ top: scrollY + r.top - top, behavior: behavior() });
    }
  }

  function select(i, opts = {}) {
    const n = projects.length;
    i = ((i % n) + n) % n;
    const changed = i !== active;
    active = i;
    projects.forEach((p, j) => p.classList.toggle("is-active", j === i));
    rows.forEach((r, j) => {
      if (j === i) r.setAttribute("aria-current", "true");
      else r.removeAttribute("aria-current");
    });
    posEl.textContent = pad(i + 1) + "/" + pad(n);
    $("#prev span").textContent = names[(i - 1 + n) % n];
    $("#next span").textContent = names[(i + 1) % n];

    const row = rows[i];
    if (rowsEl.scrollWidth > rowsEl.clientWidth) {
      const target = row.offsetLeft - (rowsEl.clientWidth - row.offsetWidth) / 2;
      rowsEl.scrollTo({ left: target, behavior: behavior() });
    }

    if (changed) {
      $("#detail").scrollTop = 0;
      $$("video").forEach((v) => {
        if (!projects[i].contains(v)) v.pause();
      });
      syncDemo();
    }
    if (opts.hash !== false) history.replaceState(null, "", "#" + projects[i].id);
    if (opts.reveal) reveal();
    if (opts.focus) {
      const h = $("h3", projects[i]);
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

  rows.forEach((r, i) =>
    r.addEventListener("click", (e) => {
      e.preventDefault();

      select(i, { reveal: true, focus: e.detail === 0 });
    }),
  );
  $$('a[href^="#p-"]')
    .filter((a) => !a.classList.contains("row"))
    .forEach((a) => {
      a.dataset.w = "1";
      a.addEventListener("click", (e) => {
        const i = projects.findIndex((p) => "#" + p.id === a.getAttribute("href"));
        if (i < 0) return;
        e.preventDefault();
        select(i, { reveal: true });
      });
    });
  $("#prev").addEventListener("click", () => select(active - 1, { reveal: true }));
  $("#next").addEventListener("click", () => select(active + 1, { reveal: true }));

  function fromHash(revealIt) {
    const i = projects.findIndex((p) => "#" + p.id === location.hash);
    if (i >= 0) {
      select(i, { hash: false, reveal: revealIt });
      return true;
    }
    return false;
  }
  addEventListener("hashchange", () => fromHash(true));

  function openActive() {
    const p = projects[active];
    if (p.dataset.open) window.open(p.dataset.open, "_blank", "noopener");
    else toast(names[active] + " is private until its first public release");
  }
  function yankActive() {
    const y = projects[active].dataset.yank;
    if (y) copy(y);
    else toast("nothing to copy for " + names[active]);
  }
  $$("[data-copy]").forEach((b) => b.addEventListener("click", () => copy(b.dataset.copy)));

  let demoVisible = false;
  function syncDemo() {
    if (!ssVideo || reduced()) return;
    const want =
      demoVisible && !ssUserPaused && projects[active] && projects[active].contains(ssVideo);
    if (want) ssVideo.play().catch(() => {});
    else ssVideo.pause();
  }
  if (ssVideo && !reduced()) {
    ssVideo.removeAttribute("controls");
    ssToggle.hidden = false;
    const label = () => {
      ssToggle.textContent = ssVideo.paused ? "play" : "pause";
    };
    const flip = () => {
      ssUserPaused = !ssVideo.paused;
      if (ssVideo.paused) ssVideo.play().catch(() => {});
      else ssVideo.pause();
    };
    ssToggle.addEventListener("click", flip);
    ssVideo.addEventListener("click", flip);
    ssVideo.addEventListener("play", label);
    ssVideo.addEventListener("pause", label);
    new IntersectionObserver(
      (es) => {
        demoVisible = es[0].isIntersecting;
        syncDemo();
      },
      { threshold: 0.25 },
    ).observe(ssVideo);
  }

  const heat = $("#heat");
  if (heat) {
    let s = 7;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < 84; i++) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      const cell = document.createElement("i");
      const v = (s >> 8) % 10;
      cell.dataset.l = v < 4 ? 0 : v < 6 ? 1 : v < 9 ? 2 : 3;
      frag.append(cell);
    }
    heat.append(frag);
  }

  const sections = $$("main > section, body > footer#contact");
  const navLinks = $$(".topnav a");
  let ticking = false;
  function spy() {
    ticking = false;
    let cur = sections[0].id;
    for (const s of sections) if (s.getBoundingClientRect().top <= innerHeight * 0.45) cur = s.id;
    if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4)
      cur = sections[sections.length - 1].id;
    if (cur !== section) {
      section = cur;
      const sec = $("#" + cur).dataset.sec || cur;
      navLinks.forEach((a) => {
        if (a.dataset.sec === sec) a.setAttribute("aria-current", "true");
        else a.removeAttribute("aria-current");
      });
      setPath();
    }
  }
  addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(spy);
      }
    },
    { passive: true },
  );
  addEventListener("resize", spy);

  function goSection(id) {
    const el = $("#" + id);
    if (id === "home") scrollTo({ top: 0, behavior: behavior() });
    else el.scrollIntoView({ behavior: behavior(), block: "start" });
  }

  const anyDialog = () => $("#palette")?.open || keysDlg.open;
  function showKeys() {
    $("#palette")?.close();
    if (!keysDlg.open) keysDlg.showModal();
  }
  [keysDlg].forEach((d) => {
    d.addEventListener("click", (e) => {
      if (e.target === d || e.target.closest("[data-close]")) d.close();
    });
    d.addEventListener("close", setMode);
  });

  function openPalette() {
    emit("palette");
  }
  function focusShell() {
    goSection("home");
    emit("shell");
  }

  $$("[data-act]").forEach((b) =>
    b.addEventListener("click", () => {
      const a = b.dataset.act;
      if (a === "palette") openPalette();
      else if (a === "help") showKeys();
      else if (a === "next") select(active < 0 ? 0 : active, { reveal: true, focus: true });
    }),
  );

  document.addEventListener("keydown", (e) => {
    const k = e.key;
    if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && k.toLowerCase() === "k") {
      if ($("#palette")?.open && e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      openPalette();
      return;
    }
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || anyDialog()) return;
    const t = e.target;
    if (t.closest && t.closest("input, textarea, select, video, [contenteditable]")) return;

    switch (k) {
      case "j":
        select(active + 1, { reveal: true });
        break;
      case "k":
        select(active - 1, { reveal: true });
        break;
      case "Enter":
        if (t.closest("a, button, summary")) return;
        select(active, { reveal: true, focus: true });
        break;
      case "o":
        openActive();
        break;
      case "y":
        yankActive();
        break;
      case "a":
      case "d":
      case "u":
        if (names[active] !== "psst" || section !== "projects") return;
        emit("mark", k);
        break;
      case "g":
        scrollTo({ top: 0, behavior: behavior() });
        break;
      case "G":
        scrollTo({ top: document.documentElement.scrollHeight, behavior: behavior() });
        break;
      case "1":
      case "2":
      case "3":
      case "4":
        goSection(["home", "projects", "about", "contact"][Number(k) - 1]);
        break;
      case "i":
        focusShell();
        break;
      case "/":
        openPalette();
        break;
      case "?":
        showKeys();
        break;
      default:
        return;
    }
    e.preventDefault();
  });

  listen("select", (name) => selectByName(name, { reveal: true }));
  listen("section", goSection);
  listen("keys", showKeys);
  listen("mode", setMode);
  listen("toast", toast);
  listen("copy", copy);

  if (!fromHash(false)) select(0, { hash: false });
  if (location.hash.startsWith("#p-")) requestAnimationFrame(reveal);

  section = "";
  spy();
  setMode();
})();
