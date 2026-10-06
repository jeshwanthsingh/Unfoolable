export class PlanningError extends Error {
 readonly code:string;readonly status:number;
 constructor(code:string,message:string,status=422){super(message);this.name='PlanningError';this.code=code;this.status=status;}
}
