import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('.',import.meta.url));
export default defineConfig({root,publicDir:'../../../apps/web/public',plugins:[react(),{name:'read-only-preview',configureServer(server){server.middlewares.use((req,res,next)=>{if(req.url?.startsWith('/api/')&&req.method!=='GET'){res.statusCode=405;res.end('Read-only design preview.');return;}next();});}}],resolve:{dedupe:['react','react-dom']},server:{host:'127.0.0.1',port:3260,strictPort:true,allowedHosts:['localhost','127.0.0.1'],fs:{allow:[fileURLToPath(new URL('../../../',import.meta.url))],deny:['**/.work/**','**/.git/**','**/.env*','**/data/**']},proxy:{'/api':{target:'http://localhost:3225',changeOrigin:true}}},build:{outDir:'../../../.work/obs0/dist',emptyOutDir:true}});
