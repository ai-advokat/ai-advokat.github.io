import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const header = html.split('<header class="header">')[1]?.split('</header>')[0] ?? '';
const desktop = header.split('<nav class="links"')[1]?.split('</nav>')[0] ?? '';
const mobile = header.split('id="mobileMenu"')[1] ?? '';

test('desktop navigation retains brand and ordered Academy -> Social final', () => {
  assert.ok(header.indexOf('class="brand"') >= 0);
  const academy = desktop.indexOf('data-nav-folder="ecosystem"');
  const social = desktop.indexOf('data-nav-folder="social"');
  assert.ok(academy >= 0 && social > academy, 'Social must follow Academy');
  assert.equal(desktop.lastIndexOf('data-nav-folder='), social, 'Social must be the final folder');
});
test('desktop navigation does not wrap; constrained viewport uses mobile menu', () => {
  assert.match(html, /@media \(min-width:1480px\)\s*\{[\s\S]*?\.header \.links\{flex-wrap:nowrap;/);
  assert.match(html, /@media \(min-width:1021px\) and \(max-width:1479px\)\s*\{\s*\.header \.links\{display:none\}/);
  assert.match(html, /@media \(min-width:1021px\) and \(max-width:1479px\)[\s\S]*?\.header \.menuBtn\{display:block\}/);
  assert.doesNotMatch(html, /details\[data-nav-folder="social"\]\{transform:translateY\(/);
  assert.doesNotMatch(html, /details\[data-nav-folder="social"\]\{order:70;margin-left:auto/);
});
test('desktop and mobile social menus each have one Facebook and one YouTube link', () => {
  for (const block of [desktop, mobile]) {
    const socialBlock = block.split('data-nav-folder="social"')[1] ?? block.split('mobile-social-folder')[1];
    assert.ok(socialBlock, 'Social folder should exist');
    const segment = socialBlock.split('</details>')[0];
    assert.equal((segment.match(/facebook\.com\/profile\.php/g) ?? []).length, 1);
    assert.equal((segment.match(/youtube\.com\/channel\//g) ?? []).length, 1);
  }
});
test('footer retains official social links', () => {
  const footerSocial = html.split('class="footerSocial"')[1]?.split('</nav>')[0] ?? '';
  assert.match(footerSocial, /facebook\.com\/profile\.php/);
  assert.match(footerSocial, /youtube\.com\/channel\//);
});