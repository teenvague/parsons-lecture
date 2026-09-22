/* Are.na is the content editor. Reload the page to pick up channel changes. */
(function (root) {
  'use strict';
  const config = {
    channel: 'cd-lecture-images',
    speed: 70,
    repeatMediumImages: true,
    seed: 1
  };
  const compositions = [
    { alignment: 'base', side: 'left', edge: 'left', size: 'wide', space: 'normal' },
    { alignment: 'top', side: 'right', edge: 'right', size: 'narrow', space: 'long' },
    { alignment: 'base', side: 'left', edge: 'both', size: 'narrow', space: 'normal' },
    { alignment: 'top', side: 'right', edge: 'right', size: 'wide', space: 'long' },
    { alignment: 'base', side: 'right', edge: 'both', size: 'wide', space: 'normal' },
    { alignment: 'top', side: 'left', edge: 'left', size: 'narrow', space: 'normal' },
    { alignment: 'base', side: 'left', edge: 'inset', size: 'wide', space: 'long' },
    { alignment: 'top', side: 'right', edge: 'right', size: 'narrow', space: 'normal' }
  ];

  const normalize = value => value.trim().toLowerCase().replace(/\s+/gu, ' ');

  function imageFromBlock(block) {
    if (block.type !== 'Image' || !block.image) return null;
    const title = block.title || '';
    const fields = title.split('|').map(value => value.trim());
    let type, caption, family = '', character = '', tone = '';
    const opening = /^A\s+opening$/iu.test(fields[0]);
    if (opening) fields[0] = 'A';
    if (fields.length >= 5 && /^[ABC]$/iu.test(fields[0])) {
      [type, family, character, tone] = fields;
      caption = fields.slice(4).join(' | ');
      family = normalize(family);
      character = normalize(character);
      tone = normalize(tone);
      if (!family || !character || !tone) return null;
    } else {
      const match = title.match(/^\s*([ABC])\s*[—–:-]\s*(.+)$/iu);
      if (!match) return null;
      [, type, caption] = match;
      // Legacy numbered titles such as Sketchbook1 share a temporary family.
      family = normalize(caption.replace(/\.(png|jpe?g|webp|gif)$/iu, '').replace(/[\s_-]*\d+$/u, ''));
    }
    type = type.toUpperCase();
    caption = caption.trim();
    const image = block.image;
    const src = type === 'C' ? image.src : (image.large?.src || image.src);
    if (!caption || !src || !(image.width > 0 && image.height > 0)) return null;
    return {
      id: block.id, type, opening, caption, family, character, tone, src,
      alt: image.alt_text || caption, width: image.width, height: image.height
    };
  }

  function randomSource(seed) {
    let state = 2166136261;
    for (const char of String(seed)) state = Math.imul(state ^ char.charCodeAt(0), 16777619);
    return () => {
      state += 0x6D2B79F5;
      let value = Math.imul(state ^ state >>> 15, 1 | state);
      value ^= value + Math.imul(value ^ value >>> 7, 61 | value);
      return ((value ^ value >>> 14) >>> 0) / 4294967296;
    };
  }

  function shuffle(items, random) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function contrast(a, b) {
    const different = key => a[key] && b[key] && a[key] !== b[key];
    const ratio = Math.abs(Math.log((a.width / a.height) / (b.width / b.height)));
    return (different('family') ? 100 : 0) + (different('character') ? 10 : 0)
      + (different('tone') ? 5 : 0) + Math.min(ratio, 3);
  }

  // Minimize family proximity along the finite sequence, then visual repetition.
  // This is a bounded local search, not a claim of a global mathematical optimum.
  function sequence(rows, random, opener) {
    const order = shuffle(rows.filter(row => row !== opener), random);
    if (opener) order.unshift(opener);
    const count = order.length;
    const firstMovable = opener ? 1 : 0;
    const movableCount = count - firstMovable;
    const better = (a, b) => a[0] < b[0] - 1e-8 || (Math.abs(a[0] - b[0]) < 1e-8 && a[1] < b[1] - 1e-8);
    function cost(a, b, distance) {
      let family = 0, similarity = a.type === b.type ? 3 : 0;
      for (const x of a.images) for (const y of b.images) {
        if (x.id === y.id || (x.family && x.family === y.family)) family++;
        if (x.character && x.character === y.character) similarity += 2;
        if (x.tone && x.tone === y.tone) similarity++;
      }
      return [family / distance ** 2, distance === 1 ? similarity : 0];
    }
    function affected(i, j, swapped) {
      const total = [0, 0];
      const at = k => order[swapped ? (k === i ? j : k === j ? i : k) : k];
      for (const p of [i, j]) for (let q = 0; q < count; q++) {
        if (q === p || (p === j && q === i)) continue;
        const distance = Math.abs(p - q);
        const score = cost(at(p), at(q), distance);
        total[0] += score[0]; total[1] += score[1];
      }
      return total;
    }
    // A fixed seed and ID ordering make upload/reordering irrelevant.
    for (let pass = 0; pass < 4 && movableCount > 1; pass++) {
      let improved = false;
      const attempts = Math.min(count * count, 2000);
      for (let n = 0; n < attempts; n++) {
        const i = firstMovable + Math.floor(random() * movableCount);
        const j = firstMovable + Math.floor(random() * movableCount);
        if (i !== j && better(affected(i, j, true), affected(i, j, false))) {
          [order[i], order[j]] = [order[j], order[i]];
          improved = true;
        }
      }
      if (!improved) break;
    }
    return order;
  }

  function compose(blocks, repeatMediumImages = false, seed = 1) {
    const random = randomSource(seed);
    const items = blocks.map(imageFromBlock).filter(Boolean).sort((a, b) => a.id - b.id);
    const medium = shuffle(items.filter(item => item.type === 'B'), random);
    const small = shuffle(items.filter(item => item.type === 'C'), random);
    const uses = new Map(medium.map(item => [item.id, 0]));
    const rows = items.filter(item => item.type === 'A').map(item => ({ type: 'A', images: [item] }));
    for (const graphic of small) {
      const candidates = medium.filter(item => repeatMediumImages || uses.get(item.id) === 0);
      if (!candidates.length) continue;
      // Balance repeat counts before choosing the strongest contrasting partner.
      candidates.sort((a, b) => uses.get(a.id) - uses.get(b.id) || contrast(b, graphic) - contrast(a, graphic));
      const partner = candidates[0];
      uses.set(partner.id, uses.get(partner.id) + 1);
      rows.push({ type: 'pair', images: [partner, graphic] });
    }
    // With multiple marked openers, the lowest block ID wins deterministically.
    // Otherwise choose a stable A so the page always opens with major work.
    const opener = rows.find(row => row.type === 'A' && row.images[0].opening)
      || rows.find(row => row.type === 'A');
    const ordered = sequence(rows, random, opener);
    let pairIndex = 0;
    return ordered.map(row => row.type === 'A' ? row : {
      ...row, variant: pairIndex % 3, ...compositions[pairIndex++ % compositions.length]
    });
  }

  async function fetchBlocks(channel, fetcher) {
    const blocks = [], seen = new Set();
    let page = 1;
    while (page !== null) {
      if (seen.has(page)) throw Error('Are.na returned a repeated page.');
      seen.add(page);
      const url = `https://api.are.na/v3/channels/${encodeURIComponent(channel)}/contents?per=100&sort=position_asc&page=${page}`;
      const response = await fetcher(url, { cache: 'no-store', signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw Error(`Are.na returned ${response.status}.`);
      const body = await response.json();
      if (!Array.isArray(body.data) || !body.meta) throw Error('Unexpected Are.na response.');
      blocks.push(...body.data);
      page = body.meta.next_page ?? null;
    }
    return blocks;
  }

  async function load(options = config, fetcher = fetch) {
    let blocks;
    try {
      blocks = await fetchBlocks(options.channel, fetcher);
    } catch (error) {
      console.warn('Are.na unavailable; loading the saved channel snapshot.', error);
      const response = await fetcher('arena-snapshot.json', { cache: 'no-store' });
      if (!response.ok) throw Error('Could not load the Are.na channel or its saved copy. Reload to try again.');
      blocks = await response.json();
    }
    const rows = compose(blocks, options.repeatMediumImages, options.seed);
    if (!rows.length) throw Error('Add A images or a complete B/C pair to the Are.na channel.');
    return { ...options, rows };
  }

  const api = { imageFromBlock, compose, fetchBlocks, load };
  if (typeof module !== 'undefined') module.exports = api;
  else { root.LECTURE = config; root.LectureContent = api; }
})(typeof window !== 'undefined' ? window : this);
