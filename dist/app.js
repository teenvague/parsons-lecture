(async () => {
'use strict';
const $=id=>document.getElementById(id);
let config=window.LECTURE;
const motion=matchMedia('(prefers-reduced-motion: reduce)');
let playing=false, speed=70, last=0, position=0, ready=false;
function validate(){
 if(!config || !Array.isArray(config.rows) || !config.rows.length)throw Error('Add at least one row to content.js.');
 for(const row of config.rows){
  const kinds=row.images?.map(i=>i.type).sort().join('');
  if(!((row.type==='A'&&kinds==='A')||(row.type==='pair'&&(kinds==='BC'||(kinds==='BB'&&row.pairing==='BB'&&row.images.some(i=>i.height>i.width)&&row.images.some(i=>i.width>i.height))))))throw Error('Each row must contain one A, one B and one C, or a portrait/landscape B pair.');
  for(const i of row.images)if(!i.src||!i.caption?.trim()||!i.alt?.trim()||!(i.width>0&&i.height>0))throw Error('Each image needs a source, caption, alt text, width, and height.');
 }
}
function makeCycle(){
 const cycle=document.createElement('section');cycle.className='cycle';
 cycle.setAttribute('aria-label','Lecture works');
 config.rows.forEach(row=>{
  const section=document.createElement('div');
  section.className=row.type==='A'?'row major':`row pair proportion-${row.variant ?? 0} ${row.alignment==='top'?'top':'base'} ${row.side==='right'?'right':'left'} ${row.size==='narrow'?'narrow':'wide'} ${row.space==='long'?'long':'normal'} edge-${['left','right','both'].includes(row.edge)?row.edge:'inset'}`;
  if(row.pairing==='BB'){
   section.className=`row bb ${row.alignment==='top'?'top':'base'} ${row.side==='right'?'right':'left'} ${row.space==='long'?'long':'normal'}`;
   const fraction=row.portraitFraction;
   const [portrait,landscape]=row.images;
   section.style.setProperty('--bb-portrait',fraction+'fr');
   section.style.setProperty('--bb-landscape',(1-fraction)+'fr');
   const maxWidth=Math.min(110*portrait.width/portrait.height/fraction,110*landscape.width/landscape.height/(1-fraction));
   section.style.setProperty('--bb-max-width',maxWidth+'vh');
  }
  row.images.forEach(item=>{
   const figure=document.createElement('figure');figure.className=`type-${item.type}`;
   if(row.pairing!=='BB' && ['A','B'].includes(item.type) && item.height>item.width){
    figure.classList.add('portrait');
    figure.style.setProperty('--portrait-width',`${(item.type==='B'?110:90)*item.width/item.height}vh`);
   }
   const img=document.createElement('img');Object.assign(img,{src:item.src,alt:item.alt,width:item.width,height:item.height,decoding:'async'});
   img.addEventListener('error',()=>{const fallback=document.createElement('div');fallback.className='image-failed';fallback.style.aspectRatio=`${item.width}/${item.height}`;fallback.textContent='Image unavailable';img.replaceWith(fallback);});
   const caption=document.createElement('figcaption');caption.textContent=item.caption;
   figure.append(img,caption);section.append(figure);
  });cycle.append(section);
 });return cycle;
}
function pause(){playing=false;}
function toggle(){if(!ready)return;position=scrollY;playing=!playing&&position<maxScroll();last=0;}
function maxScroll(){return Math.max(0,document.documentElement.scrollHeight-innerHeight);}
try{config=await LectureContent.load(config);validate();speed=Math.min(200,Math.max(4,Number(config.speed)||70));const first=makeCycle();$('wall').append(first);history.scrollRestoration='manual';scrollTo(0,0);position=0;ready=true;}catch(e){$('error').hidden=false;$('error').textContent=e.message;playing=false;}
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
 if(playing&&!document.hidden&&ready){
  const end=maxScroll();
  position=Math.min(position+speed*dt,end);
  scrollTo(0,position);
  if(position>=end)pause();
 }else position=scrollY;
 requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
})();
