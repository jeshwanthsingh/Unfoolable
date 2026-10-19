export type TicketLimits={maxCommands:number;maxMinutes:number;maxCodexTokens:number;maxWriterTokens?:number};
export const TICKET_LIMITS:Readonly<TicketLimits>=Object.freeze({maxCommands:80,maxMinutes:15,maxCodexTokens:120000,maxWriterTokens:40000});
export const BUDGET_EXTENSION=Object.freeze({maxCommands:40,maxMinutes:5,maxCodexTokens:50000,maxWriterTokens:20000});
