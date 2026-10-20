import'reflect-metadata';import{DataSource,EntitySchema,Table,type MigrationInterface,type QueryRunner}from'typeorm';import{mkdir}from'node:fs/promises';import path from'node:path';import type{StateRepository,StoredState}from'./repository';
const entity=(name:string,tableName:string,extra:Record<string,unknown>)=>new EntitySchema({name,tableName,columns:{id:{type:String,primary:true},...extra,payload:{type:'text'}}} as ConstructorParameters<typeof EntitySchema>[0]);
const Account=entity('Account','accounts',{email:{type:String,unique:true}});
const Request=entity('RepairAggregate','repair_requests',{ownerId:{type:String},status:{type:String}});
const Offer=entity('OfferAggregate','repair_offers',{requestId:{type:String},workshopId:{type:String},activeKey:{type:String,nullable:true,unique:true}});
const Session=entity('StoredSession','sessions',{userId:{type:String}});
const Meta=entity('StateMeta','state_meta',{});
export class InitialRepairLens1760950000000 implements MigrationInterface{
 name='InitialRepairLens1760950000000';
 async up(q:QueryRunner){for(const [name,extra]of [['accounts',[{name:'email',type:'varchar',isUnique:true}]],['repair_requests',[{name:'ownerId',type:'varchar'},{name:'status',type:'varchar'}]],['repair_offers',[{name:'requestId',type:'varchar'},{name:'workshopId',type:'varchar'},{name:'activeKey',type:'varchar',isNullable:true,isUnique:true}]],['sessions',[{name:'userId',type:'varchar'}]],['state_meta',[]]] as const)await q.createTable(new Table({name,columns:[{name:'id',type:'varchar',isPrimary:true},...extra,{name:'payload',type:'text'}]}),true);}
 async down(q:QueryRunner){for(const table of ['state_meta','sessions','repair_offers','repair_requests','accounts'])await q.dropTable(table);}
}
export class SqliteRepository implements StateRepository{
 kind='sqlite' as const;constructor(public db:DataSource){}
 static async open(filename:string){await mkdir(path.dirname(path.resolve(filename)),{recursive:true});const db=new DataSource({type:'sqljs',location:path.resolve(filename),autoSave:true,entities:[Account,Request,Offer,Session,Meta],migrations:[InitialRepairLens1760950000000],synchronize:false,logging:false});await db.initialize();await db.runMigrations({transaction:'all'});return new SqliteRepository(db);}
 async load():Promise<StoredState|null>{const meta=await this.db.getRepository('StateMeta').findOneBy({id:'sequence'});if(!meta)return null;const read=async(name:string)=>(await this.db.getRepository(name).find()).map(row=>JSON.parse(row.payload));return{accounts:await read('Account'),requests:await read('RepairAggregate'),offers:await read('OfferAggregate'),sessions:await read('StoredSession'),seq:JSON.parse(meta.payload)};}
 async save(state:StoredState){await this.db.transaction(async manager=>{for(const name of ['Account','RepairAggregate','OfferAggregate','StoredSession','StateMeta'])await manager.createQueryBuilder().delete().from(name).execute();const save=async(name:string,rows:unknown[])=>{if(rows.length)await manager.getRepository(name).save(rows);};await save('Account',state.accounts.map(u=>({id:u.id,email:u.email,payload:JSON.stringify(u)})));await save('RepairAggregate',state.requests.map(r=>({id:r.id,ownerId:r.ownerId,status:r.status,payload:JSON.stringify(r)})));await save('OfferAggregate',state.offers.map(o=>({id:o.id,requestId:o.requestId,workshopId:o.workshopId,activeKey:o.withdrawn?null:`${o.requestId}:${o.workshopId}`,payload:JSON.stringify(o)})));await save('StoredSession',state.sessions.map(s=>({id:s.token,userId:s.userId,payload:JSON.stringify(s)})));await save('StateMeta',[{id:'sequence',payload:JSON.stringify(state.seq)}]);});}
 async close(){if(this.db.isInitialized)await this.db.destroy();}
}
