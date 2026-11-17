<img src="public/assets/favicon.svg" width="48" height="48" alt="">

# Simon Teague · portfolio

My personal portfolio, built with Astro, Svelte 5 islands and Vite+. The build produces a static site with locally hosted fonts and media, no analytics, and no cookies.

![Portfolio social preview](public/assets/og.png)

## Run locally

Install [Vite+](https://viteplus.dev/guide/), then run:

```sh
vp install
vp run dev
```

Open `http://localhost:4321/portfolio-site/`.

Astro owns the build pipeline. Use `vp run build`, not `vp build`, to run it through Vite+.

```sh
vp check
vp run typecheck
vp run build
vp run preview
```

## Project structure

```text
src/pages/index.astro              Page content, project details and metadata
src/components/Shell.svelte        Terminal input, history and output
src/components/CommandPalette.svelte
                                  Search, keyboard navigation and commands
src/components/PsstDemo.svelte     Interactive placeholder job cards
src/lib/page.js                    Project browser, shortcuts, scroll and media
src/lib/shell.js                   Terminal commands
src/lib/actions.js                 Events between islands and page controls
src/styles/global.css             Layout, typography and responsive styles
public/assets/                    Images, videos, favicon and fonts
e2e/                              Behavior tests and original-site screenshots
```

Edit `src/pages/index.astro` to update projects and personal information. Asset links use Astro's base URL so media works on the GitHub Pages repository subpath.

Astro renders the page and all island content as HTML. Without JavaScript, every project remains readable. Svelte hydrates only the interactive shell, palette and job-card demo. Page-wide shortcuts coordinate these islands through `portfolio:*` DOM events.

## Interactions

- Use the project list, previous/next buttons, or `j` / `k` to browse.
- Press `/` or `⌘K` / `Ctrl+K` to open the command palette.
- Type `help` in the homepage terminal.
- Press `?` to see all shortcuts.

The layout adapts to mobile screens and respects reduced-motion preferences.

## Tests

```sh
vp exec playwright install chromium
vp run build
vp run e2e
```

The desktop and mobile tests cover navigation, deep links, clipboard actions, shell commands, history, completion, dialogs, job-card controls and the no-JavaScript page. Visual tests compare against screenshots captured from the original static site. Project screenshots hide fixed page chrome to keep tall mobile captures stable.

CI runs behavior tests on Linux. Run visual tests locally with the pinned Playwright browser because rendering can vary by operating system.

## Deployment

Pushes to `main` run checks, build the site and deploy `dist/` through GitHub Actions to [GitHub Pages](https://simonteague6.github.io/portfolio-site/). Pull requests run the same checks without deploying.

Only `dist/` is published. Research notes, credentials, source files and dependencies are not part of the deployment artifact.
