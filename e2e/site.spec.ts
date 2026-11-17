import { expect, test, type Page } from "@playwright/test";

const NAMES = [
  "skill-shelf",
  "psst",
  "minimap",
  "help-wanted",
  "omt",
  "aloud-tts",
  "workout-app",
  "agent-extensions",
  "china-website",
  "jev",
];

const active = (page: Page) => page.locator(".proj.is-active");
const mode = (page: Page) => page.locator("#mode");
const shellOut = (page: Page) => page.locator("#shell-out");

async function run(page: Page, cmd: string) {
  await page.locator("#shell-in").fill(cmd);
  await page.locator("#shell-in").press("Enter");
}

async function open(page: Page, hash = "") {
  await page.goto("./" + hash);
  await page.waitForFunction(() => !document.querySelector("astro-island[ssr]"));
  await expect(mode(page)).toHaveText("NORMAL");
}

test.use({ reducedMotion: "reduce" });

test("local media resolves under the deployed base path", async ({ page, request }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await open(page);
  const urls = await page.locator("img, video").evaluateAll((elements) =>
    elements.flatMap((element) =>
      ["src", "poster"].flatMap((attribute) => {
        const value = element.getAttribute(attribute);
        return value ? [new URL(value, document.baseURI).href] : [];
      }),
    ),
  );
  for (const url of urls) {
    const response = await request.get(url);
    expect(response.ok(), url).toBeTruthy();
    expect(response.headers()["content-type"]).not.toContain("text/html");
  }
  expect(errors).toEqual([]);
});

test("a palette request survives delayed island hydration", async ({ page }) => {
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/CommandPalette.*.js", async (route) => {
    await gate;
    await route.continue();
  });
  try {
    await page.goto("./", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".row[aria-current]")).toHaveCount(1);
    await expect(page.locator('astro-island[component-url*="CommandPalette"]')).toHaveAttribute(
      "ssr",
    );
    await page.locator('.status [data-act="palette"]').click();
  } finally {
    release();
  }
  await expect(page.locator("#palette")).toHaveAttribute("open", "");
});

test.describe("project browser", () => {
  test("j and k move through every project and wrap", async ({ page, isMobile }) => {
    test.skip(isMobile, "keyboard flow");
    await open(page);
    await expect(active(page)).toHaveAttribute("data-name", "skill-shelf");
    await expect(page.locator("#pos")).toHaveText("01/10");
    for (const name of [...NAMES.slice(1), NAMES[0]]) {
      await page.keyboard.press("j");
      await expect(active(page)).toHaveAttribute("data-name", name);
    }
    await page.keyboard.press("k");
    await expect(active(page)).toHaveAttribute("data-name", "jev");
    await expect(page.locator("#pos")).toHaveText("10/10");
    await expect(page).toHaveURL(/#p-jev$/);
    await expect(page.locator(".row[aria-current]")).toHaveText(/jev/);
    await expect(page.locator("#prev span")).toHaveText("china-website");
    await expect(page.locator("#next span")).toHaveText("skill-shelf");
    await expect(page.locator("#path")).toHaveText("~/projects/jev");
  });

  test("a deep link opens that project", async ({ page }) => {
    await open(page, "#p-omt");
    await expect(active(page)).toHaveAttribute("data-name", "omt");
    await expect(page.locator("#pos")).toHaveText("05/10");
  });

  test("clicking a row and the pager select projects", async ({ page }) => {
    await open(page);
    await page.locator(".row", { hasText: "minimap" }).click();
    await expect(active(page)).toHaveAttribute("data-name", "minimap");
    await page.locator("#next").click();
    await expect(active(page)).toHaveAttribute("data-name", "help-wanted");
    await page.locator("#prev").click();
    await page.locator("#prev").click();
    await expect(active(page)).toHaveAttribute("data-name", "psst");
  });

  test("o and y act on the selected project", async ({ page, isMobile }) => {
    test.skip(isMobile, "keyboard flow");
    await open(page);
    await page.keyboard.press("y");
    await expect(page.locator("#toast")).toHaveText("copied: npx @simonteague6/skill-shelf");
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      "npx @simonteague6/skill-shelf",
    );
    await page.keyboard.press("j");
    await page.keyboard.press("o");
    await expect(page.locator("#toast")).toHaveText(
      "psst is private until its first public release",
    );
    await page.keyboard.press("y");
    await expect(page.locator("#toast")).toHaveText("nothing to copy for psst");
    const popup = page.waitForEvent("popup");
    await page.keyboard.press("j");
    await page.keyboard.press("o");
    expect((await popup).url()).toContain("github.com/RC-MiniMap/minimap");
  });

  test("copy buttons copy their command", async ({ page }) => {
    await open(page, "#p-help-wanted");
    await active(page).getByRole("button", { name: "copy" }).click();
    await expect(page.locator("#toast")).toHaveText("copied: pip install help-wanted");
  });
});

