import {AsyncLocalStorage} from 'node:async_hooks';
import {fixtureApprovalsEnabled} from './data-mode.ts';
import {SpecError} from './spec-errors.ts';
export type HumanScope={item:string;action:string};
export type HumanReceipt={id:string;credentialId:string;evidenceHash:string;scope:HumanScope;revalidate:()=>void};
const context=new AsyncLocalStorage<HumanReceipt|null>();
const used=new WeakSet<HumanReceipt>();
export const withHumanReceipt=<T>(receipt:HumanReceipt|null,work:()=>T)=>context.run(receipt,work);
export const enterHumanReceipt=(receipt:HumanReceipt)=>context.enterWith(receipt);
export function requireHuman(dataDir:string,expected:HumanScope){const receipt=context.getStore();if(receipt){if(receipt.scope.item!==expected.item||receipt.scope.action!==expected.action)throw new SpecError('WRONG_CONFIRMATION','Passkey confirmation belongs to another item or action.',403);if(used.has(receipt))throw new SpecError('STALE_CONFIRMATION','This confirmation was already used.',403);receipt.revalidate();used.add(receipt);return receipt;}if(fixtureApprovalsEnabled(dataDir))return null;throw new SpecError('PASSKEY_REQUIRED','Confirm this decision with your registered passkey.',403);}
