(() => {
  const ns = window.__OR_EXPORT__;
  const site = 'https://openreview.net';
  const link = (forum, id) => site + '/forum?' + new URLSearchParams({ id: forum, noteId: id });

  function visibleNotes(forum) {
    const result = new Map();
    for (const el of document.querySelectorAll('main .note[data-id], #forum-replies .note[data-id], .forum-replies-container .note[data-id]')) {
      const id = el.dataset.id;
      const own = selector => [...el.querySelectorAll(selector)].filter(x => x.closest('.note[data-id]') === el);
      const content = Object.create(null);
      const root = own('.note-content')[0];
      for (const row of root?.children || []) {
        const key = row.querySelector('.note-content-field')?.textContent.trim().replace(/:$/, '');
        if (key) content[key] = ns.extractTextWithMath(row.querySelector('.note-content-value') || row);
      }
      if (!Object.keys(content).length && root) content.Text = ns.extractTextWithMath(root);
      const files = own('a[href]').map(a => a.href).filter(isFile);
      if (files.length) content.Files = [...new Set(files)].join('\n');
      result.set(id, { id, forum, content, replyto: el.parentElement?.closest('.note[data-id]')?.dataset.id,
        invitation: own('.invitation')[0]?.innerText || own('.heading h4')[0]?.innerText,
        signatures: [own('.signatures')[0]?.innerText].filter(Boolean) });
    }
    return result;
  }

  async function collectForum(forum) {
    const visible = visibleNotes(forum);
    const notes = new Map();
    let warning = '';
    try {
      for (const host of ['api2.openreview.net', 'api.openreview.net']) {
        let offset = 0;
        for (;;) {
          const params = new URLSearchParams({ forum, offset, limit: 200 });
          const res = await fetch('https://' + host + '/notes?' + params, { credentials: 'include' });
          if (res.status === 404 && !offset && host.startsWith('api2.')) break;
          if (!res.ok) throw Error('Notes API returned HTTP ' + res.status);
          const page = await res.json();
          if (!Array.isArray(page.notes)) throw Error('Invalid notes response');
          if (!page.notes.length) {
            if (offset < page.count) throw Error('Pagination stopped early');
            break;
          }
          const before = notes.size;
          for (const n of page.notes) if (n.forum === forum && n.id) notes.set(n.id, n);
          if (notes.size === before) throw Error('Pagination made no progress');
          offset += page.notes.length;
          if (offset >= page.count) {
            if (notes.size < page.count) throw Error('Incomplete page of notes');
            break;
          }
        }
        if (notes.size) break;
      }
      if (!notes.has(forum) || [...visible.keys()].some(id => !notes.has(id))) {
        throw Error('Some visible notes were missing from the API');
      }
    } catch (err) {
      warning = 'Partial forum export. ' + err.message;
      for (const [id, note] of visible) if (!notes.has(id)) notes.set(id, note);
    }
    if (!notes.size) throw Error(warning || 'No readable notes found');
    const title = ns.unwrapOpenReviewField(notes.get(forum)?.content?.title) || ns.getPaperTitleFromDom();
    return { forum, title, notes, warning };
  }

  function isFile(value) {
    try {
      const u = new URL(value, site);
      return ['https://openreview.net', 'https://www.openreview.net', 'https://api.openreview.net', 'https://api2.openreview.net'].includes(u.origin)
        && ['/pdf', '/attachment'].includes(u.pathname) && !!u.searchParams.get('id') && !u.username && !u.password;
    } catch { return false; }
  }

  function render(data, local = new Map()) {
    const { forum, title, notes, warning } = data;
    const materials = new Map();
    const lines = ['# ' + title, '[Forum](' + link(forum, forum) + ')', warning];
    const children = new Map();
    for (const n of notes.values()) {
      if (!children.has(n.replyto)) children.set(n.replyto, []);
      children.get(n.replyto).push(n);
    }
    const seen = new Set();
    function visit(n) {
      if (!n || seen.has(n.id)) return;
      seen.add(n.id);
      const type = (n.invitations?.[0] || n.invitation || 'Reply').split('/-/').pop().replaceAll('_', ' ');
      lines.push('## ' + (n.id === forum ? 'Submission' : type), '[Note ' + n.id + '](' + link(forum, n.id) + ')');
      if (n.replyto) lines.push('Reply to [' + n.replyto + '](' + link(forum, n.replyto) + ')');
      if (n.signatures?.length) lines.push(n.signatures.join(', '));
      for (const [key, field] of Object.entries(n.content || {})) {
        let value = String(ns.unwrapOpenReviewField(field));
        const upload = /^\/(?:pdf|attachment)\//.test(value);
        const ext = upload && value.match(/\.([a-z0-9]{1,10})$/i)?.[1];
        if (upload) value = key === 'pdf' ? site + '/pdf?' + new URLSearchParams({id:n.id})
          : site + '/attachment?' + new URLSearchParams({id:n.id, name:key});
        value = value.replace(/(?:https?:\/\/[^\s<>()\]]+|(?<![\w/])\/(?:pdf|attachment)\?[^\s<>()\]]+)/g, raw => {
          if (!isFile(raw)) return raw;
          const url = new URL(raw, site).href;
          const u = new URL(url);
          const name = u.searchParams.get('name') || (u.pathname === '/pdf' ? 'paper' : key);
          if (!materials.has(url)) materials.set(url, {id:n.id, name, ext: ext || (u.pathname === '/pdf' ? 'pdf' : '')});
          const dest = local.get(url) || url;
          // Bare file URLs need clickable Markdown links in an offline archive.
          return raw === value || key === 'Files' ? '[Download](' + dest + ')' : dest;
        });
        if (value) lines.push('### ' + key.replaceAll('_', ' '), value);
      }
      for (const child of children.get(n.id) || []) visit(child);
    }
    visit(notes.get(forum));
    for (const n of notes.values()) visit(n);
    return { markdown: lines.filter(Boolean).join('\n\n') + '\n', materials };
  }

  ns.collectForum = collectForum;
  ns.renderForum = render;
})();