test.describe("psst mock", () => {
  test("cards take a, d, u and j, k", async ({ page, isMobile }) => {
    test.skip(isMobile, "keyboard flow");
    await open(page, "#p-psst");
    await page.locator("#projects").scrollIntoViewIfNeeded();
    const cards = page.locator("#psst-mock .card");
    await expect(cards.nth(0)).toHaveAttribute(
      "aria-label",
      "Software Engineering Intern, Example Co. · San Antonio, TX",
    );
    await expect(cards.nth(1)).toHaveAttribute(
      "aria-label",
      "Developer Tools Intern, Sample Labs · Remote, applied",
    );
    await page.keyboard.press("d");
    await expect(cards.nth(0)).toHaveAttribute("data-status", "dismissed");
    await page.keyboard.press("u");
    await expect(cards.nth(0)).toHaveAttribute("data-status", "");
    await cards.nth(0).focus();
    await page.keyboard.press("j");
    await expect(cards.nth(1)).toBeFocused();
    await expect(cards.nth(1)).toHaveAttribute("aria-pressed", "true");
    await expect(cards.nth(0)).toHaveAttribute("aria-pressed", "false");
    await page.keyboard.press("k");
    await page.keyboard.press("k");
    await expect(cards.nth(2)).toBeFocused();
    await page.locator('#psst-mock [data-k="a"]').click();
    await expect(cards.nth(2)).toHaveAttribute("data-status", "applied");
    await expect(active(page)).toHaveAttribute("data-name", "psst");
  });
});

