const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const fflate = require('../vendor/fflate-0.8.2.js');

function setup(fetch) {
  const ns = {};
  const context = vm.createContext({window: {__OR_EXPORT__: ns}, document: {querySelectorAll: () => []},
    fetch, URL, URLSearchParams, Blob, fflate, Uint8Array});
  for (const file of ['helpers', 'forum', 'archive']) {
    vm.runInContext(fs.readFileSync(require.resolve('../content/' + file), 'utf8'), context);
  }
  return ns;
}

const submission = {id:'s', forum:'s', content:{title:{value:'Example'}, pdf:{value:'/pdf/abc.pdf'}}};
const reply = {id:'r', forum:'s', replyto:'s', invitation:'Venue/-/Official_Review', content:{review:'Looks good'}};
const rebuttal = {id:'a', forum:'s', replyto:'r', invitations:['Venue/-/Rebuttal'],
  content:{response:{value:'Equation $x$'}, supplement:{value:'/attachment/x.zip'}}};

test('collects paginated replies independent of display order and links replies to parents', async () => {
  const ns = setup(async url => {
    const page = new URL(url).searchParams.get('offset') === '0' ? [rebuttal, submission] : [reply];
    return Response.json({count:3, notes:page});
  });
  const data = await ns.collectForum('s');
  assert.equal(data.warning, '');
  const { markdown } = ns.renderForum(data);
  assert.match(markdown, /Official Review[\s\S]+Rebuttal[\s\S]+Reply to \[r\][\s\S]+Equation \$x\$/);
});

test('falls back to legacy notes and reports interrupted pagination', async () => {
  const ns = setup(async url => {
    if (url.includes('api2.')) return Response.json({notes:[], count:0});
    if (url.includes('offset=0')) return Response.json({notes:[submission], count:2});
    return new Response('', {status:403});
  });
  const data = await ns.collectForum('s');
  assert.match(data.warning, /Partial.*403/);
  assert.equal(data.notes.size, 1);
});

test('archive contains matching local links, fetches repeated files once and reports missing bytes', async () => {
  const calls = [];
  const ns = setup(async url => {
    calls.push(url);
    return url.includes('id=b') ? new Response('', {status:404}) : new Response('fixture bytes');
  });
  const extra = {id:'b', forum:'s', replyto:'r', content:{
    supplement:'/attachment/another.zip', again:'[PDF](https://openreview.net/pdf?id=s)', site:'https://example.org/files.zip'}};
  const data = {title:'Test', forum:'s', notes:new Map([submission, reply, rebuttal, extra].map(n=>[n.id,n]))};
  const result = await ns.archiveForum(data, () => {});
  const files = fflate.unzipSync(new Uint8Array(await result.blob.arrayBuffer()));
  const md = fflate.strFromU8(files['forum.md']);
  assert.equal(result.missing, 1);
  assert.equal(calls.length, 3);
  assert.match(md, /\[PDF\]\(paper\.pdf\)/);
  const supplement = Object.keys(files).find(path => path.startsWith('attachments/a/'));
  assert.ok(supplement && md.includes('(' + supplement + ')'));
  assert.ok(md.includes('https://example.org/files.zip'));
  assert.match(fflate.strFromU8(files['missing-files.txt']), /id=b.*\nHTTP 404/);
});
