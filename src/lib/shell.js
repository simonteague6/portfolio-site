import { emit } from "./actions.js";

export function createShell(clear) {
  const projects = Array.from(document.querySelectorAll(".proj"));
  const names = projects.map((p) => p.dataset.name);
  const goSection = (id) => emit("section", id);
  const selectProject = (name) => emit("select", name);
  const showKeys = () => emit("keys");
  const esc = (s) =>
    s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const alias = {
    "ollama-model-tester": "omt",
    aloud: "aloud-tts",
    workout: "workout-app",
    china: "china-website",
    agents: "agent-extensions",
    "jev-scam-detector": "jev",
    helpwanted: "help-wanted",
    skillshelf: "skill-shelf",
  };
  const resolve = (arg) => {
    const a = (arg || "")
      .toLowerCase()
      .replace(/^(~\/)?(projects\/)?/, "")
      .replace(/\/$/, "");
    return names.includes(a) ? a : alias[a] || null;
  };
  const lsHtml = () =>
    '<div class="out ls">' + names.map((n) => `<a href="#p-${n}">${n}/</a>`).join("") + "</div>";
  const HELP = [
    ["ls", "list projects"],
    ["cd <project>", "read one, e.g. cd psst"],
    ["open <project>", "open its repo or live site"],
    ["whoami", "the short version"],
    ["about, contact", "jump to a section"],
    ["keys", "keyboard shortcuts"],
    ["clear", "tidy up"],
  ];

  function run(raw) {
    const line = raw.trim();
    const [cmd, ...rest] = line.split(/\s+/);
    const arg = rest.join(" ");
    const c = cmd.toLowerCase();
    const text = (s, cls = "") => `<div class="out ${cls}"><p>${s}</p></div>`;

    switch (c) {
      case "":
        return "";
      case "help":
      case "man":
        return (
          '<div class="out">' +
          HELP.map(
            ([a, b]) =>
              `<p>${esc(a.padEnd(16)).replace(/ /g, "&nbsp;")}<span class="dim">${b}</span></p>`,
          ).join("") +
          "</div>"
        );
      case "ls":
      case "ll":
      case "la":
      case "tree":
        return lsHtml();
      case "whoami":
        return '<div class="out"><p>simon teague</p><p class="dim">cs sophomore, utsa, class of 2029</p><p class="dim">project advisor, rowdy creators (acm at utsa)</p></div>';
      case "pwd":
        return text("~");
      case "cd":
      case "cat":
      case "less":
      case "show": {
        if (c === "cd" && (!arg || arg === "~" || arg === "..")) {
          goSection("home");
          return "";
        }
        const a = arg.toLowerCase().replace(/\.md$/, "");
        if (a === "about" || a === "contact" || a === "projects" || a === "projects/") {
          goSection(a.replace("/", ""));
          return "";
        }
        const n = resolve(arg);
        if (!n)
          return text(`${esc(c)}: no such project: ${esc(arg || "(nothing)")}. try ls.`, "err");
        selectProject(n, { reveal: true });
        return "";
      }
      case "open":
      case "o": {
        const n = resolve(arg);
        if (!n) return text(`open: no such project: ${esc(arg || "(nothing)")}. try ls.`, "err");
        const p = projects[names.indexOf(n)];
        if (!p.dataset.open) return text(`${n} is private until its first public release.`);
        window.open(p.dataset.open, "_blank", "noopener");
        return text(`opening ${esc(p.dataset.open.replace(/^https?:\/\//, ""))}`, "dim");
      }
      case "about":
      case "contact":
      case "projects":
      case "home":
        goSection(c);
        return "";
      case "keys":
      case "?":
        showKeys();
        return "";
      case "clear":
        clear();
        return "";
      case "psst":
        selectProject("psst", { reveal: true });
        return text("Psst. Found a few openings.");
      case "npx":
      case "npm":
      case "pip":
      case "uv":
      case "go":
      case "brew":
        return text("This prompt is a web page. That one needs a real terminal.");
      case "skill-shelf":
      case "omt":
      case "help-wanted":
        selectProject(c, { reveal: true });
        return text("Not installed in this browser. Here is the page for it instead.", "dim");
      case "vim":
      case "nvim":
      case "vi":
        return text("You are already in normal mode. Press esc, then j.");
      case "sudo":
        return text("simon is not in the sudoers file. Neither are you.");
      case "exit":
      case "quit":
      case "q":
      case ":q":
      case ":wq":
        document.getElementById("shell-in")?.blur();
        return text("It is a browser tab. It closes the usual way.");
      case "echo":
        return text(esc(arg));
      case "date":
        return text(esc(new Date().toString()));
      default:
        return text(`zsh: command not found: ${esc(cmd)}. try help.`, "err");
    }
  }

  return { run, names, esc };
}