test.describe("shell", () => {
  test("help, ls, cd, open, errors, clear", async ({ page }) => {
    await open(page);
    await run(page, "help");
    await expect(shellOut(page)).toContainText("cd <project>");
    await run(page, "ls");
    await expect(shellOut(page).locator(".out.ls").last().locator("a")).toHaveText(
      NAMES.map((n) => n + "/"),
    );
    await run(page, "cd omt");
    await expect(active(page)).toHaveAttribute("data-name", "omt");
    await run(page, "cd skillshelf");
    await expect(active(page)).toHaveAttribute("data-name", "skill-shelf");
    await run(page, "open psst");
    await expect(shellOut(page)).toContainText("psst is private until its first public release.");
    await run(page, "cd nowhere");
    await expect(shellOut(page).locator(".err").last()).toHaveText(
      "cd: no such project: nowhere. try ls.",
    );
    await run(page, "frobnicate <b>");
    await expect(shellOut(page).locator(".err").last()).toHaveText(
      "zsh: command not found: frobnicate. try help.",
    );
    await run(page, "echo <i>hi</i>");
    await expect(shellOut(page).locator(".out").last()).toHaveText("<i>hi</i>");
    await run(page, "sudo");
    await expect(shellOut(page)).toContainText(
      "simon is not in the sudoers file. Neither are you.",
    );
    await run(page, "clear");
    await expect(shellOut(page).locator("> *")).toHaveCount(0);
  });

  test("ls links select a project", async ({ page }) => {
    await open(page);
    await run(page, "ls");
    await shellOut(page).locator(".out.ls").last().getByRole("link", { name: "jev/" }).click();
    await expect(active(page)).toHaveAttribute("data-name", "jev");
  });

  test("the session keeps at most 14 entries", async ({ page }) => {
    await open(page);
    for (let i = 0; i < 12; i++) await run(page, "pwd");
    await expect(shellOut(page).locator("> *")).toHaveCount(14);
  });

  test("tab completes, arrows recall history, esc leaves", async ({ page, isMobile }) => {
    test.skip(isMobile, "keyboard flow");
    await open(page);
    await page.keyboard.press("i");
    await expect(page.locator("#shell-in")).toBeFocused();
    await expect(mode(page)).toHaveText("INSERT");
    await page.keyboard.type("cd sk");
    await page.keyboard.press("Tab");
    await expect(page.locator("#shell-in")).toHaveValue("cd skill-shelf");
    await page.locator("#shell-in").fill("cd a");
    await page.keyboard.press("Tab");
    await expect(page.locator("#shell-in")).toHaveValue("cd a");
    await page.locator("#shell-in").fill("wh");
    await page.keyboard.press("Tab");
    await expect(page.locator("#shell-in")).toHaveValue("whoami ");
    await run(page, "pwd");
    await run(page, "date");
    await page.keyboard.press("ArrowUp");
    await expect(page.locator("#shell-in")).toHaveValue("date");
    await page.keyboard.press("ArrowUp");
    await expect(page.locator("#shell-in")).toHaveValue("pwd");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await expect(page.locator("#shell-in")).toHaveValue("");
    await page.keyboard.press("Escape");
    await expect(mode(page)).toHaveText("NORMAL");
  });
});

test.describe("palette and keys", () => {
  test("palette filters, runs, and reports no match", async ({ page, isMobile }) => {
    test.skip(isMobile, "keyboard flow");
    await open(page);
    await page.keyboard.press("/");
    await expect(page.locator("#palette")).toHaveAttribute("open", "");
    await expect(mode(page)).toHaveText("COMMAND");
    await expect(page.locator("#pal-list li")).toHaveCount(4 + 10 + 8);
    await page.keyboard.type("hlpw");
    await expect(page.locator("#pal-list li").first().locator(".t")).toHaveText("help-wanted");
    await page.locator("#pal-input").fill("wor");
    await expect(page.locator("#pal-list li").first().locator(".t b")).toHaveText("wor");
    await page.keyboard.press("Enter");
    await expect(page.locator("#palette")).not.toHaveAttribute("open");
    await expect(active(page)).toHaveAttribute("data-name", "workout-app");
    await page.keyboard.press("Control+k");
    await page.keyboard.type("zzzz");
    await expect(page.locator("#pal-list .none")).toHaveText("nothing matches “zzzz”");
    await page.keyboard.press("Escape");
    await expect(mode(page)).toHaveText("NORMAL");
  });

  test("palette arrow keys and the fx toggle", async ({ page, isMobile }) => {
    test.skip(isMobile, "keyboard flow");
    await open(page);
    await page.keyboard.press("/");
    await page.keyboard.type("grain");
    await page.keyboard.press("Enter");
    await expect(page.locator("html")).toHaveClass(/no-fx/);
    await expect(page.locator("#toast")).toHaveText("grain and scanlines off");
    await page.keyboard.press("/");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await expect(page.locator("#pal-input")).toHaveAttribute("aria-activedescendant", "pal-2");
    await page.keyboard.press("Control+p");
    await expect(page.locator("#pal-2")).toHaveAttribute("aria-selected", "false");
    await expect(page.locator("#pal-1")).toHaveAttribute("aria-selected", "true");
  });

  test("? opens the keys panel and esc closes it", async ({ page, isMobile }) => {
    test.skip(isMobile, "keyboard flow");
    await open(page);
    await page.keyboard.press("?");
    await expect(page.locator("#keys")).toHaveAttribute("open", "");
    await page.keyboard.press("Escape");
    await expect(page.locator("#keys")).not.toHaveAttribute("open");
  });

  test("status bar buttons open the dialogs", async ({ page }) => {
    await open(page);
    await page.locator('.status [data-act="help"]').click();
    await expect(page.locator("#keys")).toHaveAttribute("open", "");
    await page.locator("#keys [data-close]").click();
    await page.locator('.status [data-act="palette"]').click();
    await expect(page.locator("#palette")).toHaveAttribute("open", "");
  });
});

