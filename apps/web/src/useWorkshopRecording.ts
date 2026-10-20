import {useCallback,useEffect,useRef,useState} from 'react';
/** Records only our rendered canvas. No screen, microphone, camera or upload. */
export function useWorkshopRecording(){
 const [recording,setRecording]=useState(false),[message,setMessage]=useState('');const owned=useRef<{recorder:MediaRecorder;stream:MediaStream;timer:ReturnType<typeof setTimeout>}|null>(null);
 const stop=useCallback(()=>{const run=owned.current;if(run&&run.recorder.state!=='inactive')run.recorder.stop();},[]);
 const start=useCallback((canvas:HTMLCanvasElement|null)=>{
  if(!canvas||owned.current){setMessage('Open the animated scene to record a clip.');return false;}
  if(typeof MediaRecorder==='undefined'||!canvas.captureStream){setMessage('This browser cannot record WebM. Try Chrome on your Mac.');return false;}
  const mime=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(t=>MediaRecorder.isTypeSupported(t));if(!mime){setMessage('WebM recording is not available in this browser.');return false;}
  try{const stream=canvas.captureStream(30),recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:2000000}),chunks:BlobPart[]=[];let bytes=0;
   recorder.ondataavailable=e=>{if(e.data.size){bytes+=e.data.size;if(bytes<=24*1024*1024)chunks.push(e.data);else stop();}};
   recorder.onstop=()=>{const run=owned.current;if(run)clearTimeout(run.timer);stream.getTracks().forEach(t=>t.stop());owned.current=null;setRecording(false);if(!bytes){setMessage('No video was recorded. Try again.');return;}const url=URL.createObjectURL(new Blob(chunks,{type:mime})),a=document.createElement('a');a.href=url;a.download='unfoolable-workshop-'+Date.now()+'.webm';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);setMessage('Clip saved. It contains the scene only, with no audio.');};
   recorder.onerror=()=>{setMessage('Recording stopped. Try again.');stop();};
   owned.current={recorder,stream,timer:setTimeout(stop,60000)};recorder.start(1000);setMessage('Recording this replay. Nothing is uploaded.');setRecording(true);return true;
  }catch{setMessage('Recording could not start. Try Chrome on your Mac.');return false;}
 },[stop]);
 useEffect(()=>{const changed=()=>{const r=owned.current?.recorder;if(document.hidden&&r?.state==='recording')r.pause();else if(!document.hidden&&r?.state==='paused')r.resume();};document.addEventListener('visibilitychange',changed);return()=>{document.removeEventListener('visibilitychange',changed);const run=owned.current;if(run){clearTimeout(run.timer);run.recorder.onstop=null;run.recorder.stop();run.stream.getTracks().forEach(t=>t.stop());owned.current=null;}};},[]);
 return {recording,message,start,stop};
}
