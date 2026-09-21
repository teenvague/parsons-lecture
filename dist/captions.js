(() => {
 'use strict';
 const $=id=>document.getElementById(id),panel=$('caption-settings'),subtitle=$('subtitles');
 const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
 const context=document.createElement('canvas').getContext('2d');
 let active=false,previewing=false,recognition=null,epoch=0,frameTimer=null,retryTimer=null,demoTimer=null,failures=0;
 function paint(lines){
  while(subtitle.children.length>lines.length)subtitle.lastElementChild.remove();
  lines.forEach((text,i)=>{let line=subtitle.children[i];if(!line){line=document.createElement('span');line.className='subtitle-line';subtitle.append(line);}if(line.textContent!==text)line.textContent=text;});
 }
 const engine=new CaptionLayout.Engine({paint,width:()=>subtitle.clientWidth-12,measure:text=>{
  const style=getComputedStyle(subtitle);context.font=`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  return context.measureText(text).width+Math.max(0,text.length-1)*(parseFloat(style.letterSpacing)||0);
 }});
 const status=text=>{$('caption-status').textContent=text;};
 function frame(){engine.tick(performance.now());frameTimer=setTimeout(frame,50);}
 function stop(){
  active=false;previewing=false;epoch++;
  clearTimeout(frameTimer);clearTimeout(retryTimer);clearTimeout(demoTimer);
  const old=recognition;recognition=null;if(old){old.onend=null;old.abort();}
  engine.reset();$('caption-start').disabled=!Recognition;$('caption-stop').disabled=true;
  status('Captions off. Press C for settings.');
 }
 function fail(text){stop();status(text);if(!panel.open)panel.showModal();}
 function connect(){
  if(!active)return;
  const token=++epoch,instance=new Recognition();recognition=instance;
  const current=()=>active&&epoch===token&&recognition===instance;
  engine.newSession();
  instance.continuous=true;instance.interimResults=true;instance.maxAlternatives=1;instance.lang=$('caption-language').value;
  instance.onstart=()=>{if(current())status('Listening. Words settle briefly before appearing. Escape stops captions.');};
  instance.onresult=event=>{if(current()){failures=0;engine.ingest(event.results,performance.now());}};
  instance.onerror=event=>{
   if(!current())return;
   if(['not-allowed','service-not-allowed'].includes(event.error))return fail('Allow microphone access, then start captions again.');
   if(event.error==='audio-capture')return fail('No microphone is available. Connect a microphone and try again.');
   if(event.error==='language-not-supported')return fail('The speech service does not support this language.');
   if(!['no-speech','aborted'].includes(event.error)){
    failures++;if(failures>=3)return fail('The speech service cannot connect. Check your connection and try again.');
    status('Speech service interrupted. Reconnecting…');
   }
   // The service ends after an error. Only onend owns reconnection.
  };
  instance.onend=()=>{
   if(!current())return;
   recognition=null;epoch++;
   // Keep the visible cue and pending words through a service reconnect.
   retryTimer=setTimeout(connect,failures?Math.min(500*2**failures,4000):100);
  };
  try{instance.start();}catch{fail('Could not start the speech service. Try again in Chrome with microphone access enabled.');}
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
