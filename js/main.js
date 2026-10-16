// ===== MOBILE MENU TOGGLE =====
document.addEventListener('DOMContentLoaded', function () {
  const menuToggle = document.querySelector('.menu-toggle');
  const navLinks = document.querySelector('.nav-links');

  if (menuToggle && navLinks) {
    menuToggle.setAttribute('aria-expanded', String(navLinks.classList.contains('active')));
    menuToggle.addEventListener('click', function () {
      const expanded = navLinks.classList.toggle('active');
      menuToggle.setAttribute('aria-expanded', String(expanded));
    });
  }

  // Close menu when a link is clicked
  document.querySelectorAll('.nav-links a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('active');
      if (menuToggle) menuToggle.setAttribute('aria-expanded', 'false');
    });
  });

  // ===== CONTACT FORM HANDLING =====
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      alert('Thank you for your message! We will get back to you soon.');
      contactForm.reset();
    });
  }

  // ===== VOLUNTEER FORM HANDLING =====
  const volunteerForm = document.getElementById('volunteerForm');
  if (volunteerForm) {
    volunteerForm.addEventListener('submit', function (e) {
      e.preventDefault();
      alert('Thank you for your interest in volunteering! We will contact you shortly.');
      volunteerForm.reset();
    });
  }

  // ===== ANIMATED COUNTERS =====
  const counters = document.querySelectorAll('.stat-number');
  const animateCounter = (counter) => {
    const target = +counter.getAttribute('data-target');
    const duration = 2000;
    const increment = target / (duration / 16);
    let current = 0;

    const updateCounter = () => {
      current += increment;
      if (current < target) {
        counter.textContent = Math.ceil(current) + '+';
        requestAnimationFrame(updateCounter);
      } else {
        counter.textContent = target + '+';
      }
    };
    updateCounter();
  };

  // Trigger counters when in view
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(counter => observer.observe(counter));

  // ===== SCROLL REVEAL =====
  const revealElements = document.querySelectorAll('.card, .content-block, .gallery-item');
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  revealElements.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    revealObserver.observe(el);
  });
});
// Donation options, copy buttons, and local admin content.
document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('[data-donation-tab]').forEach(function (tab) {
    tab.addEventListener('click', function () {
      document.querySelectorAll('[data-donation-tab]').forEach(function (item) { item.setAttribute('aria-selected', String(item === tab)); });
      document.querySelectorAll('[data-donation-panel]').forEach(function (panel) { panel.hidden = panel.dataset.donationPanel !== tab.dataset.donationTab; });
    });
  });
  document.querySelectorAll('[data-copy]').forEach(function (button) {
    button.addEventListener('click', async function () {
      const target = document.getElementById(button.dataset.copy);
      if (!target) return;
      try { await navigator.clipboard.writeText(target.textContent.trim()); button.textContent = 'Copied'; }
      catch (_) { button.textContent = 'Select and copy'; }
      setTimeout(function () { button.textContent = 'Copy'; }, 1600);
    });
  });
  const updateForm = document.getElementById('adminUpdateForm');
  const updatesList = document.getElementById('adminUpdates');
  const publicUpdates = document.querySelectorAll('[data-site-updates]');
  function readUpdates() { try { return JSON.parse(localStorage.getItem('vineyardSiteUpdates') || '[]'); } catch (_) { return []; } }
  function renderUpdates() {
    const updates = readUpdates();
    [updatesList].concat(Array.from(publicUpdates)).filter(Boolean).forEach(function (list) {
      list.replaceChildren();
      updates.forEach(function (entry) {
        const card = document.createElement('article'); card.className = list === updatesList ? 'admin-post' : 'site-update'; if (list !== updatesList) card.dataset.newsType = entry.category || 'announcements';
        const heading = document.createElement('h3'); heading.textContent = entry.title;
        const date = document.createElement('small'); date.textContent = entry.date;
        const body = document.createElement('p'); body.textContent = entry.body;
        card.append(heading, date, body);
        if (list === updatesList) { const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'copy-button'; remove.textContent = 'Remove'; remove.addEventListener('click', function () { localStorage.setItem('vineyardSiteUpdates', JSON.stringify(readUpdates().filter(function (item) { return item.id !== entry.id; }))); renderUpdates(); }); card.append(remove); }
        list.append(card);
      });
    });
  }
  if (updateForm) updateForm.addEventListener('submit', function (event) {
    event.preventDefault(); const data = new FormData(updateForm);
    const updates = readUpdates(); updates.unshift({ id: String(Date.now()), title: data.get('title').trim(), date: data.get('date'), category: data.get('category') || 'announcements', body: data.get('body').trim() });
    localStorage.setItem('vineyardSiteUpdates', JSON.stringify(updates)); updateForm.reset(); renderUpdates();
  });
  renderUpdates();
  const donationForm = document.getElementById('donationForm');
  if (donationForm) donationForm.addEventListener('submit', function (event) { event.preventDefault(); const thanks = document.getElementById('donationThanks'); if (thanks) { thanks.hidden = false; thanks.focus(); } donationForm.reset(); });
});



