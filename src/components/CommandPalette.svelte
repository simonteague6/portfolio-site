<script>
  import { onMount, tick } from 'svelte';
  import { emit, listen } from '../lib/actions.js';

  let dialog;
  let input;
  let query = $state('');
  let at = $state(0);
  let items = $state([]);
  const normalized = $derived(query.trim().toLowerCase());
  const shown = $derived(normalized
    ? items.map(item => ({ item, score: score(item, normalized) })).filter(hit => hit.score > 0)
      .sort((a, b) => b.score - a.score).map(hit => hit.item)
    : items);

  function score(item, q) {
    const title = item.t.toLowerCase();
    const index = title.indexOf(q);
    if (index >= 0) return 100 - index;
    if ((item.k + ' ' + (item.kw || '') + ' ' + item.h).toLowerCase().includes(q)) return 40;
    let i = 0;
    for (const char of title) if (char === q[i]) i++;
    return i === q.length ? 10 : 0;
  }

  async function move(delta) {
    if (!shown.length) return;
    at = (at + delta + shown.length) % shown.length;
    await tick();
    document.getElementById('pal-' + at)?.scrollIntoView({ block: 'nearest' });
  }

  function run(index) {
    const item = shown[index];
    if (!item) return;
    dialog.close();
    item.run();
  }

  async function open() {
    document.getElementById('keys').close();
    if (dialog.open) { dialog.close(); return; }
    query = '';
    at = 0;
    await tick();
    dialog.showModal();
    input.focus();
    document.getElementById('pal-list').scrollTop = 0;
    emit('mode');
  }

  function keydown(event) {
    const ctrl = event.ctrlKey && !event.metaKey;
    if (event.key === 'ArrowDown' || (ctrl && ['n', 'j'].includes(event.key))) {
      event.preventDefault(); move(1);
    } else if (event.key === 'ArrowUp' || (ctrl && ['p', 'k'].includes(event.key))) {
      event.preventDefault(); move(-1);
    } else if (event.key === 'Enter') {
      event.preventDefault(); run(at);
    }
  }

  onMount(() => {
    const sections = Array.from(document.querySelectorAll('main > section'));
    const projects = Array.from(document.querySelectorAll('.proj'));
    items = [
      ...sections.map((section, i) => ({ k: 'go', t: section.id, h: String(i + 1), run: () => emit('section', section.id) })),
      ...projects.map(project => ({
        k: 'project', t: project.dataset.name, h: project.querySelector('.tagline').textContent.trim(),
        kw: project.querySelector('h3').textContent + ' ' + project.querySelector('.meta').textContent,
        run: () => {
          emit('select', project.dataset.name);
          const heading = project.querySelector('h3');
          heading.tabIndex = -1;
          heading.focus({ preventScroll: true });
        },
      })),
      ...[
        ['github.com/simonteague6', 'profile', 'https://github.com/simonteague6'],
        ['npmjs.com/~simonteague6', 'packages', 'https://www.npmjs.com/~simonteague6'],
        ['china.simonteague.xyz', 'live site', 'https://china.simonteague.xyz'],
      ].map(([t, h, url]) => ({ k: 'open', t, h, run: () => window.open(url, '_blank', 'noopener') })),
      ...[
        ['npx @simonteague6/skill-shelf', 'run skill-shelf'],
        ['pip install help-wanted', 'install help wanted'],
      ].map(([t, h]) => ({ k: 'copy', t, h, run: () => emit('copy', t) })),
      { k: 'toggle', t: 'grain and scanlines', h: 'on / off', kw: 'effects fx texture', run: () => {
        const off = document.documentElement.classList.toggle('no-fx');
        emit('toast', 'grain and scanlines ' + (off ? 'off' : 'on'));
      } },
      { k: 'show', t: 'keys', h: '?', kw: 'keyboard shortcuts help', run: () => emit('keys') },
      { k: 'focus', t: 'shell', h: 'i', kw: 'terminal prompt type', run: () => { emit('section', 'home'); emit('shell'); } },
    ];
    return listen('palette', open);
  });
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
<dialog class="dlg palette" id="palette" aria-label="Command palette" bind:this={dialog}
  onclose={() => emit('mode')} onclick={event => { if (event.target === dialog) dialog.close(); }}>
  <div class="pal-in">
    <span class="pr" aria-hidden="true">/</span>
    <input id="pal-input" type="text" role="combobox" aria-expanded="true" aria-controls="pal-list"
      aria-autocomplete="list" aria-label="Search projects, sections and commands"
      aria-activedescendant={shown.length ? 'pal-' + at : undefined}
      placeholder="project, section or command" spellcheck="false" autocomplete="off" autocapitalize="off"
      bind:this={input} bind:value={query} oninput={() => at = 0} onkeydown={keydown}>
    <button type="button" class="esc" data-close onclick={() => dialog.close()}><kbd>esc</kbd></button>
  </div>
  <ul id="pal-list" role="listbox" aria-label="Results">
    {#each shown as item, i}
      {@const match = normalized ? item.t.toLowerCase().indexOf(normalized) : -1}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <li role="option" id={'pal-' + i} aria-selected={i === at} onclick={() => run(i)} onpointermove={() => at = i}>
        <span class="k">{item.k}</span><span class="t">{#if match < 0}{item.t}{:else}{item.t.slice(0, match)}<b>{item.t.slice(match, match + normalized.length)}</b>{item.t.slice(match + normalized.length)}{/if}</span><span class="h">{item.h}</span>
      </li>
    {:else}
      <li class="none" role="option" aria-disabled="true" aria-selected="false">nothing matches “{normalized}”</li>
    {/each}
  </ul>
  <p class="dlg-foot" aria-hidden="true"><span><kbd>↑</kbd><kbd>↓</kbd> move</span><span><kbd>enter</kbd> go</span></p>
</dialog>
