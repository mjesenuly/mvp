import type{MockService}from'../frontend/src/service';
export type Session={token:string;csrf:string;userId:string;expires:number};
export type StoredState={accounts:MockService['accounts'];requests:MockService['requests'];offers:MockService['offers'];seq:number;sessions:Session[]};
export interface StateRepository{kind:'memory'|'sqlite';load():Promise<StoredState|null>;save(state:StoredState):Promise<void>;close():Promise<void>}
export class MemoryRepository implements StateRepository{kind='memory' as const;state:StoredState|null=null;async load(){return this.state?structuredClone(this.state):null;}async save(s:StoredState){this.state=structuredClone(s);}async close(){}}
