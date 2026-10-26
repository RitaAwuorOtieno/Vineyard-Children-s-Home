document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('update-form');
  const list = document.getElementById('update-list');
  const status = document.getElementById('editor-status');
  const cancelButton = document.getElementById('cancel-edit');
  const content = { updates: [] };
  const categories = ['news', 'events', 'announcements'];

  function setStatus(message) { status.textContent = message; }

  function render() {
    list.replaceChildren();
    if (!content.updates.length) {
      const empty = document.createElement('p');
      empty.textContent = 'No updates loaded. Add an update or import an existing JSON file.';
      list.append(empty);
      return;
    }
    content.updates.forEach(function (item) {
      const row = document.createElement('article');
      row.className = 'admin-update-row';
      const title = document.createElement('h3');
      title.textContent = item.title;
      const details = document.createElement('p');
      details.textContent = item.date + ' · ' + item.category + (item.published ? ' · Published when deployed' : ' · Draft');
      const summary = document.createElement('p');
      summary.textContent = item.summary;
      const edit = document.createElement('button');
      edit.type = 'button'; edit.className = 'btn btn-outline'; edit.textContent = 'Edit';
      edit.addEventListener('click', function () {
        Object.keys(item).forEach(function (key) {
          const field = form.elements.namedItem(key);
          if (!field) return;
          if (field.type === 'checkbox') field.checked = Boolean(item[key]);
          else field.value = item[key] || '';
        });
        document.getElementById('form-title').textContent = 'Edit update';
        cancelButton.hidden = false;
        form.elements.title.focus();
      });
      const remove = document.createElement('button');
      remove.type = 'button'; remove.className = 'btn btn-outline'; remove.textContent = 'Remove';
      remove.addEventListener('click', function () {
        content.updates = content.updates.filter(function (update) { return update.id !== item.id; });
        render(); setStatus('Update removed from this editing session. Download the JSON to keep the change.');
      });
      row.append(title, details, summary, edit, remove);
      list.append(row);
    });
  }

  function loadData(data) {
    if (!data || !Array.isArray(data.updates)) throw new Error('The JSON must contain an updates array.');
    content.updates = data.updates.map(function (item) {
      if (!item || !item.title || !item.summary || !categories.includes(item.category)) throw new Error('Each update needs a title, summary, and valid category.');
      return {
        id: String(item.id || makeId()), title: String(item.title), category: item.category,
        date: String(item.date || ''), summary: String(item.summary), link: String(item.link || ''),
        linkLabel: String(item.linkLabel || ''), published: item.published !== false
      };
    });
    render(); setStatus('Loaded ' + content.updates.length + ' update(s).');
  }

  function makeId() { return 'update-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7); }

  function resetForm() {
    form.reset(); form.elements.id.value = ''; form.elements.published.checked = true;
    document.getElementById('form-title').textContent = 'Add an update';
    cancelButton.hidden = true;
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    const fields = new FormData(form);
    const link = String(fields.get('link') || '').trim();
    if (link && /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(link)) {
      setStatus('Use a page within this website for the update link.'); return;
    }
    const item = {
      id: String(fields.get('id') || makeId()), title: String(fields.get('title')).trim(),
      category: String(fields.get('category')), date: String(fields.get('date')).trim(),
      summary: String(fields.get('summary')).trim(), link: link,
      linkLabel: String(fields.get('linkLabel') || '').trim(), published: form.elements.published.checked
    };
    const existing = content.updates.findIndex(function (update) { return update.id === item.id; });
    if (existing >= 0) content.updates[existing] = item;
    else content.updates.unshift(item);
    resetForm(); render(); setStatus('Update saved in this editing session. Download the JSON to save it for the website.');
  });

  cancelButton.addEventListener('click', resetForm);
  document.getElementById('download-content').addEventListener('click', function () {
    const blob = new Blob([JSON.stringify({ updates: content.updates }, null, 2) + '\n'], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = 'site-content.json';
    link.click(); window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    setStatus('Downloaded site-content.json. Add it to the website folder and deploy to publish.');
  });
  document.getElementById('import-content').addEventListener('change', async function (event) {
    const file = event.target.files[0]; if (!file) return;
    try { loadData(JSON.parse(await file.text())); }
    catch (error) { setStatus('Could not load file: ' + error.message); }
  });

  render();
  fetch('site-content.json').then(function (response) {
    if (!response.ok) throw new Error('JSON file is not available.');
    return response.json();
  }).then(loadData).catch(function () {
    setStatus('Could not load updates automatically. Import site-content.json below, or add a new update.');
  });
});
