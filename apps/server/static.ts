import {existsSync,readFileSync,realpathSync} from 'node:fs';
import {resolve,sep} from 'node:path';
import type {ServerResponse} from 'node:http';

export function serveWeb(pathname:string,root:string,response:ServerResponse):boolean {
 let file:string;
 if(pathname==='/')file=resolve(root,'index.html');
 else if(pathname==='/mark.svg')file=resolve(root,'mark.svg');
 else if(/^\/assets\/[a-zA-Z0-9_-]+\.(js|css|svg|woff2)$/.test(pathname))file=resolve(root,'.'+pathname);
 else return false;
 if(!existsSync(file))return false;
 if(!realpathSync(file).startsWith(realpathSync(root)+sep))return false;
 const ext=file.split('.').at(-1);const type=ext==='html'?'text/html; charset=utf-8':ext==='js'?'text/javascript; charset=utf-8':ext==='css'?'text/css; charset=utf-8':ext==='svg'?'image/svg+xml':'font/woff2';
 response.writeHead(200,{'Content-Type':type,'Cache-Control':ext==='html'?'no-cache':'public, max-age=31536000, immutable'});response.end(readFileSync(file));return true;
}
