export type ClipShape='landscape'|'portrait';
export const clipDimensions=(shape:ClipShape)=>shape==='portrait'?{width:1080,height:1920}:{width:1920,height:1080};
/** Record pixels from the existing real replay, never a new simulated task. */
export async function recordRoom(shape:ClipShape,title:string,signal:AbortSignal,onProgress:(s:string)=>void){
 if(typeof MediaRecorder==='undefined'||!HTMLCanvasElement.prototype.captureStream)throw Error('This browser cannot record clips. Try Chrome on your Mac.');
 if(signal.aborted||document.hidden)throw Error('Keep this tab visible to record a replay.');
 const source=document.querySelector<HTMLCanvasElement>('.obs2-room-canvas canvas');if(!source)throw Error('Open the room before recording.');
 const canvas=document.createElement('canvas'),size=clipDimensions(shape);canvas.width=size.width;canvas.height=size.height;const ctx=canvas.getContext('2d');if(!ctx)throw Error('The clip canvas could not open.');
 const probe=document.createElement('canvas');probe.width=1;probe.height=1;const sample=probe.getContext('2d')!;sample.drawImage(source,0,0,1,1);if(sample.getImageData(0,0,1,1).data[3]===0)throw Error('The room pixels are not ready. Wait a moment and record again.');
 const stream=canvas.captureStream(30),mime=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(m=>MediaRecorder.isTypeSupported(m));if(!mime){stream.getTracks().forEach(t=>t.stop());throw Error('This browser cannot save WebM clips. Try Chrome on your Mac.');}
 const recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:5_000_000}),chunks:BlobPart[]=[];
 let interval:ReturnType<typeof setInterval>|undefined,timer:ReturnType<typeof setTimeout>|undefined;
 try{return await new Promise<Blob>((resolve,reject)=>{
 const abort=()=>{if(recorder.state!=='inactive')recorder.stop();reject(Error('Recording stopped. Keep this tab visible and connected.'));};signal.addEventListener('abort',abort,{once:true});
 const done=()=>{clearInterval(interval);clearTimeout(timer);signal.removeEventListener('abort',abort);stream.getTracks().forEach(t=>t.stop());};recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recorder.onstop=()=>{done();resolve(new Blob(chunks,{type:'video/webm'}));};recorder.onerror=()=>{done();reject(Error('The browser could not finish recording.'));};
 const start=performance.now();const draw=()=>{if(signal.aborted||document.hidden){abort();return;}const age=performance.now()-start,w=canvas.width,h=canvas.height;ctx.fillStyle='#171d22';ctx.fillRect(0,0,w,h);ctx.fillStyle='#f4f6f8';ctx.textAlign='center';ctx.font=`500 ${shape==='portrait'?44:36}px system-ui`;ctx.fillText('Replay — recorded task',w/2,shape==='portrait'?180:120);ctx.font=`600 ${shape==='portrait'?40:40}px system-ui`;const safe=title.length>65?title.slice(0,62)+'…':title;ctx.fillText(safe,w/2,shape==='portrait'?260:184,w-100);
 if(age>=22000){ctx.font=`600 ${shape==='portrait'?64:62}px system-ui`;ctx.fillText('Unfoolable:',w/2,h*.43);ctx.font=`400 ${shape==='portrait'?42:40}px system-ui`;ctx.fillText('checked by a judge',w/2,h*.51);ctx.fillText("the AI can't touch.",w/2,h*.56);}
 else{ctx.imageSmoothingEnabled=false;if(shape==='portrait'){const region=document.querySelector<HTMLElement>('.obs2-stage')?.dataset.room,center=region==='grader'?600:region==='you'?805:200;ctx.drawImage(source,Math.max(0,Math.min(640,center-160)),0,320,248,40,480,w-80,(w-80)*248/320);}else ctx.drawImage(source,0,0,source.width,source.height,48,270,w-96,(w-96)*248/960);ctx.font=`400 ${shape==='portrait'?36:28}px system-ui`;ctx.fillText(document.querySelector('.obs2-now')?.textContent??'Recorded state',w/2,h-160,w-100);}
 onProgress(age<22000?'Recording replay…':'Adding the end card…');};draw();recorder.start(1000);interval=setInterval(draw,1000/30);timer=setTimeout(()=>recorder.stop(),24000);
 });}finally{clearInterval(interval);clearTimeout(timer);stream.getTracks().forEach(t=>t.stop());}
}
