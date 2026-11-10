import { auth, db, storage, firebaseReady, appCheckReady, safeFirebaseMessage, firebaseSdk } from './firebase-client.js';
const { onAuthStateChanged, signOut, collection, doc, getDoc, getDocs, getCountFromServer, limit, query, where, orderBy, onSnapshot, serverTimestamp, setDoc, deleteDoc, updateDoc, ref, uploadBytesResumable, deleteObject, getBlob } = firebaseSdk;

const sections = {
  announcements: { label: 'News & announcements', fields: [['title','Title','text'],['category','Category','select-news'],['body','Content','textarea'],['dateLabel','Date or date label','text'],['imageAlt','Image alternative text','text'],['file','Optional approved image (JPG, PNG, or WebP; max 5 MB)','file-image'],['published','Published','checkbox']], upload: true, public: true },
  gallery: { label: 'Gallery', fields: [['image','Photo or video','gallery-image'],['caption','Photo caption (optional)','text'],['category','Album','select-album'],['published','Show in public gallery','checkbox']], upload: true, public: true },
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
let activeSection = 'announcements'; let records = []; let currentUser = null; let currentId = ''; let currentPage = 1; const pageSize = 10; let enquiryUnsubscribe = null; let knownNewEnquiryIds = new Set(); let notificationUpdate = 0; let adminSessionReady = false; let loggingOut = false; let unauthorizedRedirect = false;
const previewObjectUrls = new Set();
form.addEventListener('submit', saveRecord);

form.addEventListener('invalid', function (event) {
  const label = event.target.closest('label');
  const fieldName = label && label.firstChild && label.firstChild.textContent
    ? label.firstChild.textContent.trim()
    : event.target.name || 'a required field';
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
  try { loggingOut = true; await signOut(auth); window.location.replace('admin-login.html?signedOut=1'); }
  catch (error) { loggingOut = false; showSafeError(error); }
});

onAuthStateChanged(auth, async function (user) {
  if (!firebaseReady) { setStatus('Firebase is not configured. Complete the Firebase setup in README.md.'); return; }
  if (!user) { if(loggingOut||unauthorizedRedirect)return; window.location.replace(adminSessionReady?'admin-login.html?error=session':'admin-login.html'); return; }
  currentUser = user;
  try {
    const adminRecord = await getDoc(doc(db, 'admins', user.uid));
    if (!adminRecord.exists() || adminRecord.data().active !== true) {
      unauthorizedRedirect = true;
      await signOut(auth); setStatus('This account is not authorized for the admin dashboard.');
      window.setTimeout(function () { window.location.replace('admin-login.html?error=unauthorized'); }, 1300); return;
    }
    document.getElementById('admin-user').textContent = user.email || 'Administrator';
    adminSessionReady = true;
    setStatus('Signed in. Your permissions are enforced by Firebase security rules.'+(appCheckReady?' App Check client provider is configured; verify Console registration, traffic monitoring, and enforcement.':' App Check is not configured in firebase-config.js; configure it and enable enforcement after monitoring valid traffic.'));
    startEnquiryNotifications();
    await showOverview();
  } catch (error) { showSafeError(error); }
});

async function showOverview() {
  document.querySelectorAll('.admin-section-button').forEach(function (button) { button.setAttribute('aria-current', button.dataset.sectionKey === 'overview' ? 'page' : 'false'); });
  document.getElementById('overview-panel').hidden = false;
  document.getElementById('manager-panel').hidden = true;
  const counts = document.getElementById('dashboard-counts'); counts.replaceChildren();
  const recent = [];
  const metrics = [
    ['Total enquiries', query(collection(db, 'enquiries'))],
    ['New / unread enquiries', query(collection(db, 'enquiries'), where('status', '==', 'new'))],
    ['Published announcements', query(collection(db, 'announcements'), where('published', '==', true))],
    ['Draft announcements', query(collection(db, 'announcements'), where('published', '==', false))],
    ['Uploaded documents', query(collection(db, 'documents'), where('storagePath', '!=', ''))]
  ];
  for (const [label, metricQuery] of metrics) {
    try { const result = await getCountFromServer(metricQuery); const card = el('article', undefined, 'card'); card.append(el('h3', label), el('p', String(result.data().count))); counts.append(card); }
    catch (_) { const card = el('article', undefined, 'card'); card.append(el('h3', label), el('p', 'Unavailable')); counts.append(card); }
  }
  try {
    const managed=await getCountFromServer(query(collection(db,'gallery')));
    const duplicatedStatic=await Promise.all(galleryImageLibrary.map(function(image){return getCountFromServer(query(collection(db,'gallery'),where('imageUrl','==',image.src),where('published','==',true)));}));
    const duplicates=duplicatedStatic.reduce(function(total,result){return total+result.data().count;},0);
    const card=el('article',undefined,'card');card.append(el('h3','Gallery photos and videos'),el('p',String(galleryImageLibrary.length+managed.data().count-duplicates)));counts.append(card);
  } catch (_) { const card=el('article',undefined,'card');card.append(el('h3','Gallery photos and videos'),el('p','Unavailable'));counts.append(card); }
  for (const key of ['announcements','gallery','documents']) {
    try {
      const snapshot = await getDocs(query(collection(db, key), orderBy('updatedAt', 'desc'), limit(100)));
      snapshot.docs.forEach(function (item) { const data = item.data(); const stamp = data.updatedAt || data.createdAt; if (stamp && stamp.toDate) recent.push({ title: data.title || data.name || sections[key].label, time: stamp.toDate(), type: sections[key].label }); });
    } catch (_) { /* Counts remain available if the recent activity query fails. */ }
  }
  const actions = document.getElementById('quick-actions'); actions.replaceChildren();
  ['announcements','gallery','documents','enquiries'].forEach(function (key) { const button = el('button', 'Manage ' + sections[key].label, 'btn btn-blue'); button.type = 'button'; button.addEventListener('click', function () { openSection(key); }); actions.append(button); });
  recent.sort(function (a,b) { return b.time-a.time; });
  const recentList = document.getElementById('recent-content'); recentList.replaceChildren();
  if (!recent.length) recentList.append(el('p', 'No recent edits yet.'));
  else recent.slice(0,8).forEach(function (item) { recentList.append(el('p', item.title + ' · ' + item.type + ' · ' + item.time.toLocaleString())); });
  renderLatestEnquiries();
}

function startEnquiryNotifications() {
  if (enquiryUnsubscribe) enquiryUnsubscribe();
  const indicator = document.getElementById('enquiry-notification');
  indicator.onclick=function(){openSection('enquiries');};
  enquiryUnsubscribe = onSnapshot(query(collection(db, 'enquiries'), orderBy('createdAt', 'desc'), limit(100)), function(snapshot) {
    const newItems = snapshot.docs.filter(function(item) { return item.data().status === 'new'; });
    newItems.forEach(function(item) {
      if (knownNewEnquiryIds.size && !knownNewEnquiryIds.has(item.id)) {
        indicator.textContent = 'New enquiry'; indicator.hidden = false;
        setStatus('A new enquiry has arrived.');
      }
    });
    knownNewEnquiryIds = new Set(newItems.map(function(item) { return item.id; }));
    indicator.textContent = newItems.length ? newItems.length + ' new' : '';
    indicator.hidden = !newItems.length;
    const requestId=++notificationUpdate;
    getCountFromServer(query(collection(db,'enquiries'),where('status','==','new'))).then(function(result){if(requestId===notificationUpdate){const count=result.data().count;indicator.textContent=count?count+' new':'';indicator.hidden=!count;}}).catch(function(){});
    renderLatestEnquiries(snapshot.docs.map(function(item) { return {id:item.id,...item.data()}; }));
  }, function(error) { console.warn('Enquiry notifications unavailable:', error.code || error.message); });
}

async function renderLatestEnquiries(supplied) {
  const target = document.getElementById('latest-enquiries'); if (!target) return;
  target.replaceChildren();
  try {
    const items = supplied || (await getDocs(query(collection(db, 'enquiries'), orderBy('createdAt', 'desc'), limit(5)))).docs.map(function(item) { return {id:item.id,...item.data()}; });
    const latest = items.slice(0, 5);
    if (!latest.length) { target.append(el('p', 'No enquiries received yet.')); return; }
    latest.forEach(function(item) { target.append(enquiryCard(item, true)); });
  } catch (_) { target.append(el('p', 'Latest enquiries are unavailable.')); }
}

async function openSection(key) {
  activeSection = key; const config = sections[key];
  document.getElementById('overview-panel').hidden = true; document.getElementById('manager-panel').hidden = false;
  document.querySelectorAll('.admin-section-button').forEach(function (button) { button.setAttribute('aria-current', button.dataset.sectionKey === key ? 'page' : 'false'); });
  document.getElementById('manager-title').textContent = config.label;
  document.getElementById('manager-help').textContent = key === 'enquiries' ? 'These messages are private. Review them only through this authenticated dashboard; do not copy sensitive details into public content.' : 'Records are saved in Firebase. Public pages can only read records marked as published.';
  document.getElementById('safeguarding-note').hidden = !['gallery','announcements'].includes(key);
  document.getElementById('record-editor-wrap').hidden = Boolean(config.readOnly);
  currentPage = 1;
  prepareListTools();
  await loadRecords();
  buildForm();
}

function prepareListTools() {
  const tools = document.getElementById('record-tools');
  const filter = document.getElementById('record-filter');
  tools.hidden = false;
  document.getElementById('record-search').value = '';
  filter.replaceChildren();
  const options = activeSection === 'enquiries'
    ? [['all','All enquiries'],['new','New / unread'],['in_progress','In progress'],['responded','Responded'],['resolved','Resolved'],['interest:General enquiry','General enquiries'],['interest:Visit arrangement','Visit arrangements'],['interest:Volunteering','Volunteering'],['interest:Partnership','Partnerships'],['interest:Donation or support','Donation or support']]
    : activeSection === 'announcements'
      ? [['all','All announcements'],['published','Published'],['draft','Draft'],['news','News'],['events','Events'],['announcements','Announcements']]
      : activeSection === 'gallery'
        ? [['all','All photographs'],['published','Published'],['draft','Draft'],...Array.from(new Set(records.map(function(item){return item.category;}).filter(Boolean))).map(function(value){return ['album:'+value,value];})]
        : activeSection === 'documents' ? [['all','All documents'],['published','Published'],['draft','Draft']] : [['all','All records'],['published','Published'],['draft','Draft']];
  options.forEach(function(item){const option=el('option',item[1]);option.value=item[0];filter.append(option);});
  ['record-search','record-filter','record-sort'].forEach(function(id){document.getElementById(id).oninput=function(){currentPage=1;renderRecords();};document.getElementById(id).onchange=function(){currentPage=1;renderRecords();};});
}

async function loadRecords(options) {
  const quiet = Boolean(options && options.quiet);
  if (!quiet) setStatus('Loading ' + sections[activeSection].label.toLowerCase() + '…');
  try {
    const snapshot = await getDocs(query(collection(db, activeSection), limit(500)));
    records = snapshot.docs.map(function (item) { return { id: item.id, ...item.data() }; });
    if (activeSection === 'gallery' && !document.getElementById('record-tools').hidden) prepareListTools();
    renderRecords();
    if (!quiet) setStatus('Loaded ' + records.length + ' record(s).');
    return true;
  } catch (error) { records = []; renderRecords(); if (!quiet) showSafeError(error); return false; }
}

function searchableText(record) { return [record.name,record.email,record.phone,record.interest,record.title,record.body,record.message,record.caption,record.category,record.description].filter(Boolean).join(' ').toLowerCase(); }
function recordDate(record) { const value=record.createdAt||record.updatedAt; return value&&value.toDate?value.toDate():new Date(0); }
function renderRecords() {
  list.replaceChildren();
  const search=(document.getElementById('record-search')?.value||'').trim().toLowerCase();
  const filter=document.getElementById('record-filter')?.value||'all';
  const sort=document.getElementById('record-sort')?.value||'newest';
  let visible=records.filter(function(record){
    if(search&&!searchableText(record).includes(search))return false;
    if(filter==='new')return activeSection==='enquiries'&&(record.status||'new')==='new';
    if(['in_progress','responded','resolved'].includes(filter))return record.status===filter||(filter==='in_progress'&&record.status==='reviewed');
    if(filter.startsWith('interest:'))return record.interest===filter.slice(9);
    if(filter==='published')return record.published===true;
    if(filter==='draft')return record.published!==true;
    if(filter==='news'||filter==='events'||filter==='announcements')return activeSection==='announcements'&&record.category===filter;
    if(filter.startsWith('album:'))return record.category===filter.slice(6);
    return true;
  });
  visible.sort(function(a,b){if(sort==='name')return String(a.name||a.title||'').localeCompare(String(b.name||b.title||''));return sort==='oldest'?recordDate(a)-recordDate(b):recordDate(b)-recordDate(a);});
  const count=document.getElementById('record-result-count'); if(count)count.textContent=visible.length+' result(s) · showing up to 500 loaded records.';
  const pages=Math.max(1,Math.ceil(visible.length/pageSize)); currentPage=Math.min(currentPage,pages);
  const pager=document.getElementById('record-pagination'); if(pager){pager.replaceChildren();const prev=el('button','Previous','btn btn-outline'), next=el('button','Next','btn btn-outline');prev.type=next.type='button';prev.disabled=currentPage<=1;next.disabled=currentPage>=pages;prev.onclick=function(){currentPage--;renderRecords();};next.onclick=function(){currentPage++;renderRecords();};pager.append(prev,el('span','Page '+currentPage+' of '+pages),next);}
  if (!visible.length) { list.append(el('p', records.length?'No records match these filters.':'No records here yet.')); return; }
  visible.slice((currentPage-1)*pageSize,currentPage*pageSize).forEach(function (record) {
    if(activeSection==='enquiries'){list.append(enquiryCard(record,false));return;}
    const card = el('article', undefined, 'admin-update-row');
    card.append(el('h3', record.title || (activeSection === 'gallery' ? 'Gallery photo' : '') || record.name || record.email || 'Enquiry'));
    const excerpt = record.body || record.description || record.message || record.quote || record.biography || record.summary || '';
    if (excerpt) card.append(el('p', String(excerpt).slice(0,220)));
    if(activeSection==='enquiries')card.append(el('p',[record.email,record.phone,record.interest].filter(Boolean).join(' · ')));
    card.append(el('p', (activeSection==='enquiries' ? record.status || 'new' : record.published ? 'Published' : 'Draft/private') + ((record.updatedAt||record.createdAt) && (record.updatedAt||record.createdAt).toDate ? ' · ' + (activeSection==='enquiries'?'Received ':'Updated ')+(record.updatedAt||record.createdAt).toDate().toLocaleString() : '')));
    if (activeSection === 'gallery' && record.imageUrl) {
      const image = document.createElement('img'); image.src = record.imageUrl; image.alt = record.alt || ''; image.className = 'admin-image-preview'; card.append(image);
    }
    if(activeSection==='gallery'&&record.caption)card.append(el('p',record.caption));
    if(activeSection==='gallery'&&record.category)card.append(el('p','Album: '+record.category));
    if (record.storagePath) {
      const preview=el('button',activeSection==='documents'?'Download public PDF':record.mediaType==='video'?'Preview uploaded video':'Preview uploaded image','btn btn-outline');preview.type='button';
      preview.addEventListener('click',async function(){try{const blob=await getBlob(ref(storage,record.storagePath));const url=URL.createObjectURL(blob);if(activeSection==='documents'){const a=document.createElement('a');a.href=url;a.download=(record.title||'public-document')+'.pdf';a.click();window.setTimeout(function(){URL.revokeObjectURL(url);},30000);}else{const media=document.createElement(record.mediaType==='video'?'video':'img');media.src=url;if(record.mediaType==='video'){media.controls=true;media.preload='metadata';}else media.alt=record.alt||record.photoAlt||record.imageAlt||'';media.className='admin-image-preview';card.append(media);preview.remove();}}catch(error){showSafeError(error);}});card.append(preview);
    }
    if (!sections[activeSection].readOnly) {
      const edit = el('button', 'Edit', 'btn btn-outline'); edit.type='button'; edit.addEventListener('click', function () { editRecord(record); }); card.append(edit);
    }
    const remove = el('button', 'Delete', 'btn btn-outline'); remove.type='button'; remove.addEventListener('click', function () { removeRecord(record); }); card.append(remove);
    list.append(card);
  });
}

function enquiryCard(record, compact) {
  const card=el('article',undefined,'admin-update-row');
  const statusLabel={new:'New',in_progress:'In progress',responded:'Responded',resolved:'Resolved',reviewed:'In progress'}[record.status]||'New';
  card.append(el('h3',record.name||'Enquiry'));
  card.append(el('p',[record.email,record.phone,record.interest].filter(Boolean).join(' · ')));
  card.append(el('p',record.message||''));
  card.append(el('p','Status: '+statusLabel+' · Received '+(recordDate(record).getTime()?recordDate(record).toLocaleString():'Date unavailable')));
  if(record.email){const email=el('a','Email person','btn btn-outline');email.href='mailto:'+record.email;card.append(email);}
  if(record.phone){const phone=el('a','Call person','btn btn-outline');phone.href='tel:'+record.phone.replace(/[^+\d]/g,'');card.append(phone);}
  if(!compact){const label=el('label','Internal status');const select=document.createElement('select');[['new','New'],['in_progress','In progress'],['responded','Responded'],['resolved','Resolved']].forEach(function(item){const option=el('option',item[1]);option.value=item[0];select.append(option);});select.value=record.status==='reviewed'?'in_progress':record.status||'new';select.addEventListener('change',async function(){select.disabled=true;try{await updateDoc(doc(db,'enquiries',record.id),{status:select.value});setStatus('Enquiry status updated.');await loadRecords({quiet:true});renderLatestEnquiries();}catch(error){showSafeError(error);select.value=record.status==='reviewed'?'in_progress':record.status||'new';}finally{select.disabled=false;}});label.append(select);card.append(label);
    const remove=el('button','Delete enquiry','btn btn-outline');remove.type='button';remove.addEventListener('click',function(){removeRecord(record);});card.append(remove);}
  return card;
}

function buildForm(record) {
  const config = sections[activeSection]; cleanupPreviewUrls(); form.replaceChildren(); currentId = record ? record.id : '';
  document.getElementById('editor-title').textContent = record ? 'Edit record' : 'Add record';
  config.fields.forEach(function (field) {
    const [name,label,type] = field; const wrapper = el('label', label);
    let input;
    if (type === 'gallery-image') {
      const picker = el('fieldset', undefined, 'gallery-image-field');
      picker.append(el('legend', 'Photo or video'));
      const existingLabel = el('label', 'Choose an existing photo from the gallery');
      const existing = document.createElement('select'); existing.name = 'galleryImageSource';
      const emptyOption = document.createElement('option'); emptyOption.value = ''; emptyOption.textContent = record ? 'Keep the current media' : 'Choose a photo'; existing.append(emptyOption);
      galleryImageLibrary.forEach(function (image) {
        const option = document.createElement('option'); option.value = 'local:' + image.src; option.textContent = image.name; existing.append(option);
      });
      records.filter(function (item) { return item.id !== currentId && item.storagePath && item.mediaType !== 'video'; }).forEach(function (item) {
        const option = document.createElement('option'); option.value = 'record:' + item.id;
        option.textContent = 'Previously uploaded photo' + (item.published ? ' (published)' : ' (draft)'); existing.append(option);
      });
      existingLabel.append(existing); picker.append(existingLabel);
      const fileLabel = el('label', 'Or choose a photo or video file from your device');
      const file = document.createElement('input'); file.type = 'file'; file.name = 'galleryImageFile'; file.accept = 'image/jpeg,image/png,image/webp,video/mp4,video/webm'; file.dataset.fileType = 'gallery-media'; fileLabel.append(file); picker.append(fileLabel);
      const hint = el('p', record ? 'Choose another photo or video above to replace this one, or leave both choices unchanged to keep it.' : 'Photos: JPG, PNG, or WebP up to 5 MB. Videos: MP4 or WebM up to 20 MB. Upload only approved, consented material.'); hint.className = 'form-note'; picker.append(hint);
      const preview = document.createElement('img'); preview.className = 'admin-image-preview'; preview.alt = 'Selected gallery photo preview'; preview.hidden = true; picker.append(preview);
      const videoPreview = document.createElement('video'); videoPreview.className = 'admin-image-preview'; videoPreview.controls = true; videoPreview.preload = 'metadata'; videoPreview.hidden = true; picker.append(videoPreview);

      let previewObjectUrl = '';
      function showPreview(src, objectUrl, mediaType) {
        if (previewObjectUrl) { URL.revokeObjectURL(previewObjectUrl); previewObjectUrls.delete(previewObjectUrl); }
        previewObjectUrl = objectUrl || '';
        if (previewObjectUrl) previewObjectUrls.add(previewObjectUrl);
        const video = mediaType === 'video';
        preview.hidden = !src || video; videoPreview.hidden = !src || !video;
        if(video){preview.removeAttribute('src');videoPreview.src=src||'';}
        else{videoPreview.removeAttribute('src');preview.src=src||'';}
      }
      async function showExistingSelection() {
        const value = existing.value;
        if (value.startsWith('local:')) { showPreview(value.slice(6)); return; }
        if (value.startsWith('record:')) {
          const source = records.find(function (item) { return item.id === value.slice(7); });
          if (!source || !source.storagePath) { showPreview(''); return; }
          try { const url = URL.createObjectURL(await getBlob(ref(storage, source.storagePath))); showPreview(url, url, source.mediaType); }
          catch (error) { showPreview(''); showSafeError(error); }
          return;
        }
        if (record && record.imageUrl) { showPreview(record.imageUrl); return; }
        if (record && record.storagePath) {
          try { const url = URL.createObjectURL(await getBlob(ref(storage, record.storagePath))); showPreview(url, url, record.mediaType); }
          catch (_) { showPreview(''); }
          return;
        }
        showPreview('');
      }
      existing.addEventListener('change', function () { file.value = ''; showExistingSelection(); });
      file.addEventListener('change', function () {
        existing.value = '';
        const selected = file.files && file.files[0];
        if (selected) { const url = URL.createObjectURL(selected); showPreview(url, url, selected.type.startsWith('video/')?'video':'image'); }
        else showExistingSelection();
      });
      if (record && record.imageUrl) existing.value = 'local:' + record.imageUrl;
      showExistingSelection();
      form.append(picker);
      return;
    }
    if (type === 'textarea') { input = document.createElement('textarea'); input.rows = 5; input.maxLength = 4000; }
    else if (type === 'select-news' || type === 'select-album') { input = document.createElement('select'); const choices=type==='select-news'?[['news','News'],['events','Events'],['announcements','Announcements']]:[['community','Community'],['education','Education'],['activities','Activities'],['care','Care'],['events','Events'],['other','Other']]; choices.forEach(function(option){const entry=document.createElement('option');entry.value=option[0];entry.textContent=option[1];input.append(entry);}); }
    else { input = document.createElement('input'); input.type = type.startsWith('file') ? 'file' : type === 'checkbox' ? 'checkbox' : 'text'; }
    input.name=name;
    if (type === 'checkbox') input.checked = record ? Boolean(record[name]) : Boolean(config.public);
    else if (!type.startsWith('file')) {
      const optionalFields = {
        announcements: ['dateLabel','imageAlt'],
        documents: ['description','category','dateLabel'],
        gallery: ['caption'],
        team: ['biography','photoAlt'],
        testimonials: ['name'],
        support: ['category']
      };
      input.required = !(optionalFields[activeSection] || []).includes(name);
      const limits = { body: 4000, biography: 4000, quote: 4000, description: 4000, photoAlt: 300, imageAlt: 300, alt: 300, storagePath: 300, category: 80, slug: 80, name: 120, position: 120 };
      input.maxLength = limits[name] || 180;
      if (record) input.value=record[name] || '';
    }
    if (type === 'file-image') { input.accept='image/jpeg,image/png,image/webp'; input.dataset.fileType='image'; }
    if (type === 'file-pdf') { input.accept='application/pdf,.pdf'; input.dataset.fileType='pdf'; }
    wrapper.append(input); form.append(wrapper);
    if(type==='file-image'){
      const preview=document.createElement('img');preview.className='admin-image-preview';preview.alt='Selected image preview';preview.hidden=true;form.append(preview);
      let previewUrl='';input.addEventListener('change',function(){if(previewUrl){URL.revokeObjectURL(previewUrl);previewObjectUrls.delete(previewUrl);previewUrl='';}const selected=input.files&&input.files[0];if(selected){previewUrl=URL.createObjectURL(selected);previewObjectUrls.add(previewUrl);preview.src=previewUrl;preview.hidden=false;}else{preview.removeAttribute('src');preview.hidden=true;}});
    }
  });
  if (config.fields.length) {
    const buttons=el('div',undefined,'hero-buttons'); const save=el('button','Save changes','btn btn-blue'); save.type='submit';
    const publishedField=form.elements.namedItem('published');
    function updateSaveLabel() {
      if (!publishedField) save.textContent=record?'Save changes':'Create record';
      else if (publishedField.checked) save.textContent=record?'Publish changes':activeSection==='gallery'?'Publish photo or video':'Publish record';
      else save.textContent='Save draft';
    }
    if (publishedField) publishedField.addEventListener('change',updateSaveLabel);
    updateSaveLabel();
    const clear=el('button','Cancel editing','btn btn-outline'); clear.type='button'; clear.addEventListener('click',function(){buildForm();});
    buttons.append(save,clear); form.append(buttons);
  }
}

function cleanupPreviewUrls(){previewObjectUrls.forEach(function(url){URL.revokeObjectURL(url);});previewObjectUrls.clear();}

function editRecord(record) { buildForm(record); document.getElementById('editor-title').scrollIntoView({behavior:'smooth',block:'start'}); }

async function saveRecord(event) {
  const sectionKey = activeSection;
  const sectionLabel = sections[sectionKey].label;
  const editing = Boolean(currentId);
  const userId = currentUser && currentUser.uid;
  event.preventDefault();
  const button=form.querySelector('[type="submit"]');
  if (!button || !form.reportValidity()) return;
  const buttonLabel=button.textContent;
  const publishedField=form.elements.namedItem('published');
  const isPublishing=!publishedField || publishedField.checked;
  let cleanupWarning='';
  let uploadedStoragePath='';
  button.disabled=true;
  button.textContent=isPublishing?'Publishing…':'Saving…';
  setStatus(isPublishing?'Publishing your changes…':'Saving your draft…');
  try {
    if (!userId) throw new Error('Your administrator session has expired. Sign in again before publishing.');
    const id=currentId || doc(collection(db,sectionKey)).id;
    const previous=records.find(function(item){return item.id===id;}) || {};
    const data={};
    sections[sectionKey].fields.forEach(function([name,,type]) {
      const field=form.elements.namedItem(name);
      if (!field || type.startsWith('file') || type === 'gallery-image') return;
      data[name]=type==='checkbox'?field.checked:field.value.trim();
    });
    const fileField=form.querySelector('input[type="file"]'); let file=fileField && fileField.files[0];
    const oldStoragePath=previous.storagePath||'';
    let storagePath=previous.storagePath || '';
    let imageUrl=previous.imageUrl || '';
    let imageAlt=previous.alt || '';
    let mediaType=previous.mediaType||'image';
    if (sectionKey === 'gallery') {
      const source = form.elements.namedItem('galleryImageSource').value;
      if (source.startsWith('local:')) {
        const selectedImage = galleryImageLibrary.find(function (item) { return item.src === source.slice(6); });
        if (!selectedImage) throw new Error('Choose a photo from the gallery or select an image file.');
        imageUrl=selectedImage.src; imageAlt=selectedImage.alt; mediaType='image'; storagePath='';
      } else if (source.startsWith('record:')) {
        const sourceRecord=records.find(function(item){return item.id===source.slice(7);});
        if(!sourceRecord || !sourceRecord.storagePath) throw new Error('That gallery photo is no longer available. Choose another photo.');
        const sourceBlob=await getBlob(ref(storage,sourceRecord.storagePath));
        const extension=(sourceRecord.storagePath.split('/').pop().match(/\.(jpe?g|png|webp)$/i)||[])[0]||'.jpg';
        const sourceFile=new File([sourceBlob], 'gallery-photo'+extension, {type:sourceBlob.type||'image/jpeg'});
        file=sourceFile; imageAlt=sourceRecord.alt || 'Photo from Vineyard Children Centre.'; imageUrl=''; mediaType='image';
      } else if (!file && !previous.storagePath && !previous.imageUrl) {
        throw new Error('Choose a photo from the gallery or select an image file.');
      }
    }
    if (data.published && !window.confirm(editing ? 'Publish these changes on the public website now?' : 'Publish this record on the public website now?')) { setStatus('Publication cancelled. Your form is unchanged.'); return; }
    if (file) {
      const pdf=fileField.dataset.fileType==='pdf'; const galleryVideo=sectionKey==='gallery'&&['video/mp4','video/webm'].includes(file.type);
      const validType=pdf?file.type==='application/pdf':galleryVideo?true:['image/jpeg','image/png','image/webp'].includes(file.type);
      const maxBytes=pdf?10*1024*1024:galleryVideo?20*1024*1024:5*1024*1024;
      const validExtension=pdf?/\.pdf$/i.test(file.name):galleryVideo?/\.(mp4|webm)$/i.test(file.name):/\.(jpe?g|png|webp)$/i.test(file.name);
      if (!validType || !validExtension || file.size>maxBytes) throw new Error(pdf?'Choose a PDF no larger than 10 MB.':galleryVideo?'Choose an MP4 or WebM video no larger than 20 MB.':'Choose a JPG, PNG, or WebP image no larger than 5 MB.');
      const cleanName=file.name.replace(/[^a-z0-9._-]/gi,'_').slice(-100).toLowerCase(); storagePath='managed/'+sectionKey+'/'+id+'/'+Date.now()+'-'+cleanName;
      const uploadTask=uploadBytesResumable(ref(storage,storagePath),file,{contentType:file.type});
      await new Promise(function(resolve,reject){uploadTask.on('state_changed',function(snapshot){const percent=Math.round(snapshot.bytesTransferred/snapshot.totalBytes*100);setStatus('Uploading file… '+percent+'%');},reject,resolve);});
      uploadedStoragePath=storagePath;
      if (sectionKey === 'gallery') { imageUrl=''; mediaType=galleryVideo?'video':'image'; if (!imageAlt) imageAlt='Photo from Vineyard Children Centre.'; }
    }
    if (sectionKey === 'gallery') {
      if (storagePath) data.storagePath=storagePath;
      if (imageUrl) data.imageUrl=imageUrl;
      data.alt=imageAlt || 'Photo from Vineyard Children Centre.';
      data.mediaType=mediaType;
    } else if (storagePath) {
      data.storagePath=storagePath;
    } else if (previous.storagePath) data.storagePath=previous.storagePath;
    data.createdAt=previous.createdAt || serverTimestamp(); data.updatedAt=serverTimestamp(); data.updatedBy=userId;
    await setDoc(doc(db,sectionKey,id),data);
    if (oldStoragePath && oldStoragePath !== data.storagePath) {
      try { await deleteObject(ref(storage,oldStoragePath)); }
      catch (error) { cleanupWarning=' Previous file cleanup failed; remove it from Firebase Storage later: '+oldStoragePath+'. '+safeFirebaseMessage(error); }
    }
    let listRefreshed = true;
    if (activeSection === sectionKey) {
      buildForm();
      listRefreshed = await loadRecords({ quiet: true });
    }
    const result = data.published
      ? (editing ? sectionLabel + ' updated and published successfully.' : sectionLabel + ' published successfully.')
      : (editing ? sectionLabel + ' changes saved as a draft.' : sectionLabel + ' saved as a draft.');
    setStatus(result + (listRefreshed ? '' : ' The save succeeded, but the dashboard list could not refresh. Reload this section to verify it.') + cleanupWarning);
  } catch (error) {
    if(uploadedStoragePath && uploadedStoragePath!==previousStoragePath()) {
      try { await deleteObject(ref(storage,uploadedStoragePath)); }
      catch(cleanupError) { setStatus('The record was not saved, and the uploaded file could not be cleaned up. Remove it manually from Firebase Storage: '+uploadedStoragePath+'. '+safeFirebaseMessage(cleanupError)); return; }
    }
    if (error.message && !error.code) setStatus(error.message);
    else showSafeError(error);
  } finally {
    if (form.contains(button)) { button.disabled=false; button.textContent=buttonLabel; }
  }
}

function previousStoragePath() { const record=records.find(function(item){return item.id===currentId;}); return record&&record.storagePath||''; }

async function removeRecord(record) {
  if (!window.confirm('Permanently delete this record? This cannot be undone.')) return;
  try {
    await deleteDoc(doc(db,activeSection,record.id));
    if(record.storagePath){
      setStatus('Record deleted. Removing uploaded file…');
      try { await deleteObject(ref(storage,record.storagePath)); setStatus('Record and uploaded file deleted.'); }
      catch(error) { setStatus('Record deleted, but its uploaded file remains in Firebase Storage. Remove it manually in the Firebase Console: '+record.storagePath+'. '+safeFirebaseMessage(error)); }
    } else setStatus('Record deleted.');
    await loadRecords({quiet:true});
  } catch (error) { showSafeError(error); }
}
