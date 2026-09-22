/* Are.na is the content editor. Reload the page to pick up channel changes. */
(function (root) {
  'use strict';
  const config = {
    channel: 'cd-lecture-images',
    speed: 50,
    repeatMediumImages: true
  };
  const compositions = [
    { alignment: 'base', side: 'left', edge: 'left', size: 'wide', space: 'normal' },
    { alignment: 'top', side: 'right', edge: 'right', size: 'narrow', space: 'long' },
    { alignment: 'base', side: 'left', edge: 'both', size: 'narrow', space: 'normal' },
    { alignment: 'top', side: 'right', edge: 'right', size: 'wide', space: 'long' }
  ];

  function imageFromBlock(block) {
    if (block.type !== 'Image' || !block.image) return null;
    const match = block.title?.match(/^\s*([ABC])\s*[—–:-]\s*(.+)$/iu);
    if (!match) return null;
    const type = match[1].toUpperCase();
    const caption = match[2].trim();
    const image = block.image;
    // Original PNGs retain transparency for the loose C graphics.
    const src = type === 'C' ? image.src : (image.large?.src || image.src);
    if (!src || !image.width || !image.height) return null;
    return {
      id: block.id, type, caption, src,
      alt: image.alt_text || caption,
      width: image.width, height: image.height
    };
  }

  function compose(blocks, repeatMediumImages = false) {
    const items = blocks.map(imageFromBlock).filter(Boolean);
    const available = new Set(items);
    const medium = items.filter(item => item.type === 'B');
    const rows = [];
    let pairIndex = 0, repeatIndex = 0;
    for (const item of items) {
      if (!available.has(item)) continue;
      available.delete(item);
      if (item.type === 'A') {
        rows.push({ type: 'A', images: [item] });
        continue;
      }
      const otherType = item.type === 'B' ? 'C' : 'B';
      let partner = items.find(candidate => available.has(candidate) && candidate.type === otherType);
      if (!partner && item.type === 'C' && repeatMediumImages && medium.length) {
        partner = medium[repeatIndex++ % medium.length];
      }
      if (!partner) continue;
      available.delete(partner);
      const images = item.type === 'B' ? [item, partner] : [partner, item];
      rows.push({ type: 'pair', ...compositions[pairIndex++ % compositions.length], images });
    }
    return rows;
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
    const rows = compose(blocks, options.repeatMediumImages);
    if (!rows.length) throw Error('Add A images or a complete B/C pair to the Are.na channel.');
    return { ...options, rows };
  }

  const api = { imageFromBlock, compose, fetchBlocks, load };
  if (typeof module !== 'undefined') module.exports = api;
  else { root.LECTURE = config; root.LectureContent = api; }
})(typeof window !== 'undefined' ? window : this);
