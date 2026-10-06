export class AnalysisError extends Error {
 readonly code:string;readonly status:number;
 constructor(code:string,message:string,status=422){super(message);this.code=code;this.status=status;}
}
