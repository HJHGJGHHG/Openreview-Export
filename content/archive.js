(() => {
  const ns = window.__OR_EXPORT__;

  function segment(s) {
    return String(s).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 100) || 'file';
  }

  ns.archiveForum = async (data, progress) => {
    const { materials } = ns.renderForum(data);
    const files = Object.create(null);
    const local = new Map();
    const missing = [];
    let index = 0;
    for (const [url, item] of materials) {
      progress('Downloading ' + (++index) + ' / ' + materials.size);
      try {
        const res = await fetch(url, { credentials: 'include' });
        if (!res.ok) throw Error('HTTP ' + res.status);
        const mime = res.headers.get('content-type') || '';
        if (/text\/html/i.test(mime) && !/\.html?$/i.test(item.name) && !/^html?$/i.test(item.ext)) {
          throw Error('Received a web page instead of a file');
        }
        const bytes = new Uint8Array(await res.arrayBuffer());
        if (!bytes.length) throw Error('Empty response');
        const suffix = item.ext || /filename[^;]*\.([a-z0-9]{1,10})/i.exec(res.headers.get('content-disposition') || '')?.[1];
        const path = item.id === data.forum && new URL(url).pathname === '/pdf' && !files['paper.pdf']
          ? 'paper.pdf' : 'attachments/' + segment(item.id) + '/' + index + '-' + segment(item.name) + (suffix ? '.' + suffix : '');
        files[path] = bytes;
        local.set(url, path);
      } catch (err) {
        missing.push(item.id + ' / ' + item.name + '\n' + url + '\n' + err.message);
      }
    }
    files['forum.md'] = fflate.strToU8(ns.renderForum(data, local).markdown);
    if (missing.length) files['missing-files.txt'] = fflate.strToU8(missing.join('\n\n'));
    const bytes = fflate.zipSync(files, { level: 0 });
    return { blob: new Blob([bytes], {type:'application/zip'}), missing: missing.length };
  };
})();
