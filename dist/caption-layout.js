/* Recognition reconciliation and subtitle presentation, independent of the DOM. */
(function(root){
 'use strict';
 const words=text=>text.trim().split(/\s+/u).filter(Boolean);
 const key=word=>word.toLocaleLowerCase().replace(/[.,!?;:]/gu,'');
 // Map the boundary of already displayed words through a revised hypothesis.
 // Edits before that boundary stay frozen; genuinely new suffix words survive.
 function boundary(old,next,count){
  const a=old.map(key),b=next.map(key),d=Array.from({length:a.length+1},()=>Array(b.length+1).fill(0));
  for(let i=0;i<=a.length;i++)d[i][0]=i;
  for(let j=0;j<=b.length;j++)d[0][j]=j;
  for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
  let i=a.length,j=b.length;const steps=[];
  while(i||j){
   if(i&&j&&d[i][j]===d[i-1][j-1]+(a[i-1]===b[j-1]?0:1)){steps.push([1,1]);i--;j--;}
   else if(i&&d[i][j]===d[i-1][j]+1){steps.push([1,0]);i--;}
   else{steps.push([0,1]);j--;}
  }
  i=0;j=0;
  for(const [di,dj] of steps.reverse()){if(i>=count)return j;i+=di;j+=dj;}
  return j;
 }
 class Engine{
  constructor({measure,width,paint}){this.measure=measure;this.width=width;this.paint=paint;this.reset();}
  reset(){this.segment=null;this.cursor=0;this.queue=[];this.lines=[];this.lastWord=-Infinity;this.lastInput=-Infinity;this.nextWord=0;this.paint([]);}
  newSession(){this.flush();this.segment=null;this.cursor=0;}
  ingest(results,now){
   for(let i=this.cursor;i<results.length;i++){
    const r=results[i],next=words(r[0].transcript);
    if(!this.segment||this.segment.index!==i)this.segment={index:i,tokens:[],since:[],used:0,final:false};
    const s=this.segment;let same=0;
    while(same<next.length&&same<s.tokens.length&&key(next[same])===key(s.tokens[same]))same++;
    if(s.used&&same<s.used)s.used=boundary(s.tokens,next,s.used);
    s.since=next.map((_,j)=>j<same?s.since[j]:now);s.tokens=next;s.final=r.isFinal;
    this.collect(now);
    if(r.isFinal){this.cursor=i+1;this.segment=null;}else break;
   }
  }
  collect(now){
   const s=this.segment;if(!s)return;
   while(s.used<s.tokens.length&&(s.final||now-s.since[s.used]>=600)){
    if(now-this.lastInput>1800)this.queue.push(null);
    this.queue.push(s.tokens[s.used++]);this.lastInput=now;
   }
  }
  flush(){if(this.segment){this.segment.final=true;this.collect(this.lastInput===-Infinity?0:this.lastInput);}}
  tick(now){
   this.collect(now);
   if(this.queue.length&&now>=this.nextWord){
    while(this.queue[0]===null){this.queue.shift();this.lines=[];}
    const word=this.queue.shift();
    if(word){this.add(word);this.lastWord=now;this.nextWord=now+(this.queue.length>15?45:90);}
   }
   if(!this.queue.length&&this.lines.length&&now-this.lastWord>2200){this.lines=[];this.paint([]);}
  }
  add(word){
   if(!this.lines.length)this.lines=[''];
   const limit=Math.max(1,this.width());
   for(const part of this.split(word,limit)){
    let i=this.lines.length-1, candidate=this.lines[i]?this.lines[i]+' '+part:part;
    if(this.measure(candidate)>limit&&this.lines[i]){
     if(this.lines.length===2)this.lines=[''];else this.lines.push('');
     i=this.lines.length-1;candidate=part;
    }
    this.lines[i]=candidate;
   }
   this.paint([...this.lines]);
  }
  split(word,limit){const chunks=[];let part='';for(const c of word){if(part&&this.measure(part+c)>limit){chunks.push(part);part='';}part+=c;}if(part)chunks.push(part);return chunks;}
 }
 const api={Engine,boundary};
 if(typeof module!=='undefined')module.exports=api;else root.CaptionLayout=api;
})(typeof window!=='undefined'?window:this);
