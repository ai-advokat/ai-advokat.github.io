import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read=p=>fs.readFileSync(p,"utf8");
const home=read("index.html");
const membership=read("membership.html");
const academy=read("academy/index.html");
const summit=read("summit/index.html");
const partners=read("partners/index.html");
const sitemap=read("sitemap.xml");

test("ABE1 public navigation exposes Academy, Summit and partnerships",()=>{
  for(const path of ["/academy/","/summit/","/partners/"]){
    assert.ok(home.includes(`href="${path}"`));
    assert.ok(membership.includes(`href="${path}"`));
  }
  assert.ok(home.includes('navAcademy:"Academy"'));
  assert.ok(home.includes('navSummit:"Summit"'));
  assert.ok(home.includes('navPartners:"Партнерства"'));
  assert.ok(home.includes('navPartners:"Partnerships"'));
});

test("ABE2 Academy implements four tracks and conference-to-workflow",()=>{
  for(const phrase of [
    "Legal Practice & Litigation",
    "Public Law & Compliance",
    "AI & Legal Intelligence",
    "Business & Corporate Law",
    "Официјални извори",
    "AI истражување",
    "Human Gate",
    "Template / export"
  ]) assert.ok(academy.includes(phrase),phrase);
});

test("ABE3 membership benefits are bounded and do not invent a current event price",()=>{
  assert.ok(academy.includes("Member pricing"));
  assert.ok(academy.includes("Group benefit"));
  assert.ok(academy.includes("секој трет учесник од истиот правен субјект е без котизација"));
  assert.ok(membership.includes("Членство + AI Advokat Academy"));
  assert.ok(membership.includes("OFFICE / Team"));
  assert.ok(membership.includes("до 5 места"));
  assert.doesNotMatch(academy,/25\.900|31\.900|36\.900|52\.900|57\.900|71\.900/);
});

test("ABE4 Summit is explicitly a concept, not a fabricated confirmed event",()=>{
  assert.ok(summit.includes("CONCEPT / INTEREST LIST"));
  assert.ok(summit.includes("нема објавен датум, локација, предавачи, хотелски аранжман или котизација"));
  assert.ok(summit.includes("Во моментов нема активна продажба или наплата за Summit"));
  for(const copied of ["Paragraf","Pellegrini","Kopaonik","Hotel Grand","29. nov","2. dec 2026"]){
    assert.ok(!summit.includes(copied),"unexpected competitor/event claim: "+copied);
  }
});

test("ABE5 partner programme protects legal independence",()=>{
  assert.ok(partners.includes("Партнерства без влијание врз правниот одговор"));
  assert.ok(partners.includes("не купува правен заклучок"));
  assert.ok(partners.includes("Примарните официјални извори имаат предност"));
  assert.ok(partners.includes("Human Gate"));
  assert.ok(partners.includes("нема да прикажува организација како клиент, партнер или спонзор без фактичка основа"));
});

test("ABE6 homepage presents the ecosystem without claiming confirmed Summit logistics",()=>{
  assert.ok(home.includes('id="ecosystem"'));
  assert.ok(home.includes("AI Advokat Academy"));
  assert.ok(home.includes("Legal Intelligence Summit"));
  assert.ok(home.includes("Стратешки партнерства"));
  assert.ok(home.includes("датум, место, предавачи и котизација не се сметаат за објавени"));
});

test("ABE7 sitemap indexes all new commercial ecosystem surfaces",()=>{
  for(const path of ["academy/","summit/","partners/"]){
    assert.ok(sitemap.includes("https://ai-advokat.github.io/"+path),path);
  }
});

test("ABE8 competitor identity and travel package are not copied into AI Advokat",()=>{
  const all=academy+"\n"+summit+"\n"+partners;
  for(const copied of ["Paragraf Lex","Pellegrini","Hotel Grand","Kopaonik","Fiskalni putokazi","Budžetski vrhovi","Kadrovski kompas"]){
    assert.ok(!all.includes(copied),"competitor-specific content leaked: "+copied);
  }
});