// Theme toggle, news filters, FAQ filters, and admin session controls.
document.addEventListener('DOMContentLoaded', function () {
  const savedTheme = localStorage.getItem('vineyardTheme');
  if (savedTheme === 'dark' || savedTheme === 'light') document.documentElement.dataset.theme = savedTheme;
  const themeButton = document.createElement('button');
  themeButton.type = 'button'; themeButton.className = 'theme-toggle'; themeButton.setAttribute('aria-label', 'Switch colour theme');
  function updateThemeButton() { const dark = document.documentElement.dataset.theme === 'dark'; themeButton.textContent = dark ? 'Light mode' : 'Dark mode'; themeButton.setAttribute('aria-pressed', String(dark)); }
  themeButton.addEventListener('click', function () { const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = next; localStorage.setItem('vineyardTheme', next); updateThemeButton(); });
  document.body.append(themeButton); updateThemeButton();

  document.querySelectorAll('[data-news-filter]').forEach(function (button) { button.addEventListener('click', function () { const selected = button.dataset.newsFilter; document.querySelectorAll('[data-news-filter]').forEach(function (item) { item.setAttribute('aria-pressed', String(item === button)); }); document.querySelectorAll('[data-news-type]').forEach(function (card) { card.hidden = selected !== 'all' && card.dataset.newsType !== selected; }); }); });
  document.querySelectorAll('[data-faq-filter]').forEach(function (button) { button.addEventListener('click', function () { const selected = button.dataset.faqFilter; document.querySelectorAll('[data-faq-filter]').forEach(function (item) { item.setAttribute('aria-pressed', String(item === button)); }); document.querySelectorAll('[data-faq-category]').forEach(function (item) { item.hidden = selected !== 'all' && item.dataset.faqCategory !== selected; }); }); });
  const signup = document.getElementById('newsSignup');
  if (signup) signup.addEventListener('submit', function (event) { event.preventDefault(); const status = document.getElementById('newsSignupStatus'); if (status) status.hidden = false; signup.reset(); });

  const loginForm = document.getElementById('adminLoginForm');
  const loginPanel = document.getElementById('adminLoginPanel');
  const dashboard = document.getElementById('adminDashboard');
  const logoutButton = document.getElementById('adminLogout');
  const loginError = document.getElementById('adminLoginError');
  const ADMIN_ACCESS_CODE = 'change-me-before-publishing';
  function showAdmin(isLoggedIn) { if (loginPanel) loginPanel.hidden = isLoggedIn; if (dashboard) dashboard.hidden = !isLoggedIn; if (logoutButton) logoutButton.hidden = !isLoggedIn; }
  if (loginForm) {
    showAdmin(sessionStorage.getItem('vineyardAdminSession') === 'active');
    loginForm.addEventListener('submit', function (event) { event.preventDefault(); const input = document.getElementById('adminAccessCode'); if (input && input.value === ADMIN_ACCESS_CODE) { sessionStorage.setItem('vineyardAdminSession', 'active'); if (loginError) loginError.hidden = true; input.value = ''; showAdmin(true); } else if (loginError) loginError.hidden = false; });
  }
  if (logoutButton) logoutButton.addEventListener('click', function () { sessionStorage.removeItem('vineyardAdminSession'); showAdmin(false); });
});

