import { auth, db, storage, firebaseReady, safeFirebaseMessage, firebaseSdk } from './firebase-client.js';
const { onAuthStateChanged, signOut, collection, doc, getDoc, getDocs, limit, query, serverTimestamp, setDoc, deleteDoc, updateDoc, ref, uploadBytes, deleteObject, getBlob } = firebaseSdk;

const sections = {
  announcements: { label: 'News & announcements', fields: [['title','Title','text'],['category','Category','select-news'],['body','Content','textarea'],['dateLabel','Date or date label','text'],['imageAlt','Image alternative text','text'],['file','Optional approved image (JPG, PNG, or WebP; max 5 MB)','file-image'],['published','Published','checkbox']], upload: true, public: true },
  gallery: { label: 'Gallery', fields: [['image','Photo','gallery-image'],['published','Show in public gallery','checkbox']], upload: true, public: true },
  documents: { label: 'Public documents', fields: [['title','Document title','text'],['description','Description','textarea'],['category','Category','text'],['dateLabel','Upload date or date label','text'],['published','Published','checkbox'],['file','Approved public PDF (max 10 MB)','file-pdf']], upload: true, public: true },
  pages: { label: 'Page content blocks', fields: [['slug','Page name (for example home or about)','text'],['title','Section heading','text'],['body','Public text','textarea'],['published','Published','checkbox']], public: true },
  team: { label: 'Team profiles', fields: [['name','Name','text'],['position','Position','text'],['biography','Approved public biography','textarea'],['photoAlt','Photo alternative text','text'],['file','Approved public photo (JPG, PNG, or WebP; max 5 MB)','file-image'],['published','Published','checkbox']], upload: true, public: true },
  testimonials: { label: 'Testimonials', fields: [['name','Approved display name (optional)','text'],['quote','Approved public quote','textarea'],['published','Published','checkbox']], public: true },
  support: { label: 'Donations & support information', fields: [['title','Heading','text'],['body','Confirmed giving or support details','textarea'],['category','Category','text'],['published','Published','checkbox']], public: true },
  enquiries: { label: 'Private enquiries', readOnly: true, fields: [] }
};

const galleryImageLibrary = [
  { src: 'images/vineyard@1.jpeg', name: 'Existing gallery photo 1', alt: 'Children sharing a meal under a covered outdoor area' },
  { src: 'images/vineyard@2.jpeg', name: 'Existing gallery photo 2', alt: 'Children and caregivers gathered around a shared meal' },
  { src: 'images/vineyard@3.jpeg', name: 'Existing gallery photo 3', alt: 'Caregivers serving food to children' },
  { src: 'images/Vineyard@4.jpeg', name: 'Existing gallery photo 4', alt: 'Caregiver serving a child from a shared meal' },
  { src: 'images/Vineyard@5.jpeg', name: 'Existing gallery photo 5', alt: 'Children standing together in school uniforms' },
  { src: 'images/vineyard@6.jpeg', name: 'Existing gallery photo 6', alt: 'Children smiling and spending time together' },
  { src: 'images/vineyard@7.jpeg', name: 'Existing gallery photo 7', alt: 'Children sitting together with snack packets' },
  { src: 'images/vineyard@8.jpeg', name: 'Existing gallery photo 8', alt: 'Children in school uniforms gathered outside' },
  { src: 'images/WhatsApp Image 2026-10-16 at 17.57.27.jpeg', name: 'Existing gallery photo 9', alt: 'Children gathered together indoors' }
];

const status = document.getElementById('dashboard-status');
const nav = document.getElementById('admin-sections');
const list = document.getElementById('record-list');
const form = document.getElementById('record-form');
let activeSection = 'announcements'; let records = []; let currentUser = null; let currentId = '';

form.addEventListener('invalid', function (event) {
  const label = event.target.closest('label');
  const fieldName = label ? label.firstChild.textContent.trim() : 'a required field';
  setStatus('Please complete ' + fieldName + ' before saving.');
}, true);

function setStatus(message) { status.textContent = message; }
function el(tag, text, className) { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (className) node.className = className; return node; }
function showSafeError(error) { setStatus(safeFirebaseMessage(error)); }

Object.entries(sections).forEach(function ([key, item]) {
  const button = document.createElement('button'); button.type = 'button'; button.className = 'admin-section-button'; button.textContent = item.label;
  button.dataset.sectionKey = key;
  button.addEventListener('click', function () { openSection(key); }); nav.append(button);
});
const overviewButton = document.createElement('button'); overviewButton.type = 'button'; overviewButton.className = 'admin-section-button'; overviewButton.dataset.sectionKey = 'overview'; overviewButton.textContent = 'Overview';
overviewButton.addEventListener('click', showOverview); nav.prepend(overviewButton);

