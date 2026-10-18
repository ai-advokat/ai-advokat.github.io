import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const html=fs.readFileSync("index.html","utf8");

function desktopNav(){
  const start=html.indexOf('<nav class="links"');
  const end=html.indexOf("</nav>",start);
  assert.ok(start>=0 && end>start,"desktop nav must exist");
  return html.slice(start,end);
}

test("NAV1 desktop navigation contains each primary expansion item once",()=>{
  const nav=desktopNav();
  for(const href of ["/academy/","/summit/","/partners/","/membership.html"]){
    const needle='href="'+href+'"';
    assert.equal(nav.split(needle).length-1,1,href+" must appear exactly once in desktop nav");
  }
});

test("NAV2 desktop navigation is left aligned and uses uniform bold typography",()=>{
  assert.ok(html.includes("justify-content:flex-start"));
  assert.ok(html.includes("font-size:.92rem;\n      font-weight:750;"));
  assert.ok(html.includes("font-size:inherit;\n      font-weight:inherit;\n      white-space:nowrap"));
});

test("NAV3 desktop header uses near-full viewport width",()=>{
  assert.ok(html.includes("width:calc(100% - 24px);"));
  assert.ok(html.includes("max-width:none;"));
  assert.ok(html.includes("margin-left:12px;"));
  assert.ok(html.includes("margin-right:12px;"));
});

test("NAV4 mobile menu includes the same added product links",()=>{
  const start=html.indexOf('id="mobileMenu"');
  const end=html.indexOf("</header>",start);
  assert.ok(start>=0 && end>start,"mobile menu must exist");
  const menu=html.slice(start,end);
  for(const href of ["/academy/","/summit/","/partners/","/membership.html"]){
    assert.ok(menu.includes('href="'+href+'"'),href+" must exist in mobile menu");
  }
});
