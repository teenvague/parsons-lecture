(() => {
 'use strict';
 const $=id=>document.getElementById(id),panel=$('caption-settings'),subtitle=$('subtitles');
 const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
 const context=document.createElement('canvas').getContext('2d');
 let active=false,previewing=false,recognition=null,epoch=0,frameTimer=null,retryTimer=null,demoTimer=null,healthTimer=null,failures=0;
 function paint(lines){
  while(subtitle.children.length>lines.length)subtitle.lastElementChild.remove();
  lines.forEach((text,i)=>{let line=subtitle.children[i];if(!line){line=document.createElement('span');line.className='subtitle-line';subtitle.append(line);}if(line.textContent!==text)line.textContent=text;});
 }
 const engine=new CaptionLayout.Engine({paint,width:()=>subtitle.clientWidth-12,measure:text=>{
  const style=getComputedStyle(subtitle);context.font=`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  return context.measureText(text).width+Math.max(0,text.length-1)*(parseFloat(style.letterSpacing)||0);
 }});
 function status(text = '') {
  const message = $('caption-status');
  message.textContent = text;
  message.hidden = !text;
 }
 function frame(){engine.tick(performance.now());frameTimer=setTimeout(frame,50);}
 function stop(){
  active=false;previewing=false;epoch++;
  clearTimeout(frameTimer);clearTimeout(retryTimer);clearTimeout(demoTimer);clearTimeout(healthTimer);
  const old=recognition;recognition=null;if(old){old.onend=null;old.abort();}
  engine.reset();$('caption-start').disabled=!Recognition;$('caption-stop').disabled=true;
  status();
 }
 function fail(text){stop();status(text);if(!panel.open)panel.showModal();}
 function connect() {
  if (!active) return;
  const token = ++epoch;
  const instance = new Recognition();
  recognition = instance;
  const current = () => active && epoch === token && recognition === instance;
  let deadline = performance.now() + 15000;
  let speaking = false;

  // One recovery path owns invalidation, cleanup, and retry scheduling.
  // It does not depend on the browser delivering an end event after an error.
  function recover(message, backoff = false) {
   if (!current()) return;
   recognition = null;
   epoch++;
   clearTimeout(healthTimer);
   instance.onend = null;
   try { instance.abort(); } catch {}
   if (backoff) failures++;
   status(message);
   const delay = backoff ? Math.min(500 * 2 ** Math.min(failures, 5), 15000) : 250;
   retryTimer = setTimeout(connect, delay);
  }

  // Some service failures produce neither results nor an end event.
  // A long quiet interval is also safe to reconnect, without clearing the cue.
  function checkHealth() {
   if (!current()) return;
   if (performance.now() >= deadline) {
    recover('Speech service inactive. Reconnecting…', true);
    return;
   }
   healthTimer = setTimeout(checkHealth, 1000);
  }

  engine.newSession();
  instance.continuous = true;
  instance.interimResults = true;
  instance.maxAlternatives = 1;
  instance.lang = 'en-US';
  instance.onstart = () => {
   if (!current()) return;
   deadline = performance.now() + 30000;
   status();
  };
  instance.onspeechstart = () => {
   if (!current()) return;
   speaking = true;
   deadline = Math.min(deadline, performance.now() + 15000);
  };
  instance.onspeechend = () => {
   if (!current()) return;
   speaking = false;
   deadline = performance.now() + 30000;
  };
  instance.onaudioend = () => {
   if (current()) deadline = Math.min(deadline, performance.now() + 2000);
  };
  instance.onresult = event => {
   if (!current()) return;
   failures = 0;
   deadline = performance.now() + (speaking ? 15000 : 30000);
   engine.ingest(event.results, performance.now());
  };
  instance.onerror = event => {
   if (!current()) return;
   if (['not-allowed', 'service-not-allowed'].includes(event.error)) {
    fail('Allow microphone access, then start captions again.');
   } else if (event.error === 'audio-capture') {
    fail('No microphone is available. Connect a microphone and try again.');
   } else if (event.error === 'language-not-supported') {
    fail('The speech service does not support this language.');
   } else {
    recover('Speech service interrupted. Reconnecting…', !['no-speech', 'aborted'].includes(event.error));
   }
  };
  instance.onend = () => recover('Reconnecting speech service…');
  try {
   instance.start();
   if (current()) checkHealth();
  } catch {
   recover('Speech service could not start. Retrying…', true);
  }
 }

 function start(){
  stop();if(!Recognition){status('Live recognition is unavailable here. Try Chrome, or Preview style.');return;}
  active=true;failures=0;$('caption-start').disabled=true;$('caption-stop').disabled=false;panel.close();frame();connect();
 }
 function preview(){
  stop();previewing=true;$('caption-stop').disabled=false;panel.close();frame();
  const phrases=['I think taste is something we make, as much as something we have.','It comes from looking closely. From trying something, and then trying it again.','And sometimes the thing you almost threw away is where the work begins.'];
  let index=0,count=0;const results=[];
  function next(){
   if(!previewing)return;
   const words=phrases[index].split(' '),done=++count===words.length;
   results[index]=Object.assign([{transcript:words.slice(0,count).join(' ')}],{isFinal:done});
   engine.ingest(results,performance.now());
   if(!done)demoTimer=setTimeout(next,300);
   else if(++index<phrases.length){count=0;demoTimer=setTimeout(next,2800);}
   else demoTimer=setTimeout(()=>{stop();status('Preview complete. This was simulated speech.');},5000);
  }
  status('Style preview — simulated speech, microphone off.');next();
 }
 $('caption-start').onclick=start;$('caption-stop').onclick=stop;$('caption-demo').onclick=preview;$('caption-close').onclick=()=>panel.close();
 if(!Recognition){$('caption-start').disabled=true;status('Live recognition is unavailable here. Try Chrome, or Preview style.');}
 addEventListener('keydown',e=>{
  if(e.ctrlKey||e.metaKey||e.altKey||e.repeat||e.target.matches('input,textarea,select,[contenteditable]'))return;
  if(e.key.toLowerCase()==='c'){e.preventDefault();panel.open?panel.close():panel.showModal();}
  if(e.key==='Escape'&&!panel.open&&(active||previewing)){e.preventDefault();stop();}
 });
 addEventListener('pagehide',stop);
})();