document.getElementById('logout').addEventListener('click', async function () {
  try { await signOut(auth); window.location.replace('admin-login.html'); }
  catch (error) { showSafeError(error); }
});

onAuthStateChanged(auth, async function (user) {
  if (!firebaseReady) { setStatus('Firebase is not configured. Complete the Firebase setup in README.md.'); return; }
  if (!user) { window.location.replace('admin-login.html'); return; }
  currentUser = user;
  try {
    const adminRecord = await getDoc(doc(db, 'admins', user.uid));
    if (!adminRecord.exists() || adminRecord.data().active !== true) {
      await signOut(auth); setStatus('This account is not authorized for the admin dashboard.');
      window.setTimeout(function () { window.location.replace('admin-login.html'); }, 1300); return;
    }
    document.getElementById('admin-user').textContent = user.email || 'Administrator';
    setStatus('Signed in. Your permissions are enforced by Firebase security rules.');
    await showOverview();
  } catch (error) { showSafeError(error); }
});

async function showOverview() {
  document.querySelectorAll('.admin-section-button').forEach(function (button) { button.setAttribute('aria-current', button.dataset.sectionKey === 'overview' ? 'page' : 'false'); });
  document.getElementById('overview-panel').hidden = false;
  document.getElementById('manager-panel').hidden = true;
  const counts = document.getElementById('dashboard-counts'); counts.replaceChildren();
  const recent = [];
  for (const key of Object.keys(sections)) {
    try {
      const snapshot = await getDocs(query(collection(db, key), limit(100)));
      const published = snapshot.docs.filter(function (item) { return item.data().published === true; }).length;
      const card = el('article', undefined, 'card'); card.append(el('h3', sections[key].label), el('p', published + ' published · ' + snapshot.size + ' loaded (max 100)')); counts.append(card);
      snapshot.docs.forEach(function (item) { const data = item.data(); if (data.updatedAt) recent.push({ title: data.title || data.name || sections[key].label, time: data.updatedAt.toDate(), type: sections[key].label }); });
    } catch (_) { const card = el('article', undefined, 'card'); card.append(el('h3', sections[key].label), el('p', 'Unavailable')); counts.append(card); }
  }
  const actions = document.getElementById('quick-actions'); actions.replaceChildren();
  ['announcements','gallery','documents','enquiries'].forEach(function (key) { const button = el('button', 'Manage ' + sections[key].label, 'btn btn-blue'); button.type = 'button'; button.addEventListener('click', function () { openSection(key); }); actions.append(button); });
  recent.sort(function (a,b) { return b.time-a.time; });
  const recentList = document.getElementById('recent-content'); recentList.replaceChildren();
  if (!recent.length) recentList.append(el('p', 'No recent edits yet.'));
  else recent.slice(0,8).forEach(function (item) { recentList.append(el('p', item.title + ' · ' + item.type + ' · ' + item.time.toLocaleString())); });
}

async function openSection(key) {
  activeSection = key; const config = sections[key];
  document.getElementById('overview-panel').hidden = true; document.getElementById('manager-panel').hidden = false;
  document.querySelectorAll('.admin-section-button').forEach(function (button) { button.setAttribute('aria-current', button.dataset.sectionKey === key ? 'page' : 'false'); });
  document.getElementById('manager-title').textContent = config.label;
  document.getElementById('manager-help').textContent = key === 'enquiries' ? 'These messages are private. Review them only through this authenticated dashboard; do not copy sensitive details into public content.' : 'Records are saved in Firebase. Public pages can only read records marked as published.';
  document.getElementById('safeguarding-note').hidden = !['gallery','announcements'].includes(key);
  document.getElementById('record-editor-wrap').hidden = Boolean(config.readOnly);
  await loadRecords();
  buildForm();
}

async function loadRecords(options) {
  const quiet = Boolean(options && options.quiet);
  if (!quiet) setStatus('Loading ' + sections[activeSection].label.toLowerCase() + '…');
  try {
    const snapshot = await getDocs(query(collection(db, activeSection), limit(100)));
    records = snapshot.docs.map(function (item) { return { id: item.id, ...item.data() }; }); renderRecords();
    if (!quiet) setStatus('Loaded ' + records.length + ' record(s).');
    return true;
  } catch (error) { records = []; renderRecords(); if (!quiet) showSafeError(error); return false; }
}

