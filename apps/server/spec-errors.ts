export class SpecError extends Error{
 readonly code:string;readonly status:number;
 constructor(code:string,message:string,status=409){super(message);this.name='SpecError';this.code=code;this.status=status;}
}
