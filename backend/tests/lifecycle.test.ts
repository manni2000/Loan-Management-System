import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import bcrypt from 'bcrypt';
import { rm, mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { config } from '../src/config.js';
import { User, roles } from '../src/models/User.js';
import { Loan } from '../src/models/Loan.js';
import { app } from '../src/app.js';
let mongo: MongoMemoryServer;
const agents: Record<string, any> = {};
const tempUploads = path.join(os.tmpdir(),'lumen-test-'+Date.now());
before(async () => {
  config.secret = 'test-secret-that-is-at-least-thirty-two-characters';
  config.uploads = tempUploads; await mkdir(tempUploads,{recursive:true});
  mongo=await MongoMemoryServer.create(); await mongoose.connect(mongo.getUri());
  await Promise.all([User.init(),Loan.init()]);
  const password=await bcrypt.hash('Lumen@123',4);
  for(const role of roles) {
    await User.create({ name:role,email:role.toLowerCase()+'@test.com',password,role });
    const agent=request.agent(app); agents[role]=agent;
    const response=await agent.post('/api/auth/login').send({email:role.toLowerCase()+'@test.com',password:'Lumen@123'});
    assert.equal(response.status,200); assert.equal(response.body.user.role,role);
    assert.ok(response.headers['set-cookie'][0].includes('HttpOnly'));
  }
}, {timeout:180000});
after(async () => { await mongoose.disconnect(); if(mongo)await mongo.stop(); await rm(tempUploads,{recursive:true,force:true}); });
test('RBAC rejects all cross-role module requests and unauthenticated access',async()=>{
  for(const role of roles) for(const module of ['Sales','Sanction','Disbursement','Collection']) {
    const response=await agents[role].get(`/api/${module.toLowerCase()}/${module==='Sales'?'leads':'loans'}`);
    assert.equal(response.status,role==='Admin'||role===module?200:403,`${role} -> ${module}`);
  }
  assert.equal((await request(app).get('/api/borrower/application')).status,401);
  assert.equal((await agents.Admin.get('/api/borrower/application')).status,403);
  assert.equal((await agents.Borrower.get('/api/operations/overview')).status,403);
});
test('registration cannot elevate role; password is hashed and hidden',async()=>{
  const response=await request(app).post('/api/auth/register').send({name:'New User',email:'new@test.com',password:'Lumen@123',role:'Admin'});
  assert.equal(response.status,201); assert.equal(response.body.user.role,'Borrower'); assert.equal(response.body.user.password,undefined);
  const user=await User.findOne({email:'new@test.com'}).select('+password');
  assert.notEqual(user!.password,'Lumen@123'); assert.equal(await bcrypt.compare('Lumen@123',user!.password),true);
  assert.equal((await request(app).post('/api/auth/register').send({name:'New User',email:'new@test.com',password:'Lumen@123'})).status,409);
});
test('complete lifecycle validates eligibility, upload, decisions, unique UTR and closure',async()=>{
  const borrower=agents.Borrower;
  const details={fullName:'Test Borrower',pan:'ABCPD1234E',dob:'1993-06-15',monthlySalary:45000,employment:'Salaried'};
  assert.equal((await borrower.put('/api/borrower/personal').send({...details,monthlySalary:10000})).status,422);
  assert.equal((await borrower.post('/api/borrower/loans').send({amount:100000,tenure:365})).status,422);
  assert.equal((await borrower.put('/api/borrower/personal').send(details)).status,200);
  assert.equal((await borrower.post('/api/borrower/salary-slip').attach('file',Buffer.from('bad'),'bad.pdf')).status,422);
  assert.equal((await borrower.post('/api/borrower/salary-slip').attach('file',Buffer.alloc(5*1024*1024+1),'large.pdf')).status,422);
  assert.equal((await borrower.post('/api/borrower/salary-slip').attach('file',Buffer.from('%PDF-1.4\nTest'),'salary.pdf')).status,201);
  const created=await borrower.post('/api/borrower/loans').send({amount:100000,tenure:365,totalPaise:1,status:'CLOSED'});
  assert.equal(created.status,201); assert.equal(created.body.loan.totalPaise,11200000); assert.equal(created.body.loan.status,'APPLIED');
  const id=created.body.loan._id; const borrowerId=created.body.loan.borrower;
  assert.equal((await borrower.post('/api/borrower/loans').send({amount:100000,tenure:365})).status,409);
  assert.equal((await borrower.put('/api/borrower/personal').send(details)).status,409);
  assert.equal((await agents.Sales.get(`/api/documents/${borrowerId}`)).status,403);
  assert.equal((await agents.Sanction.get(`/api/documents/${borrowerId}`)).status,200);
  assert.equal((await agents.Disbursement.patch(`/api/disbursement/loans/${id}/disburse`).send({})).status,409);
  assert.equal((await agents.Collection.post(`/api/collection/loans/${id}/payments`).send({utr:'TESTUTR1',amount:1,date:'2026-10-10'})).status,409);
  assert.equal((await agents.Sanction.patch(`/api/sanction/loans/${id}/decision`).send({decision:'reject',reason:''})).status,422);
  assert.equal((await agents.Sanction.patch(`/api/sanction/loans/${id}/decision`).send({decision:'approve'})).body.loan.status,'SANCTIONED');
  assert.equal((await agents.Sanction.patch(`/api/sanction/loans/${id}/decision`).send({decision:'approve'})).status,409);
  const disbursed=await agents.Disbursement.patch(`/api/disbursement/loans/${id}/disburse`).send({});
  assert.equal(disbursed.body.loan.status,'DISBURSED'); assert.ok(disbursed.body.loan.dueAt);
  const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const pay=(utr:string,amount:number,dateValue=date)=>agents.Collection.post(`/api/collection/loans/${id}/payments`).send({utr,amount,date:dateValue});
  assert.equal((await pay('TESTUTR1',0)).status,422);
  assert.equal((await pay('TESTUTR1',112000.01)).status,422);
  assert.equal((await pay('TESTUTR1',1,'2099-01-01')).status,422);
  assert.equal((await pay('TESTUTR1',1,'2026-02-30')).status,422);
  assert.equal((await pay('TESTUTR1',1.001)).status,422);
  assert.equal((await pay('TESTUTR1',12000)).status,201);
  assert.equal((await pay('testutr1',12000)).status,409);
  const paid=await pay('TESTUTR2',100000);
  assert.equal(paid.status,201); assert.equal(paid.body.loan.status,'CLOSED'); assert.equal(paid.body.loan.outstandingPaise,0);
  assert.equal((await pay('TESTUTR3',1)).status,409);
  const other=await User.create({name:'Other',email:'other@test.com',password:'unused',role:'Borrower'});
  const another=await Loan.create({borrower:other._id,reference:'TEST-OTHER',principalPaise:10000000,interestPaise:1200000,totalPaise:11200000,tenure:365,status:'DISBURSED',disbursedAt:new Date()});
  assert.equal((await agents.Collection.post(`/api/collection/loans/${another._id}/payments`).send({utr:'TESTUTR1',amount:1,date})).status,409);
  assert.equal((await Loan.findById(another._id))!.paidPaise,0);
  // Two concurrent full payments cannot overpay or double-close.
  const responses=await Promise.all(['CONCURRENT1','CONCURRENT2'].map(utr=>agents.Collection.post(`/api/collection/loans/${another._id}/payments`).send({utr,amount:112000,date})));
  assert.deepEqual(responses.map(r=>r.status).sort(),[201,409]);
  assert.equal((await Loan.findById(another._id))!.paidPaise,11200000);
  const leads=await agents.Sales.get('/api/sales/leads'); assert.ok(!leads.body.leads.some((l:any)=>l._id===borrowerId));
});
test('rejection is terminal and API protects against hostile origins',async()=>{
  const user=await User.create({name:'Reject',email:'reject@test.com',password:'unused',role:'Borrower'});
  const loan=await Loan.create({borrower:user._id,reference:'TEST-REJECT',principalPaise:5000000,interestPaise:100,totalPaise:5000100,tenure:30});
  const response=await agents.Sanction.patch(`/api/sanction/loans/${loan._id}/decision`).send({decision:'reject',reason:'Unable to verify income.'});
  assert.equal(response.body.loan.status,'REJECTED'); assert.equal(response.body.loan.rejectionReason,'Unable to verify income.');
  assert.equal((await agents.Disbursement.patch(`/api/disbursement/loans/${loan._id}/disburse`).send({})).status,409);
  assert.equal((await agents.Admin.post('/api/auth/logout').set('Origin','https://evil.example').send({})).status,403);
  assert.equal((await agents.Admin.post('/api/auth/logout').send({})).status,200);
  assert.equal((await agents.Admin.get('/api/operations/overview')).status,401);
});