function renderRecords() {
  list.replaceChildren();
  if (!records.length) { list.append(el('p', 'No records here yet.')); return; }
  records.forEach(function (record) {
    const card = el('article', undefined, 'admin-update-row');
    card.append(el('h3', record.title || (activeSection === 'gallery' ? 'Gallery photo' : '') || record.name || record.email || 'Enquiry'));
    const excerpt = record.body || record.description || record.message || record.quote || record.biography || record.summary || '';
    if (excerpt) card.append(el('p', String(excerpt).slice(0,220)));
    if(activeSection==='enquiries')card.append(el('p',[record.email,record.phone,record.interest].filter(Boolean).join(' · ')));
    card.append(el('p', (activeSection==='enquiries' ? record.status || 'new' : record.published ? 'Published' : 'Draft/private') + ((record.updatedAt||record.createdAt) && (record.updatedAt||record.createdAt).toDate ? ' · ' + (activeSection==='enquiries'?'Received ':'Updated ')+(record.updatedAt||record.createdAt).toDate().toLocaleString() : '')));
    if (activeSection === 'gallery' && record.imageUrl) {
      const image = document.createElement('img'); image.src = record.imageUrl; image.alt = record.alt || ''; image.className = 'admin-image-preview'; card.append(image);
    }
    if (record.storagePath) {
      const preview=el('button',activeSection==='documents'?'Download public PDF':'Preview uploaded image','btn btn-outline');preview.type='button';
      preview.addEventListener('click',async function(){try{const blob=await getBlob(ref(storage,record.storagePath));const url=URL.createObjectURL(blob);if(activeSection==='documents'){const a=document.createElement('a');a.href=url;a.download=(record.title||'public-document')+'.pdf';a.click();window.setTimeout(function(){URL.revokeObjectURL(url);},30000);}else{const image=document.createElement('img');image.src=url;image.alt=record.alt||record.photoAlt||record.imageAlt||'';image.className='admin-image-preview';card.append(image);preview.remove();}}catch(error){showSafeError(error);}});card.append(preview);
    }
    if (!sections[activeSection].readOnly) {
      const edit = el('button', 'Edit', 'btn btn-outline'); edit.type='button'; edit.addEventListener('click', function () { editRecord(record); }); card.append(edit);
    }
    if(activeSection==='enquiries' && record.status!=='reviewed') { const review=el('button','Mark reviewed','btn btn-outline');review.type='button';review.addEventListener('click',async function(){try{await updateDoc(doc(db,'enquiries',record.id),{status:'reviewed'});await loadRecords();}catch(error){showSafeError(error);}});card.append(review); }
    const remove = el('button', 'Delete', 'btn btn-outline'); remove.type='button'; remove.addEventListener('click', function () { removeRecord(record); }); card.append(remove);
    list.append(card);
  });
}

