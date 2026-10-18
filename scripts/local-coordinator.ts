// The launcher records kernel identity before releasing coordinator startup.
const deadline=setTimeout(()=>process.exit(1),10000);
process.once('message',async message=>{if(message!=='start')return;clearTimeout(deadline);process.disconnect?.();await import('../apps/server/main.ts');});
