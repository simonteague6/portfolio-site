<script>
  import { onMount } from 'svelte';
  import { listen } from '../lib/actions.js';

  let selected = $state(0);
  let cards = $state([
    { role: 'Software Engineering Intern', company: 'Example Co. · San Antonio, TX', days: 2, status: '' },
    { role: 'Developer Tools Intern', company: 'Sample Labs · Remote', days: 4, status: 'applied' },
    { role: 'Backend Engineering Intern', company: 'Bramble Corp · Austin, TX', days: 6, status: 'dismissed' },
  ]);
  let buttons = [];

  function mark(key) {
    cards[selected].status = key === 'a' ? 'applied' : key === 'd' ? 'dismissed' : '';
  }

  function keydown(event) {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.key === 'j' || event.key === 'ArrowDown') selected = (selected + 1) % cards.length;
    else if (event.key === 'k' || event.key === 'ArrowUp') selected = (selected + cards.length - 1) % cards.length;
    else if (event.key === 'Escape') document.activeElement.blur();
    else return;
    if (event.key !== 'Escape') buttons[selected].focus();
    event.preventDefault();
    event.stopPropagation();
  }

  onMount(() => {
    return listen('mark', mark);
  });
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div class="term-body mock-psst" id="psst-mock" role="group" aria-label="Illustrative psst interface with three placeholder listings" onkeydown={keydown}>
  <p class="mp-head"><b>psst</b><span>profile: summer-2027</span><span>showing 3</span></p>
  {#each cards as card, i}
    <button type="button" class="card m-nolift" class:is-sel={selected === i} data-status={card.status}
      aria-pressed={selected === i} aria-label={card.role + ', ' + card.company + (card.status ? ', ' + card.status : '')}
      bind:this={buttons[i]} onclick={() => selected = i}>
      <span class="lbl"></span>
      <span class="role">{card.role}</span>
      <span class="co">{card.company}</span>
      <span class="when">Summer 2027 · added to source {card.days} days ago</span>
    </button>
  {/each}
  <p class="mp-keys">
    <button type="button" data-k="a" onclick={() => mark('a')}><kbd>a</kbd> applied</button>
    <button type="button" data-k="d" onclick={() => mark('d')}><kbd>d</kbd> dismiss</button>
    <button type="button" data-k="u" onclick={() => mark('u')}><kbd>u</kbd> undo</button>
  </p>
</div>