function buildForm(record) {
  const config = sections[activeSection]; form.replaceChildren(); currentId = record ? record.id : '';
  document.getElementById('editor-title').textContent = record ? 'Edit record' : 'Add record';
  config.fields.forEach(function (field) {
    const [name,label,type] = field; const wrapper = el('label', label);
    let input;
    if (type === 'gallery-image') {
      const picker = el('fieldset', undefined, 'gallery-image-field');
      picker.append(el('legend', 'Photo'));
      const existingLabel = el('label', 'Choose an existing photo from the gallery');
      const existing = document.createElement('select'); existing.name = 'galleryImageSource';
      const emptyOption = document.createElement('option'); emptyOption.value = ''; emptyOption.textContent = record ? 'Keep the current photo' : 'Choose a photo'; existing.append(emptyOption);
      galleryImageLibrary.forEach(function (image) {
        const option = document.createElement('option'); option.value = 'local:' + image.src; option.textContent = image.name; existing.append(option);
      });
      records.filter(function (item) { return item.id !== currentId && item.storagePath; }).forEach(function (item) {
        const option = document.createElement('option'); option.value = 'record:' + item.id;
        option.textContent = 'Previously uploaded photo' + (item.published ? ' (published)' : ' (draft)'); existing.append(option);
      });
      existingLabel.append(existing); picker.append(existingLabel);
      const fileLabel = el('label', 'Or choose an image file from your device');
      const file = document.createElement('input'); file.type = 'file'; file.name = 'galleryImageFile'; file.accept = 'image/jpeg,image/png,image/webp'; file.dataset.fileType = 'image'; fileLabel.append(file); picker.append(fileLabel);
      const hint = el('p', record ? 'Choose another photo above to replace this one, or leave both choices unchanged to keep it.' : 'Accepted formats: JPG, PNG, or WebP. Maximum file size: 5 MB.'); hint.className = 'form-note'; picker.append(hint);
      const preview = document.createElement('img'); preview.className = 'admin-image-preview'; preview.alt = 'Selected gallery photo preview'; preview.hidden = true; picker.append(preview);

      let previewObjectUrl = '';
      function showPreview(src, objectUrl) {
        if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
        previewObjectUrl = objectUrl || '';
        preview.src = src || '';
        preview.hidden = !src;
      }
      async function showExistingSelection() {
        const value = existing.value;
        if (value.startsWith('local:')) { showPreview(value.slice(6)); return; }
        if (value.startsWith('record:')) {
          const source = records.find(function (item) { return item.id === value.slice(7); });
          if (!source || !source.storagePath) { showPreview(''); return; }
          try { const url = URL.createObjectURL(await getBlob(ref(storage, source.storagePath))); showPreview(url, url); }
          catch (error) { showPreview(''); showSafeError(error); }
          return;
        }
        if (record && record.imageUrl) { showPreview(record.imageUrl); return; }
        if (record && record.storagePath) {
          try { const url = URL.createObjectURL(await getBlob(ref(storage, record.storagePath))); showPreview(url, url); }
          catch (_) { showPreview(''); }
          return;
        }
        showPreview('');
      }
      existing.addEventListener('change', function () { file.value = ''; showExistingSelection(); });
      file.addEventListener('change', function () {
        existing.value = '';
        const selected = file.files && file.files[0];
        if (selected) { const url = URL.createObjectURL(selected); showPreview(url, url); }
        else showExistingSelection();
      });
      if (record && record.imageUrl) existing.value = 'local:' + record.imageUrl;
      showExistingSelection();
      form.append(picker);
      return;
    }
    if (type === 'textarea') { input = document.createElement('textarea'); input.rows = 5; input.maxLength = 4000; }
    else if (type === 'select-news') { input = document.createElement('select'); [['news','News'],['events','Events'],['announcements','Announcements']].forEach(function(option){const entry=document.createElement('option');entry.value=option[0];entry.textContent=option[1];input.append(entry);}); }
    else { input = document.createElement('input'); input.type = type.startsWith('file') ? 'file' : type === 'checkbox' ? 'checkbox' : 'text'; }
    input.name=name;
    if (type === 'checkbox') input.checked = record ? Boolean(record[name]) : Boolean(config.public);
    else if (!type.startsWith('file')) {
      input.required = activeSection === 'team'
        ? !['biography','photoAlt'].includes(name)
        : !['name','imageAlt','photoAlt'].includes(name);
      const limits = { body: 4000, biography: 4000, quote: 4000, description: 4000, photoAlt: 300, imageAlt: 300, alt: 300, storagePath: 300, category: 80, slug: 80, name: 120, position: 120 };
      input.maxLength = limits[name] || 180;
      if (record) input.value=record[name] || '';
    }
    if (type === 'file-image') { input.accept='image/jpeg,image/png,image/webp'; input.dataset.fileType='image'; }
    if (type === 'file-pdf') { input.accept='application/pdf,.pdf'; input.dataset.fileType='pdf'; }
    wrapper.append(input); form.append(wrapper);
  });
  if (config.fields.length) {
    const buttons=el('div',undefined,'hero-buttons'); const save=el('button','Save changes','btn btn-blue'); save.type='submit';
    const publishedField=form.elements.namedItem('published');
    function updateSaveLabel() {
      if (!publishedField) save.textContent=record?'Save changes':'Create record';
      else if (publishedField.checked) save.textContent=record?'Publish changes':activeSection==='gallery'?'Publish photo':'Publish record';
      else save.textContent='Save draft';
    }
    if (publishedField) publishedField.addEventListener('change',updateSaveLabel);
    updateSaveLabel();
    const clear=el('button','Cancel editing','btn btn-outline'); clear.type='button'; clear.addEventListener('click',function(){buildForm();});
    buttons.append(save,clear); form.append(buttons); form.onsubmit=saveRecord;
  }
}

function editRecord(record) { buildForm(record); document.getElementById('editor-title').scrollIntoView({behavior:'smooth',block:'start'}); }

