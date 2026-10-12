export type TicketLimits={maxCommands:number;maxMinutes:number;maxCodexTokens:number};
export const TICKET_LIMITS:Readonly<TicketLimits>=Object.freeze({maxCommands:80,maxMinutes:15,maxCodexTokens:100000});
