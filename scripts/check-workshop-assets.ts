import {readFileSync,realpathSync} from 'node:fs';
import {resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {workshopImages} from '../packages/shared/workshop-assets.ts';
export function checkWorkshopAssets(root:string){
 for(const name of workshopImages){const file=resolve(root,'workshop-pixel',name+'.png');
  if(!realpathSync(file).startsWith(realpathSync(root)+sep))throw Error('Workshop image escapes build output: '+name);
  if(!readFileSync(file).subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw Error('Invalid Workshop PNG: '+name);
 }
 return workshopImages.length;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log('Workshop build images checked: '+checkWorkshopAssets(resolve('dist/web')));