async function saveRecord(event) {
  const sectionKey = activeSection;
  const sectionLabel = sections[sectionKey].label;
  const editing = Boolean(currentId);
  const userId = currentUser && currentUser.uid;
  event.preventDefault(); const button=form.querySelector('[type="submit"]'); button.disabled=true; setStatus('Saving record…');
  if (!userId) { setStatus('Your administrator session has expired. Sign in again before saving.'); button.disabled=false; return; }
  let id=currentId || doc(collection(db,sectionKey)).id; const previous=records.find(function(item){return item.id===id;}) || {};
  const data={};
    sections[sectionKey].fields.forEach(function([name,,type]) { const field=form.elements.namedItem(name); if (!field || type.startsWith('file') || type === 'gallery-image') return; data[name]=type==='checkbox'?field.checked:field.value.trim(); });
  try {
    const fileField=form.querySelector('input[type="file"]'); let file=fileField && fileField.files[0];
    let storagePath=previous.storagePath || '';
    let imageUrl=previous.imageUrl || '';
    let imageAlt=previous.alt || '';
    if (sectionKey === 'gallery') {
      const source = form.elements.namedItem('galleryImageSource').value;
      if (source.startsWith('local:')) {
        const selectedImage = galleryImageLibrary.find(function (item) { return item.src === source.slice(6); });
        if (!selectedImage) throw new Error('Choose a photo from the gallery or select an image file.');
        imageUrl=selectedImage.src; imageAlt=selectedImage.alt; storagePath='';
      } else if (source.startsWith('record:')) {
        const sourceRecord=records.find(function(item){return item.id===source.slice(7);});
        if(!sourceRecord || !sourceRecord.storagePath) throw new Error('That gallery photo is no longer available. Choose another photo.');
        const sourceBlob=await getBlob(ref(storage,sourceRecord.storagePath));
        const extension=(sourceRecord.storagePath.split('/').pop().match(/\.(jpe?g|png|webp)$/i)||[])[0]||'.jpg';
        const sourceFile=new File([sourceBlob], 'gallery-photo'+extension, {type:sourceBlob.type||'image/jpeg'});
        file=sourceFile; imageAlt=sourceRecord.alt || 'Photo from Vineyard Children Centre.'; imageUrl='';
      } else if (!file && !previous.storagePath && !previous.imageUrl) {
        throw new Error('Choose a photo from the gallery or select an image file.');
      }
    }
    if (file) {
      const pdf=fileField.dataset.fileType==='pdf'; const validType=pdf?file.type==='application/pdf':['image/jpeg','image/png','image/webp'].includes(file.type);
      const maxBytes=pdf?10*1024*1024:5*1024*1024;
      const validExtension=pdf?/\.pdf$/i.test(file.name):/\.(jpe?g|png|webp)$/i.test(file.name);
      if (!validType || !validExtension || file.size>maxBytes) throw new Error(pdf?'Choose a PDF no larger than 10 MB.':'Choose a JPG, PNG, or WebP image no larger than 5 MB.');
      const cleanName=file.name.replace(/[^a-z0-9._-]/gi,'_').slice(-100).toLowerCase(); storagePath='managed/'+sectionKey+'/'+id+'/'+cleanName;
      await uploadBytes(ref(storage,storagePath),file,{contentType:file.type});
      if (sectionKey === 'gallery') { imageUrl=''; if (!imageAlt) imageAlt='Photo from Vineyard Children Centre.'; }
    }
    if (sectionKey === 'gallery') {
      if (storagePath) data.storagePath=storagePath;
      if (imageUrl) data.imageUrl=imageUrl;
      data.alt=imageAlt || 'Photo from Vineyard Children Centre.';
    } else if (storagePath) {
      data.storagePath=storagePath;
    } else if (previous.storagePath) data.storagePath=previous.storagePath;
    data.createdAt=previous.createdAt || serverTimestamp(); data.updatedAt=serverTimestamp(); data.updatedBy=userId;
    await setDoc(doc(db,sectionKey,id),data);
    let listRefreshed = true;
    if (activeSection === sectionKey) {
      buildForm();
      listRefreshed = await loadRecords({ quiet: true });
    }
    const result = data.published
      ? (editing ? sectionLabel + ' updated and published successfully.' : sectionLabel + ' published successfully.')
      : (editing ? sectionLabel + ' changes saved as a draft.' : sectionLabel + ' saved as a draft.');
    setStatus(result + (listRefreshed ? '' : ' The save succeeded, but the dashboard list could not refresh. Reload this section to verify it.'));
  } catch (error) { if (error.message && !error.code) setStatus(error.message); else showSafeError(error); }
  finally { button.disabled=false; }
}

async function removeRecord(record) {
  if (!window.confirm('Permanently delete this record? This cannot be undone.')) return;
  try {
    if (record.storagePath) { try { await deleteObject(ref(storage,record.storagePath)); } catch (_) {} }
    await deleteDoc(doc(db,activeSection,record.id)); setStatus('Record deleted.'); await loadRecords();
  } catch (error) { showSafeError(error); }
}
