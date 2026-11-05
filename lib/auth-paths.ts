export function safeNext(value:string|null) {return value && ['/', '/join', '/setup', '/reset-password'].includes(value) ? value : '/';}
