<script>
  import { onMount, tick } from 'svelte';
  import { createShell } from '../lib/shell.js';
  import { emit, listen } from '../lib/actions.js';

  let output = $state([]);
  let input = $state('');
  let field;
  let body;
  let engine;
  const history = [];
  let historyAt = 0;
  const names = ['skill-shelf', 'psst', 'minimap', 'help-wanted', 'omt', 'aloud-tts', 'workout-app', 'agent-extensions', 'china-website', 'jev'];
  let initial = $state(4);

  function clear() {
    initial = 0;
    output = [];
  }

  function submit(event) {
    event.preventDefault();
    const value = input;
    if (value.trim()) history.push(value);
    historyAt = history.length;
    input = '';
    output.push(`<p class="ln"><span class="pr">›</span> <span class="cmd">${engine.esc(value)}</span></p>`);
    const result = engine.run(value);
    if (result) output.push(result);
    while (output.length + initial > 14) {
      if (initial) initial--;
      else output.shift();
    }
    tick().then(() => body.scrollTo({ top: body.scrollHeight }));
  }

  function keydown(event) {
    if (event.key === 'Escape') { field.blur(); return; }
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      if (!history.length) return;
      event.preventDefault();
      historyAt = Math.max(0, Math.min(history.length, historyAt + (event.key === 'ArrowUp' ? -1 : 1)));
      input = history[historyAt] || '';
    }
    if (event.key === 'Tab' && input.trim()) {
      const parts = input.split(/\s+/);
      const last = parts.at(-1).toLowerCase();
      const pool = parts.length === 1 ? ['help', 'ls', 'cd', 'open', 'whoami', 'about', 'contact', 'keys', 'clear'] : names;
      const hits = last ? pool.filter(name => name.startsWith(last)) : [];
      if (!hits.length) return;
      event.preventDefault();
      let prefix = hits[0];
      for (const hit of hits) while (!hit.startsWith(prefix)) prefix = prefix.slice(0, -1);
      parts[parts.length - 1] = prefix;
      input = parts.join(' ') + (hits.length === 1 && parts.length === 1 ? ' ' : '');
    }
  }

  function click(event) {
    const link = event.target.closest('a[href^="#p-"]');
    if (link) {
      event.preventDefault();
      emit('select', link.getAttribute('href').slice(3));
    } else if (!event.target.closest('a, input') && !String(getSelection())) {
      field.focus({ preventScroll: true });
    }
  }

  onMount(() => {
    engine = createShell(clear);
    const focus = () => field.focus({ preventScroll: true });
    const unlisten = listen('shell', focus);
    let stopped = false;
    let disposed = false;
    const stop = () => stopped = true;
    const timers = new Map();
    const wait = ms => new Promise(resolve => {
      const timer = setTimeout(() => { timers.delete(timer); resolve(); }, ms);
      timers.set(timer, resolve);
    });
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      body.classList.add('intro');
      addEventListener('keydown', stop, { once: true });
      addEventListener('pointerdown', stop, { once: true });
      (async () => {
        await tick();
        await wait(350);
        for (const step of body.querySelectorAll('.step')) {
          if (disposed) return;
          const typed = step.querySelector('[data-type]');
          if (typed && !stopped) {
            const full = typed.textContent;
            typed.textContent = '';
            typed.classList.add('type-caret');
            step.classList.add('on');
            await wait(260);
            for (const char of full) {
              if (stopped || disposed) break;
              typed.textContent += char;
              await wait(38 + Math.random() * 50);
            }
            typed.textContent = full;
            if (!stopped) await wait(220);
            typed.classList.remove('type-caret');
          } else {
            step.classList.add('on');
            if (!stopped) await wait(140);
          }
        }
        body.classList.remove('intro');
      })();
    }
    return () => {
      disposed = true;
      for (const [timer, resolve] of timers) { clearTimeout(timer); resolve(); }
      removeEventListener('keydown', stop);
      removeEventListener('pointerdown', stop);
      unlisten();
    };
  });
</script>

<div class="term hero-term" id="shell">
  <div class="term-bar" aria-hidden="true"><i></i><i></i><i></i><span>~</span></div>
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div class="term-body" id="shell-body" bind:this={body} onclick={click}>
    <div id="shell-out" role="log" aria-label="Terminal output">
      {#if initial >= 4}
        <p class="ln step"><span class="pr">›</span> <span class="cmd" data-type>whoami</span></p>
      {/if}
      {#if initial >= 3}
        <div class="out step">
          <p>simon teague</p>
          <p class="dim">cs sophomore, utsa, class of 2029</p>
        </div>
      {/if}
      {#if initial >= 2}
        <p class="ln step"><span class="pr">›</span> <span class="cmd" data-type>ls projects/</span></p>
      {/if}
      {#if initial >= 1}
        <div class="out step ls">
          {#each names as name}<a href={'#p-' + name}>{name}/</a>{/each}
        </div>
      {/if}
      {#each output as entry}{@html entry}{/each}
    </div>
    <form class="ln shell-form step" id="shell-form" autocomplete="off" onsubmit={submit}>
      <label for="shell-in"><span class="pr" aria-hidden="true">›</span><span class="vh">Type a command, for example help</span></label>
      <input id="shell-in" type="text" spellcheck="false" autocapitalize="off" autocorrect="off"
        placeholder="type help, or press i" enterkeyhint="go" bind:this={field} bind:value={input}
        onkeydown={keydown} onfocus={() => emit('mode')} onblur={() => emit('mode')}>
    </form>
  </div>
</div>
