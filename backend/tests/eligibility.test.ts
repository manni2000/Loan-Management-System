import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eligibility, quote, type Personal } from '../src/services/eligibility.js';
const now = new Date('2026-10-10T12:00:00Z');
const valid: Personal = { fullName:'Test Borrower', pan:'ABCPD1234E', dob:'1993-06-15', monthlySalary:25000, employment:'Salaried' };
test('BRE applies exact inclusive age and salary boundaries', () => {
  assert.equal(eligibility({...valid,dob:'2003-10-10'},now).eligible,true);
  assert.equal(eligibility({...valid,dob:'2003-10-11'},now).eligible,false);
  assert.equal(eligibility({...valid,dob:'1975-10-11'},now).eligible,true);
  assert.equal(eligibility({...valid,dob:'1975-10-10'},now).eligible,false);
  assert.equal(eligibility({...valid,monthlySalary:24999.99},now).eligible,false);
  assert.equal(eligibility({...valid,employment:'Self-Employed'},now).eligible,true);
});
test('BRE reports all failures and rejects invalid calendar dates', () => {
  const result = eligibility({...valid,pan:'ABCDE12345',dob:'2000-02-30',monthlySalary:1,employment:'Unemployed'},now);
  assert.equal(result.failures.length,4);
  assert.equal(eligibility({...valid,pan:'ABCD1234E'},now).eligible,false);
});
test('quotes use fixed simple interest rounded to integer paise', () => {
  assert.deepEqual(quote(100000,365),{ principalPaise:10000000,interestPaise:1200000,totalPaise:11200000,rate:12,tenure:365 });
  const q=quote(50000,30); assert.equal(q.interestPaise,49315); assert.equal(q.totalPaise,5049315);
});
