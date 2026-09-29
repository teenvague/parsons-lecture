const assert = require('node:assert/strict');
const { test } = require('node:test');
const { compose, imageFromBlock } = require('../dist/content.js');

function block(id, type, tone, opening = false) {
  return {
    id, type: 'Image',
    title: `${type}${opening ? ' opening' : ''} | photo | fullbleed | ${tone} | Work ${id}`,
    image: { src: 'work.png', width: 1200, height: 800 }
  };
}
function labeledTones(rows) {
  return rows.filter(row => row.type === 'A').map(row => row.images[0].tone)
    .filter(tone => tone === 'bw' || tone === 'color');
}

test('balanced A tones alternate across pairs and unknown As, with the opener fixed', () => {
  const blocks = [block(1, 'A', 'bw', true), block(2, 'A', 'bw'),
    block(3, 'A', 'bw'), block(4, 'A', 'color'), block(5, 'A', 'color'),
    block(6, 'A', 'color'), block(7, 'A', ''), block(8, 'B', 'color'), block(9, 'C', 'bw')];
  const rows = compose(blocks, false, 1);
  assert.equal(rows[0].images[0].id, 1);
  assert.deepEqual(labeledTones(rows), ['bw', 'color', 'bw', 'color', 'bw', 'color']);
  assert.deepEqual(rows.flatMap(row => row.images.map(image => image.id)).sort((a,b) => a-b), blocks.map(b => b.id));
  assert.deepEqual(compose([...blocks].reverse(), false, 1), rows);
});

test('incomplete category fields remain valid and neutral', () => {
  const incomplete = block(1, 'A', '');
  incomplete.title = 'A | | | | Untagged work';
  const parsed = imageFromBlock(incomplete);
  assert.equal(parsed.caption, 'Untagged work');
  assert.deepEqual([parsed.family, parsed.character, parsed.tone], ['', '', '']);
  assert.equal(imageFromBlock({...incomplete, title: 'A | | | | '}), null);
});

test('unbalanced tones retain every A without repeating images', () => {
  const blocks = ['bw','bw','bw','color'].map((tone,i) => block(i+1,'A',tone));
  const rows = compose(blocks, false, 1);
  const tones = labeledTones(rows);
  assert.equal(new Set(rows.flatMap(row => row.images.map(image => image.id))).size, 4);
  assert.equal(tones.filter((tone,i) => i && tone === tones[i-1]).length, 1);
});
