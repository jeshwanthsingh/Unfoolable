import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
const root=fileURLToPath(new URL('../../',import.meta.url));
const port=process.env.COMMAND_CENTER_PORT??'3210';
export default defineConfig({
 root:resolve(root,'apps/web'),plugins:[react()],
 server:{host:'127.0.0.1',port:5173,strictPort:true,allowedHosts:['localhost'],
  fs:{strict:true,allow:[resolve(root,'apps/web'),resolve(root,'packages/shared'),resolve(root,'node_modules')],deny:['**/.env*','**/.git/**','**/*.{pem,key,sqlite,db}','**/data/**','**/artifacts/**']},
  proxy:{'/api':{target:`http://127.0.0.1:${port}`,changeOrigin:true}}
 },
 build:{outDir:resolve(root,'dist/web'),emptyOutDir:true}
});
