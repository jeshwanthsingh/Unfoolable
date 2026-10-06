export class BuildError extends Error {
 code:string;status:number;
 constructor(code:string,message:string,status=409){super(message);this.name='BuildError';this.code=code;this.status=status;}
}
