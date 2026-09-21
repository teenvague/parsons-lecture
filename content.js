/* Replace the local image paths, alt text, and captions below.
   A = full-width finished work. Each pair MUST contain one B and one C.
   C files must have transparent backgrounds (PNG, WebP, or SVG).
   width/height must match each file, so scrolling stays stable while loading.
   alignment: top | base. side: left | right (position of B).
   size: wide | narrow. space: normal | long. edge: left | right | both | inset. */
window.LECTURE = {
  speed: 50,
  rows: [
    {type:'pair', alignment:'base', side:'left', edge:'left', size:'wide', space:'normal', images:[
      {type:'B', src:'assets/b01.png', width:1000, height:1250, alt:'Blue typographic poster reading Too much is enough.', caption:'01 / Too much is enough — typographic study · Placeholder'},
      {type:'C', src:'assets/c01.png', width:600, height:550, alt:'A red italic ampersand on a transparent background.', caption:'02 / Ampersand — loose type · Placeholder'}]},
    {type:'A', images:[{type:'A',src:'assets/a01.png',width:1800,height:1100,alt:'Vermilion poster reading A question of taste.',caption:'03 / A question of taste — finished poster · Placeholder'}]},
    {type:'pair', alignment:'top', side:'right', edge:'right', size:'narrow', space:'long', images:[
      {type:'B',src:'assets/b02.png',width:1200,height:850,alt:'Black type on pale gray reading form follows feeling.',caption:'04 / Form follows feeling — type study · Placeholder'},
      {type:'C',src:'assets/c02.png',width:650,height:500,alt:'Blue a slash b and a two-way arrow on transparent background.',caption:'05 / Either, or — loose type · Placeholder'}]},
    {type:'A', images:[{type:'A',src:'assets/a02.png',width:1800,height:1050,alt:'Acid yellow poster reading Make again.',caption:'06 / Make again — finished poster · Placeholder'}]},
    {type:'pair', alignment:'base', side:'left', size:'narrow', space:'long', images:[
      {type:'B',src:'assets/b03.png',width:1000,height:1100,alt:'White serif type on black reading Things in progress.',caption:'07 / Things in progress — type study · Placeholder'},
      {type:'C',src:'assets/c03.png',width:650,height:500,alt:'The word Maybe in black italic type, on transparent background.',caption:'08 / Maybe — unused wordmark · Placeholder'}]}
  ]
};
