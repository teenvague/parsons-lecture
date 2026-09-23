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
    const rawTitle = block.title || '';
    const opening = /^\s*A\s+opening(?=\s*(?:[|—–:-]|$))/iu.test(rawTitle);
    // Normalize the marker before parsing either supported title format.
    const title = opening ? rawTitle.replace(/^(\s*A)\s+opening/iu, '$1') : rawTitle;
    const fields = title.split('|').map(value => value.trim());
    let type, caption, family = '', character = '', tone = '';
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

  // Establish spatial rhythm without dropping images: separate paired rows,
  // and use pairs and opposite-orientation As to break up dominant orientations.
  function rhythm(rows, random, opener) {
    const buckets = { H: [], V: [], S: [], pair: [] };
    for (const row of shuffle(rows.filter(row => row !== opener), random)) {
      const image = row.images[0];
      const key = row.type === 'pair' ? 'pair' : image.width > image.height ? 'H' : image.width < image.height ? 'V' : 'S';
      buckets[key].push(row);
    }
    const majorCount = buckets.H.length + buckets.V.length + buckets.S.length + (opener ? 1 : 0);
    if (buckets.pair.length >= majorCount) {
      const majors = shuffle([...buckets.H, ...buckets.V, ...buckets.S], random);
      if (opener) majors.unshift(opener);
      if (!majors.length) return buckets.pair;
      const gaps = Array.from({ length: majors.length }, () => []);
      buckets.pair.forEach((row,i) => gaps[Math.floor((i+.5)*majors.length/buckets.pair.length)].push(row));
      return majors.flatMap((row,i) => [row,...gaps[i]]);
    }
    const order = opener ? [opener] : [];
    let previous = opener ? (opener.images[0].width > opener.images[0].height ? 'H' : opener.images[0].width < opener.images[0].height ? 'V' : 'S') : null;
    while (Object.values(buckets).some(bucket => bucket.length)) {
      const candidates = Object.keys(buckets).filter(key => buckets[key].length);
      const penalty = key => [
        previous === 'pair' && key === 'pair' ? 1 : 0,
        previous && previous !== 'pair' && key !== 'pair' && !((previous === 'H' && key === 'V') || (previous === 'V' && key === 'H')) ? 1 : 0
      ];
      candidates.sort((a,b) => penalty(a)[0] - penalty(b)[0] || penalty(a)[1] - penalty(b)[1] || buckets[b].length - buckets[a].length);
      previous = candidates[0];
      order.push(buckets[previous].pop());
    }
    return order;
  }

  // Prioritize pair separation and alternating A orientations, then family separation.
  // Allow row slots to move so paired rows can separate same-orientation As.
  // This is a bounded local search, not a claim of a global mathematical optimum.
  function sequence(rows, random, opener) {
    const order = rhythm(rows, random, opener);
    const count = order.length;
    const firstMovable = opener ? 1 : 0;
    const movableCount = count - firstMovable;
    const better = (a, b) => {
      for (let k = 0; k < a.length; k++) {
        if (Math.abs(a[k] - b[k]) > 1e-8) return a[k] < b[k];
      }
      return false;
    };
    const orientation = row => {
      const image = row.images[0];
      return Math.sign(image.width - image.height);
    };
    function cost(a, b, distance) {
      let family = 0, similarity = a.type === b.type ? 3 : 0;
      for (const x of a.images) for (const y of b.images) {
        if (x.id === y.id || (x.family && x.family === y.family)) family++;
        if (x.character && x.character === y.character) similarity += 2;
        if (x.tone && x.tone === y.tone) similarity++;
      }
      const adjacent = distance === 1;
      // First separate paired rows; then alternate horizontal/vertical As.
      // Squares are neither orientation and cannot satisfy an H/V transition.
      const pairedNeighbors = adjacent && a.type === 'pair' && b.type === 'pair' ? 1 : 0;
      const majorClash = adjacent && a.type === 'A' && b.type === 'A'
        && orientation(a) * orientation(b) !== -1 ? 1 : 0;
      return [pairedNeighbors, majorClash, family / distance ** 2, adjacent ? similarity : 0];
    }
    function affected(i, j, swapped) {
      const total = [0, 0, 0, 0];
      const at = k => order[swapped ? (k === i ? j : k === j ? i : k) : k];
      for (const p of [i, j]) for (let q = 0; q < count; q++) {
        if (q === p || (p === j && q === i)) continue;
        const distance = Math.abs(p - q);
        const score = cost(at(p), at(q), distance);
        for (let k = 0; k < total.length; k++) total[k] += score[k];
      }
      return total;
    }
    // A fixed seed and ID ordering make upload/reordering irrelevant.
    for (let pass = 0; pass < 8 && movableCount > 1; pass++) {
      let improved = false;
      const indices = shuffle(Array.from({ length: movableCount }, (_, k) => firstMovable + k), random);
      for (let left = 0; left < indices.length; left++) for (let right = left + 1; right < indices.length; right++) {
        const i = indices[left], j = indices[right];
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
      // Use every available B before repeats. Squares need a C partner;
      // then draw from the more numerous orientation to preserve B/B matches.
      const unused = medium.filter(item => uses.get(item.id) === 0);
      const portraitCount = unused.filter(item => item.height > item.width).length;
      const landscapeCount = unused.filter(item => item.width > item.height).length;
      const priority = item => item.width === item.height ? 2
        : item.height > item.width ? (portraitCount > landscapeCount ? 1 : 0)
        : (landscapeCount > portraitCount ? 1 : 0);
      candidates.sort((a, b) => uses.get(a.id) - uses.get(b.id)
        || priority(b) - priority(a) || contrast(b, graphic) - contrast(a, graphic));
      const partner = candidates[0];
      uses.set(partner.id, uses.get(partner.id) + 1);
      rows.push({ type: 'pair', images: [partner, graphic] });
    }
    // Pair unused Bs only: exactly one portrait and one landscape.
    // B/C keeps priority, and a B/B pair never introduces a repeated image.
    const portraits = medium.filter(item => uses.get(item.id) === 0 && item.height > item.width);
    const landscapes = medium.filter(item => uses.get(item.id) === 0 && item.width > item.height);
    for (const portrait of portraits) {
      if (!landscapes.length) break;
      landscapes.sort((a, b) => contrast(b, portrait) - contrast(a, portrait));
      const landscape = landscapes.shift();
      uses.set(portrait.id, 1);
      uses.set(landscape.id, 1);
      rows.push({ type: 'pair', pairing: 'BB', images: [portrait, landscape] });
    }
    // With multiple marked openers, the lowest block ID wins deterministically.
    // Otherwise choose a stable A so the page always opens with major work.
    const opener = rows.find(row => row.type === 'A' && row.images[0].opening)
      || rows.find(row => row.type === 'A');
    const ordered = sequence(rows, random, opener);
    // Select each composition in context, not by its index in a fixed cycle.
    let previousPair, previousBBAlignment;
    const layouts = compositions.flatMap(pattern =>
      [0, 1, 2].map(variant => ({ ...pattern, variant })));
    return ordered.map((row, index) => {
      if (row.type === 'A') return row;
      const adjacent = index > 0 && ordered[index - 1].type === 'pair';
      const candidates = shuffle(layouts, random).filter(layout =>
        !adjacent || layout.side !== previousPair.side);
      const similarity = layout => !previousPair ? 0 :
        ['side', 'alignment', 'variant', 'size', 'space', 'edge'].reduce((score, key) =>
          score + (layout[key] === previousPair[key] ?
            ({ side: 6, alignment: 3, variant: 3, size: 2, space: 1, edge: 1 })[key] : 0), 0);
      candidates.sort((a, b) => similarity(a) - similarity(b));
      let layout = candidates[0];
      if (row.pairing === 'BB') {
        // Alternate the shared image edge across BB rows, not caption edges.
        const alignment = previousBBAlignment === 'base' ? 'top' : 'base';
        previousBBAlignment = alignment;
        const [portrait, landscape] = row.images;
        const pr = portrait.width / portrait.height, lr = landscape.width / landscape.height;
        // Loosies-inspired column spans: retain unequal natural image heights.
        const fractions = shuffle([4 / 12, 5 / 12, 6 / 12], random);
        const score = fraction => {
          const a = fraction / pr, b = (1 - fraction) / lr;
          const gap = Math.abs(a - b) / Math.max(a, b);
          return (gap < .18 ? 10 : 0) + (Math.max(a,b) / Math.min(a,b) > 3 ? 10 : 0)
            + Math.abs(gap - .35);
        };
        fractions.sort((a,b) => score(a) - score(b));
        layout = { ...layout, alignment, portraitFraction: fractions[0] };
      }
      previousPair = layout;
      return { ...row, ...layout };
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
    if (!rows.length) throw Error('Add A images, a B/C pair, or a portrait/landscape B pair to the Are.na channel.');
    return { ...options, rows };
  }

  const api = { imageFromBlock, compose, fetchBlocks, load };
  if (typeof module !== 'undefined') module.exports = api;
  else { root.LECTURE = config; root.LectureContent = api; }
})(typeof window !== 'undefined' ? window : this);
