import test from "node:test";
import assert from "node:assert/strict";
import {matterWideSearch,validateMatterSearchRecord} from "../src/matter-search.js";

test("matter search requires source/page anchors",()=>{
  assert.equal(validateMatterSearchRecord({id:"R1",text:"исказ"},0).ok,false);
  assert.equal(validateMatterSearchRecord({id:"R1",text:"исказ",sourceId:"DOC-1",page:2},0).ok,true);
});

test("matter search is matter-bounded and source-linked",()=>{
  const records=[
    {id:"1",matterId:"CASE-A",sourceId:"DOC-1",page:2,title:"Исказ",text:"Сведокот наведува дека возилото било црвено."},
    {id:"2",matterId:"CASE-B",sourceId:"DOC-9",page:1,title:"Друг предмет",text:"Возилото било црвено."},
    {id:"3",matterId:"CASE-A",sourceId:"DOC-2",page:5,title:"Записник",text:"Возилото е опишано како сино."}
  ];
  const out=matterWideSearch(records,"боја на возилото црвено",{matterId:"CASE-A",limit:10});
  assert.equal(out.crossMatterSearch,false);
  assert.ok(out.results.length>=1);
  assert.ok(out.results.every(x=>x.matterId==="CASE-A"));
  assert.ok(out.results.every(x=>x.sourceId && x.page>0));
  assert.ok(!out.results.some(x=>x.sourceId==="DOC-9"));
});

test("source-less records are silently excluded from search results",()=>{
  const out=matterWideSearch([
    {id:"bad",text:"клучен доказ"},
    {id:"good",sourceId:"DOC-1",page:1,text:"клучен доказ"}
  ],"клучен доказ");
  assert.deepEqual(out.results.map(x=>x.id),["good"]);
});
