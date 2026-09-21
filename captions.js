(() => {
 'use strict';
 const $=id=>document.getElementById(id), panel=$('caption-settings'), subtitle=$('subtitles');
 const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
 const canvas=document.createElement('canvas'), context=canvas.getContext('2d');
 let recognition=null, active=false, demo=false, restartTimer, clearTimer, demoTimer, failures=0, transcript='', lastText='', generation=0;
 let settleTimer, speaking=false;
 let audioContext=null, microphoneStream=null, levelTimer, monitorEpoch=0, monitoring=false;
 const pauseMs=1800;
 function endCue(){
  subtitle.replaceChildren();transcript='';lastText='';
  // End the recognition session as well as the visual cue. Old hypotheses
  // cannot leak into the next phrase, even if the service revises word counts.
  if(active&&recognition)recognition.finishCue();
 }
 // Detect pauses from local microphone levels, independently of delayed or
 // missing SpeechRecognition speechend events. Audio is never recorded here.
 function releaseMonitor(){
  monitorEpoch++;monitoring=false;clearTimeout(levelTimer);
  microphoneStream?.getTracks().forEach(track=>track.stop());microphoneStream=null;
  if(audioContext){audioContext.close().catch(()=>{});audioContext=null;}
 }
 async function monitorSilence(){
  const Context=window.AudioContext||window.webkitAudioContext;
  if(!Context||typeof navigator==='undefined'||!navigator.mediaDevices?.getUserMedia)return;
  const epoch=monitorEpoch;
  const context=new Context();audioContext=context;
  try{
   await context.resume();
   const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
   if(!active||epoch!==monitorEpoch){stream.getTracks().forEach(track=>track.stop());return;}
   microphoneStream=stream;
   const source=context.createMediaStreamSource(stream),analyser=context.createAnalyser();
   analyser.fftSize=2048;source.connect(analyser);
   const samples=new Float32Array(analyser.fftSize);
   let quietSince=null, noiseFloor=.002;
   monitoring=true;clearTimeout(clearTimer);
   function sample(){
    if(!active||epoch!==monitorEpoch)return;
    if(context.state==='running'){
     analyser.getFloatTimeDomainData(samples);
     let energy=0;for(const value of samples)energy+=value*value;
     const rms=Math.sqrt(energy/samples.length),now=performance.now();
     const threshold=Math.max(.008,Math.min(.025,noiseFloor*3));
     if(rms>threshold){quietSince=null;}
     else{
      noiseFloor=noiseFloor*.98+rms*.02;
      if(quietSince===null)quietSince=now;
      if(transcript&&now-quietSince>=pauseMs){speaking=false;endCue();quietSince=now;}
     }
    }else quietSince=null;
    levelTimer=setTimeout(sample,100);
   }
   sample();
  }catch{
   if(active&&epoch===monitorEpoch)fail('Microphone pause detection could not start. Allow microphone access and try again in Chrome.');
  }
 }
 function status(message){$('caption-status').textContent=message;}
 function render(text){
  transcript=text;
  const style=getComputedStyle(subtitle);context.font=`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  const pages=CaptionLayout.layout(text,t=>context.measureText(t).width+Math.max(0,t.length-1)*(parseFloat(style.letterSpacing)||0),subtitle.clientWidth-8);
  const lines=pages.flat().slice(-2);
  if(subtitle.childElementCount!==lines.length){
   subtitle.replaceChildren(...lines.map(text=>{const line=document.createElement('span');line.className='subtitle-line';line.textContent=text;return line;}));
  }else Array.from(subtitle.children).forEach((line,i)=>{if(line.textContent!==lines[i])line.textContent=lines[i];});
 }
 function update(text){
  // Interim hypotheses may replace earlier words: render the latest hypothesis,
  // not an append-only stream that duplicates corrected words.
  if(text===lastText)return;
  lastText=text;clearTimeout(clearTimer);render(text);
  if(!active||(!monitoring&&!speaking))clearTimer=setTimeout(endCue,pauseMs);
 }
 function stop(){
  releaseMonitor();
  active=false;demo=false;speaking=false;generation++;clearTimeout(restartTimer);clearTimeout(clearTimer);clearTimeout(demoTimer);clearTimeout(settleTimer);
  if(recognition){recognition.onend=null;recognition.abort();recognition=null;}
  subtitle.replaceChildren();transcript='';lastText='';
  $('caption-start').disabled=!Recognition;$('caption-stop').disabled=true;
  status('Captions off. Press C to open these settings.');
 }
 function fail(message){stop();status(message);if(!panel.open)panel.showModal();}
 function connect(){
  if(!active)return;
  clearTimeout(clearTimer);clearTimeout(settleTimer);clearTimeout(restartTimer);
  const token=++generation;speaking=false;
  const instance=new Recognition();recognition=instance;
  const current=()=>active&&token===generation&&recognition===instance;
  instance.continuous=true;instance.interimResults=true;instance.lang=$('caption-language').value;instance.maxAlternatives=1;
  let finalCursor=0, committed=[], closing=false, ended=false, errorCounted=false;
  function restart(){
   if(!current()||ended)return;
   ended=true;recognition=null;clearTimeout(settleTimer);clearTimeout(clearTimer);
   // Invalidate all callbacks from this service instance immediately.
   generation++;lastText='';
   restartTimer=setTimeout(connect,failures?Math.min(500*2**failures,4000):150);
  }
  instance.finishCue=()=>{
   if(!current()||closing)return;
   closing=true;
   try{instance.stop();}catch{restart();return;}
   settleTimer=setTimeout(()=>{if(current()){instance.abort();restart();}},1500);
  };
  instance.onspeechstart=()=>{if(current()&&!closing){speaking=true;clearTimeout(clearTimer);}};
  instance.onspeechend=()=>{if(current()&&!closing){speaking=false;clearTimeout(clearTimer);if(!monitoring)clearTimer=setTimeout(endCue,pauseMs);}};
  instance.onstart=()=>{if(current())status('Listening. Press C for settings or Escape to stop captions.');};
  instance.onresult=event=>{
   if(!current()||closing)return;
   failures=0;
   // Final results are immutable. Consume each only once, keeping a bounded
   // tail rather than reprocessing and relaying out the entire lecture.
   let interim=[];
   for(let i=finalCursor;i<event.results.length;i++){
    const result=event.results[i];
    const words=result[0].transcript.trim().split(/\s+/u).filter(Boolean);
    if(result.isFinal){committed.push(...words);committed=committed.slice(-32);finalCursor=i+1;}
    else interim.push(...words);
   }
   const text=[...committed,...interim].slice(-64).join(' ');
   if(text)update(text);
  };
  instance.onerror=event=>{
   if(!current()||closing)return;
   if(event.error==='not-allowed'||event.error==='service-not-allowed')fail('Microphone or speech recognition permission was denied. Allow access in your browser, then try again.');
   else if(event.error==='audio-capture')fail('No microphone is available. Connect or enable a microphone, then try again.');
   else if(event.error==='language-not-supported')fail('This speech recognition service does not support the selected language.');
   else if(!['no-speech','aborted'].includes(event.error)){
    if(!errorCounted){failures++;errorCounted=true;}
    if(failures>=3)fail('Speech recognition could not connect. Check your connection and try Chrome. You can still preview the subtitle style.');
    else {status('Speech recognition interrupted. Reconnecting…');instance.finishCue();}
   }
  };
  // Silence is normal during a lecture, not a failure. Restart quietly.
  instance.onend=()=>{if(current()){subtitle.replaceChildren();transcript='';restart();}};
  try{instance.start();}catch{fail('Could not start speech recognition. Try again in Chrome with microphone access enabled.');}
 }
 function start(){
  stop();if(!Recognition){status('Live recognition is unavailable in this browser. Open this site in Chrome, or use Preview style.');return;}
  active=true;failures=0;$('caption-start').disabled=true;$('caption-stop').disabled=false;
  status('Requesting microphone access…');panel.close();connect();if(active)monitorSilence();
 }
 function preview(){
  stop();demo=true;$('caption-stop').disabled=false;panel.close();
  const phrases=[
   'I think taste is something we make, as much as something we have.',
   'It comes from looking closely. From trying something, and then trying it again.',
   'And sometimes the thing you almost threw away is where the work begins.'
  ];
  let phrase=0,word=0;
  function next(){
   if(!demo)return;
   const words=phrases[phrase].split(' ');update(words.slice(0,++word).join(' '));
   if(word<words.length)demoTimer=setTimeout(next,280);
   else if(phrase<phrases.length-1){phrase++;word=0;demoTimer=setTimeout(next,1800);}
   else demoTimer=setTimeout(()=>{stop();status('Preview complete. Live microphone captions have not been tested.');},3500);
  }
  status('Style preview — simulated speech, microphone off.');next();
 }
 $('caption-start').onclick=start;$('caption-stop').onclick=stop;$('caption-demo').onclick=preview;$('caption-close').onclick=()=>panel.close();
 if(!Recognition){$('caption-start').disabled=true;status('Live recognition is unavailable here. Use Chrome for microphone captions, or preview the style below.');}
 addEventListener('keydown',e=>{
  if(e.ctrlKey||e.metaKey||e.altKey||e.repeat||e.target.matches('input,textarea,select,[contenteditable]'))return;
  if(e.key.toLowerCase()==='c'){e.preventDefault();panel.open?panel.close():panel.showModal();}
  if(e.key==='Escape'&&!panel.open&&(active||demo)){e.preventDefault();stop();}
 });
 let resizeTimer;addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(subtitle.childElementCount)render(transcript);},100);});
 addEventListener('pagehide',stop);
})();
