(() => {
'use strict';
const $=id=>document.getElementById(id), config=window.LECTURE;
const motion=matchMedia('(prefers-reduced-motion: reduce)');
let playing=!motion.matches, speed=50, last=0, position=0, cycleHeight=0;
function validate(){
 if(!config || !Array.isArray(config.rows) || !config.rows.length)throw Error('Add at least one row to content.js.');
 for(const row of config.rows){
  const kinds=row.images?.map(i=>i.type).sort().join('');
  if(!((row.type==='A'&&kinds==='A')||(row.type==='pair'&&kinds==='BC')))throw Error('Each row must contain one A, or exactly one B and one C.');
  for(const i of row.images)if(!i.src||!i.caption?.trim()||!i.alt?.trim()||!(i.width>0&&i.height>0))throw Error('Each image needs a source, caption, alt text, width, and height.');
 }
}
function makeCycle(copy=false){
 const cycle=document.createElement('section');cycle.className='cycle';
 if(copy){cycle.setAttribute('aria-hidden','true');cycle.inert=true;}
 else cycle.setAttribute('aria-label','Lecture works');
 config.rows.forEach(row=>{
  const section=document.createElement('div');
  section.className=row.type==='A'?'row major':`row pair ${row.alignment==='top'?'top':'base'} ${row.side==='right'?'right':'left'} ${row.size==='narrow'?'narrow':'wide'} ${row.space==='long'?'long':'normal'} edge-${['left','right','both'].includes(row.edge)?row.edge:'inset'}`;
  row.images.forEach(item=>{
   const figure=document.createElement('figure');figure.className=`type-${item.type}`;
   const img=document.createElement('img');Object.assign(img,{src:item.src,alt:item.alt,width:item.width,height:item.height,decoding:'async'});
   img.addEventListener('error',()=>{const fallback=document.createElement('div');fallback.className='image-failed';fallback.style.aspectRatio=`${item.width}/${item.height}`;fallback.textContent='Image unavailable';img.replaceWith(fallback);});
   const caption=document.createElement('figcaption');caption.textContent=item.caption;
   figure.append(img,caption);section.append(figure);
  });cycle.append(section);
 });return cycle;
}
function pause(){playing=false;}
function toggle(){playing=!playing;position=scrollY;last=0;}
try{validate();speed=Math.min(60,Math.max(4,Number(config.speed)||50));const first=makeCycle();$('wall').append(first,makeCycle(true),makeCycle(true));const measure=()=>{cycleHeight=first.getBoundingClientRect().height;position=scrollY;};new ResizeObserver(measure).observe(first);measure();}catch(e){$('error').hidden=false;$('error').textContent=e.message;playing=false;}
for(const name of ['wheel','touchstart'])addEventListener(name,pause,{passive:true});
addEventListener('keydown',e=>{
 if(e.target.matches('input,textarea,select,button,[contenteditable]')||e.ctrlKey||e.metaKey||e.altKey)return;
 if(e.code==='Space'){e.preventDefault();if(!e.repeat)toggle();}
 else if(['ArrowDown','ArrowUp','PageDown','PageUp','Home','End'].includes(e.key))pause();
});
motion.addEventListener('change',e=>{if(e.matches)pause();});
document.addEventListener('visibilitychange',()=>{last=0;position=scrollY;});
function tick(now){
 const dt=last?Math.min((now-last)/1000,.1):0;last=now;
 if(playing&&!document.hidden&&cycleHeight>0){
  position+=speed*dt;
  // Jump only between pixel-identical cycles, preserving fractional movement.
  const start=$('wall').offsetTop;
  if(position>=start+cycleHeight)position-=cycleHeight;
  scrollTo(0,position);
 }else position=scrollY;
 requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
})();