test.describe("sections", () => {
  test("number keys jump and the nav tracks the section", async ({ page, isMobile }) => {
    test.skip(isMobile, "keyboard flow");
    await open(page);
    await expect(page.locator(".topnav a[aria-current]")).toHaveAttribute("data-sec", "home");
    await page.keyboard.press("3");
    await expect(page.locator(".topnav a[aria-current]")).toHaveAttribute("data-sec", "about");
    await expect(page.locator("#path")).toHaveText("~/about");
    await page.keyboard.press("G");
    await expect(page.locator(".topnav a[aria-current]")).toHaveAttribute("data-sec", "contact");
    await page.keyboard.press("g");
    await expect(page.locator("#path")).toHaveText("~");
  });

  test("the second about screen keeps about current", async ({ page }) => {
    await open(page);
    await page.evaluate(() => document.querySelector("#about-more")!.scrollIntoView());
    await expect(page.locator("#path")).toHaveText("~/about");
    await expect(page.locator(".topnav a[aria-current]")).toHaveAttribute("data-sec", "about");
  });
});

test.describe("phone project browser", () => {
  test("tapping a row brings the open project into view", async ({ page, isMobile }) => {
    test.skip(!isMobile, "the stacked phone layout");
    await open(page);
    await page.locator("#rows a").nth(3).click();
    await expect(active(page)).toHaveAttribute("data-name", "help-wanted");
    const detailTop = () =>
      page.evaluate(() => Math.abs(document.querySelector("#detail")!.getBoundingClientRect().top));
    await expect.poll(detailTop).toBeLessThan(4);
  });
});

test.describe("without javascript", () => {
  test.use({ javaScriptEnabled: false });
  test("every project is readable", async ({ page }) => {
    await page.goto("./");
    await expect(page.locator(".proj")).toHaveCount(10);
    for (const p of await page.locator(".proj").all()) await expect(p).toBeVisible();
    await expect(page.locator(".pager")).toBeHidden();
  });
});

test.describe("visual", () => {
  test("home", async ({ page }) => {
    await open(page);
    await expect(page).toHaveScreenshot("home.png");
  });

  test("about and contact", async ({ page }) => {
    await open(page);
    // the fixed bars would land at a different spot in each capture of a section taller than the screen
    await page.addStyleTag({ content: ".topbar, .status { visibility: hidden !important; }" });
    for (const id of ["about", "about-more", "contact"]) {
      await expect(page.locator("#" + id)).toHaveScreenshot(id + ".png");
    }
  });

  for (const name of NAMES) {
    test("project " + name, async ({ page }) => {
      await open(page, "#p-" + name);
      await page.addStyleTag({
        content:
          ".topbar, .status, .skip { visibility: hidden !important; } .pane-list, .pane-list nav, .pane-foot { position: static !important; }",
      });
      await expect(page.locator("#browser")).toHaveScreenshot("project-" + name + ".png");
    });
  }

  test("palette and keys", async ({ page }) => {
    await open(page);
    await page.locator('.status [data-act="palette"]').click();
    await expect(page.locator("#palette")).toHaveScreenshot("palette.png");
    await page.keyboard.press("Escape");
    await page.locator('.status [data-act="help"]').click();
    await expect(page.locator("#keys")).toHaveScreenshot("keys.png");
  });
});
