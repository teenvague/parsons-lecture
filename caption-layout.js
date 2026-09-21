/* Pure subtitle layout, shared by live recognition and the preview. */
(function(root){
 'use strict';
 function layout(text,measure,maxWidth){
  const words=text.trim().split(/\s+/u).filter(Boolean), pages=[];
  let lines=[''];
  function flush(){if(lines.some(Boolean))pages.push(lines);lines=[''];}
  for(const word of words){
   const current=lines.length-1, proposed=lines[current]?lines[current]+' '+word:word;
   if(measure(proposed)<=maxWidth){lines[current]=proposed;continue;}
   if(lines.length===2)flush();else if(lines[current])lines.push('');
   // Split an unusually long word so no subtitle can leave the viewport.
   let piece='';
   for(const char of word){
    if(piece&&measure(piece+char)>maxWidth){
     lines[lines.length-1]=piece;
     if(lines.length===2)flush();else lines.push('');
     piece='';
    }
    piece+=char;
   }
   lines[lines.length-1]=piece;
  }
  if(lines.some(Boolean))pages.push(lines);
  return pages;
 }
 if(typeof module!=='undefined')module.exports={layout};
 else root.CaptionLayout={layout};
})(typeof window!=='undefined'?window:this);
