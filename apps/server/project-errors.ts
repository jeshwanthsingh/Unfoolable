import type {ProjectErrorCode} from '../../packages/shared/projects.ts';
export class ProjectError extends Error {
  readonly code: ProjectErrorCode;
  readonly status: number;
  constructor(code: ProjectErrorCode, message: string, status: number) {
    super(message); this.code = code; this.status = status;
  }
}
