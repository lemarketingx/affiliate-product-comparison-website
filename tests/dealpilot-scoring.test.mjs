import test from "node:test";
import assert from "node:assert/strict";
import { assessProduct } from "../lib/aliexpress/scoring.ts";

const valid = {
  price:"9.90",currency:"USD",image:"https://ae01.alicdn.com/sample.jpg",
  productUrl:"https://www.aliexpress.com/item/123.html",
  affiliateUrl:"https://s.click.aliexpress.com/e/example",orders:1200,commissionRate:"5%",
};

test("complete product gets the maximum data-readiness score",()=>{
  const result=assessProduct(valid);
  assert.equal(result.score,100);
  assert.equal(result.status,"review");
  assert.deepEqual(result.blockers,[]);
});

test("missing tracked promotion link requires review, not automatic promotion",()=>{
  const result=assessProduct({...valid,affiliateUrl:null});
  assert.equal(result.status,"insufficient_data");
  assert.ok(result.blockers.some(b=>b.includes("קישור קידום")));
  assert.ok(result.score<100);
});

test("invalid or missing prices do not earn pricing points",()=>{
  const result=assessProduct({...valid,price:"not-price"});
  assert.equal(result.score,80);
  assert.equal(result.status,"insufficient_data");
});

test("missing supplier sales volume reduces evidence score",()=>{
  const result=assessProduct({...valid,orders:null});
  assert.equal(result.score,75);
  assert.ok(result.blockers.some(b=>b.includes("הזמנות")));
});
