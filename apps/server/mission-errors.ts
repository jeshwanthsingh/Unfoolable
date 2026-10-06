import type {MissionErrorCode} from '../../packages/shared/missions.ts';
export class MissionError extends Error {
  readonly code: MissionErrorCode;
  readonly status: number;
  constructor(code: MissionErrorCode, message: string, status: number) {
    super(message); this.code = code; this.status = status;
  }
}
