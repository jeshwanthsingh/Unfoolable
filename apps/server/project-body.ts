import type {IncomingMessage} from 'node:http';
import {ProjectError} from './project-errors.ts';
const cached=new WeakMap<IncomingMessage,{promise:Promise<Record<string,unknown>>;size:()=>number}>();
export function projectBody(req: IncomingMessage, subject = 'registration', limit = 16384): Promise<Record<string, unknown>> {
  if (req.headers['content-type']?.split(';')[0]?.trim() !== 'application/json')
    return Promise.reject(new ProjectError('INVALID_REQUEST', `The ${subject} request requires JSON.`, 415));
  if (Number(req.headers['content-length']) > limit) {req.resume();return Promise.reject(new ProjectError('PAYLOAD_TOO_LARGE', `The ${subject} request is too large.`, 413));}
  const prior=cached.get(req);if(prior)return prior.promise.then(body=>{if(prior.size()>limit)throw new ProjectError('PAYLOAD_TOO_LARGE',`The ${subject} request is too large.`,413);return body;});
  let size=0;const promise=new Promise<Record<string,unknown>>((resolve, reject) => {
    const chunks: Buffer[] = []; let failed = false;
    req.on('data', (chunk: Buffer) => {
      if (failed) return; size += chunk.length;
      if (size > limit) {failed = true;chunks.length = 0;reject(new ProjectError('PAYLOAD_TOO_LARGE', `The ${subject} request is too large.`, 413));}
      else chunks.push(chunk);
    });
    req.on('end', () => {
      if (failed) return;
      try {
        const body: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Invalid object');
        resolve(body as Record<string, unknown>);
      } catch {reject(new ProjectError('INVALID_REQUEST', `Enter a valid ${subject} request.`, 400));}
    });
    req.on('error', () => reject(new ProjectError('INVALID_REQUEST', `The ${subject} request was interrupted.`, 400)));
    req.on('aborted', () => reject(new ProjectError('INVALID_REQUEST', `The ${subject} request was interrupted.`, 400)));
  });cached.set(req,{promise,size:()=>size});return promise;
}
