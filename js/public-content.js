import { db, storage, firebaseReady, safeFirebaseMessage, firebaseSdk } from './firebase-client.js';
const { collection, getDocs, limit, query, serverTimestamp, addDoc, where, ref, getBlob } = firebaseSdk;

if (firebaseReady) {
  const path = decodeURIComponent(location.pathname.split('/').pop() || 'index.html').toLowerCase();
  const pageKeys = { 'index.html':'home', 'about.html':'about', 'programmes.html':'programmes', 'college.html':'college', 'impact.html':'impact', 'donate.html':'donate', 'contact.html':'contact', 'get involved.html':'get-involved', 'future-vision.html':'future-vision' };

  function node(tag, content, className) { const item=document.createElement(tag); if(content!==undefined)item.textContent=content; if(className)item.className=className; return item; }
  function section(title) { const wrapper=node('section'); const container=node('div',undefined,'container'); container.append(node('h2',title,'section-title')); wrapper.append(container); document.querySelector('main')?.append(wrapper); return container; }

  async function published(collectionName) {
    const snapshot=await getDocs(query(collection(db,collectionName),where('published','==',true),limit(40)));
    return snapshot.docs.map(function(item){return {id:item.id,...item.data()};});
  }

  function card(title, body, extra) { const item=node('article',undefined,'card'); if(title)item.append(node('h3',title)); if(body)item.append(node('p',body)); if(extra)item.append(extra); return item; }
  function addLink(parent,label,url,className) {
    if(!label || !url || /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(url))return;
    const a=node('a',label,className||'text-link'); a.href=url; parent.append(a);
  }
  const assetUrls=[];
  async function loadPublicAsset(path) {
    if(!path || !/^managed\/(gallery|documents|announcements|team)\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9._-]+$/.test(path)) throw new Error('Invalid asset path');
    const blob=await getBlob(ref(storage,path)); const url=URL.createObjectURL(blob); assetUrls.push(url); return url;
  }
  window.addEventListener('beforeunload',function(){assetUrls.forEach(URL.revokeObjectURL);});

  async function renderAnnouncements() {
    if(path!=='index.html' && path!=='events and news.html')return;
    const items=await published('announcements');
    const newsGrid=document.querySelector('.news-grid');
    if(newsGrid) {
      if(!items.length)return;
      newsGrid.replaceChildren();
      for(const item of items){const article=card(item.title,item.body); article.classList.add('news-card'); article.dataset.newsType=['news','events','announcements'].includes(item.category)?item.category:'news'; article.prepend(node('p',item.dateLabel||'','news-date')); if(item.storagePath){try{const image=document.createElement('img');image.src=await loadPublicAsset(item.storagePath);image.alt=item.imageAlt||'';image.loading='lazy';article.prepend(image);}catch(_){}} newsGrid.append(article);}
      const selected=document.querySelector('[data-news-filter][aria-pressed="true"]'); if(selected)selected.click();
    } else if(path==='index.html' && items.length) {
      const heading=Array.from(document.querySelectorAll('h2')).find(function(item){return item.textContent.trim()==='News & Events';});
      const grid=heading && heading.parentElement.querySelector('.grid');
      if(grid){grid.replaceChildren();items.slice(0,3).forEach(function(item){grid.append(card(item.title,item.body));});}
    }
  }

  async function renderGallery() {
    const gallery=document.querySelector('.gallery-grid'); if(!gallery)return;
    for(const item of await published('gallery')){
      if(!item.storagePath)continue; const figure=node('figure',undefined,'gallery-card');
      try { const image=document.createElement('img'); image.src=await loadPublicAsset(item.storagePath); image.alt=item.alt||''; image.loading='lazy'; image.decoding='async';
        figure.append(image,node('figcaption',item.title||'')); gallery.append(figure); } catch (_) { /* Keep a broken or unpublished asset out of the public page. */ }
    }
  }

  async function renderPageContent() {
    const slug=pageKeys[path]; if(!slug)return;
    const items=(await published('pages')).filter(function(item){return (item.slug||'').toLowerCase()===slug;});
    if(!items.length)return;
    const container=section('More about '+(document.querySelector('.page-hero h1')?.textContent||'our work'));
    items.forEach(function(item){container.append(card(item.title,item.body));});
  }

  async function renderTeamAndTestimonials() {
    if(path==='about.html') {
      const people=await published('team');
      if(people.length){const container=section('Our team');const grid=node('div',undefined,'grid grid-3');for(const person of people){const item=card(person.name,person.position+(person.biography?' — '+person.biography:''));if(person.storagePath){try{const image=document.createElement('img');image.src=await loadPublicAsset(person.storagePath);image.alt=person.photoAlt||'';image.loading='lazy';item.prepend(image);}catch(_){}}grid.append(item);}container.append(grid);}
    }
    if(path==='index.html') {
      const quotes=await published('testimonials');
      if(quotes.length){const container=section('Shared reflections');const grid=node('div',undefined,'grid grid-3');quotes.forEach(function(item){const quote=node('blockquote',item.quote);const article=card(item.name||'',undefined);article.append(quote);grid.append(article);});container.append(grid);}
    }
  }

  async function renderSupport() {
    if(path!=='donate.html')return;
    const items=await published('support'); if(!items.length)return;
    const container=section('Current support information');items.forEach(function(item){container.append(card(item.title,item.body));});
  }

  async function renderDocuments() {
    const container=document.querySelector('[data-public-documents]'); if(!container)return;
    try { const docs=await published('documents');container.replaceChildren();
      if(!docs.length){container.append(node('p','No public documents are available at this time.'));return;}
      docs.forEach(function(item){const article=card(item.title,item.description);if(item.category||item.dateLabel)article.append(node('p',[item.category,item.dateLabel].filter(Boolean).join(' · '),'news-date'));if(item.storagePath){const button=node('button','Download PDF','btn btn-blue');button.type='button';button.addEventListener('click',async function(){button.disabled=true;button.textContent='Preparing download…';try{const blob=await getBlob(ref(storage,item.storagePath));const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=(item.title||'public-document').replace(/[^a-z0-9_-]/gi,'_')+'.pdf';a.click();window.setTimeout(function(){URL.revokeObjectURL(url);},30000);button.textContent='Download PDF';}catch(_){button.textContent='Download unavailable';}finally{button.disabled=false;}});article.append(button);}container.append(article);});
    } catch(error) { container.textContent='Public documents could not be loaded right now.'; }
  }

  async function setupEnquiryForms() {
  document.querySelectorAll('[data-enquiry-form]').forEach(function(form){
      form.addEventListener('submit',async function(event){
        event.preventDefault();const status=form.querySelector('[data-form-status]');const button=form.querySelector('[type="submit"]');
        if(form.elements.website.value){status.textContent='Thank you. Your message has been received.';form.reset();return;}
        if(!form.reportValidity())return;
        button.disabled=true;status.textContent='Sending your message…';
        try { await addDoc(collection(db,'enquiries'),{
          name:form.elements.name.value.trim(),email:form.elements.email.value.trim(),phone:form.elements.phone.value.trim(),
          interest:form.elements.interest.value,message:form.elements.message.value.trim(),status:'new',createdAt:serverTimestamp()
        });
          const isVolunteering=form.elements.interest.value==='Volunteering';
          form.reset();
          status.textContent=isVolunteering
            ? 'Thank you. Your volunteering enquiry was submitted successfully.'
            : 'Thank you. Your enquiry was submitted successfully.';
        }
        catch(error){status.textContent=safeFirebaseMessage(error);}
        finally{button.disabled=false;}
      });
    });
  }

  Promise.allSettled([renderAnnouncements(),renderGallery(),renderPageContent(),renderTeamAndTestimonials(),renderSupport(),renderDocuments()]);
  setupEnquiryForms();
} else {
  document.querySelectorAll('[data-public-documents]').forEach(function(container){container.textContent='Public documents will appear here once the website is connected to its Firebase project.';});
  document.querySelectorAll('[data-enquiry-form]').forEach(function(form){
    const status=form.querySelector('[data-form-status]'); const button=form.querySelector('[type="submit"]'); button.disabled=true;
    status.textContent='This enquiry form is not available yet. Please use the telephone or WhatsApp contact while Firebase is being configured.';
  });
}
