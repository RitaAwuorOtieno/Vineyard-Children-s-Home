document.addEventListener('DOMContentLoaded', function () {
  const skipLink = document.createElement('a');
  const mainContent = document.querySelector('main') || document.querySelector('.hero, .page-hero');
  if (mainContent) {
    mainContent.id = mainContent.id || 'main-content';
    skipLink.href = '#main-content';
    skipLink.className = 'skip-link';
    skipLink.textContent = 'Skip to main content';
    document.body.prepend(skipLink);
  }

  const menuToggle = document.querySelector('.menu-toggle');
  const navLinks = document.querySelector('.nav-links');

  if (navLinks) {
    const navigation = navLinks.closest('nav');
    if (navigation && !navigation.hasAttribute('aria-label')) {
      navigation.setAttribute('aria-label', 'Main navigation');
    }
    [
      { href: 'Events%20and%20news.html', label: 'News & Events', before: 'get%20involved.html' },
      { href: 'contact.html', label: 'Contact Us', before: 'donate.html' }
    ].forEach(function (item) {
      const existing = Array.from(navLinks.querySelectorAll('a')).some(function (link) {
        return link.getAttribute('href').toLowerCase() === item.href.toLowerCase();
      });
      if (!existing) {
        const listItem = document.createElement('li');
        const link = document.createElement('a');
        link.href = item.href;
        link.textContent = item.label;
        listItem.append(link);
        const reference = Array.from(navLinks.querySelectorAll('a')).find(function (existingLink) {
          return existingLink.getAttribute('href').toLowerCase() === item.before.toLowerCase();
        });
        if (reference) reference.parentElement.before(listItem);
        else navLinks.append(listItem);
      }
    });

    const currentPage = (decodeURIComponent(window.location.pathname.split('/').pop()) || 'index.html').toLowerCase();
    navLinks.querySelectorAll('a').forEach(function (link) {
      const targetPage = decodeURIComponent(new URL(link.href).pathname.split('/').pop()).toLowerCase();
      if (targetPage === 'programmes.html') link.textContent = 'Programmes';
      if (targetPage === currentPage) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      } else {
        link.classList.remove('active');
        link.removeAttribute('aria-current');
      }
    });
  }

  const themeToggle = document.createElement('button');
  themeToggle.type = 'button';
  themeToggle.className = 'theme-toggle';
  themeToggle.setAttribute('aria-pressed', 'false');
  const storedTheme = (function () {
    try { return localStorage.getItem('vineyardTheme'); } catch (error) { return null; }
  })();
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.dataset.theme = storedTheme || (prefersDark ? 'dark' : 'light');

  function updateThemeToggle() {
    const isDark = document.documentElement.dataset.theme === 'dark';
    themeToggle.textContent = isDark ? 'Light mode' : 'Dark mode';
    themeToggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    themeToggle.setAttribute('aria-pressed', String(isDark));
  }

  themeToggle.addEventListener('click', function () {
    const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = nextTheme;
    try { localStorage.setItem('vineyardTheme', nextTheme); } catch (error) { /* The toggle still works for this page. */ }
    updateThemeToggle();
  });
  if (menuToggle) menuToggle.before(themeToggle);
  else if (navLinks && navLinks.parentElement) navLinks.parentElement.append(themeToggle);
  updateThemeToggle();

  const footerGrid = document.querySelector('footer .footer-grid');
  if (footerGrid) {
    const requiredFooterLinks = [
      { href: 'Faqs.html', label: 'FAQs' },
      { href: 'privacy.html', label: 'Privacy Policy' },
      { href: 'safeguarding.html', label: 'Child Safeguarding & Photography' },
      { href: 'resources.html', label: 'Public Documents' },
      { href: 'admin-login.html', label: 'Admin Login' }
    ];
    const missingFooterLinks = requiredFooterLinks.filter(function (item) {
      return !Array.from(footerGrid.querySelectorAll('a')).some(function (link) {
        return link.getAttribute('href').toLowerCase() === item.href.toLowerCase();
      });
    });
    if (missingFooterLinks.length) {
      const column = document.createElement('div');
      column.className = 'footer-col';
      const heading = document.createElement('h2');
      heading.textContent = 'Information';
      column.append(heading);
      missingFooterLinks.forEach(function (item) {
        const link = document.createElement('a');
        link.href = item.href;
        link.textContent = item.label;
        column.append(link);
      });
      footerGrid.append(column);
    }
  }

  if (menuToggle && navLinks) {
    const navigation = menuToggle.closest('nav');
    navLinks.id = navLinks.id || 'site-navigation';
    menuToggle.setAttribute('aria-controls', navLinks.id);
    menuToggle.setAttribute('aria-expanded', String(navLinks.classList.contains('active')));
    menuToggle.addEventListener('click', function () {
      const expanded = navLinks.classList.toggle('active');
      menuToggle.setAttribute('aria-expanded', String(expanded));
    });

    navLinks.addEventListener('click', function (event) {
      if (event.target.closest('a')) {
        navLinks.classList.remove('active');
        menuToggle.setAttribute('aria-expanded', 'false');
      }
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && navLinks.classList.contains('active')) {
        navLinks.classList.remove('active');
        menuToggle.setAttribute('aria-expanded', 'false');
        menuToggle.focus();
      }
    });

    document.addEventListener('click', function (event) {
      if (navigation && !navigation.contains(event.target) && navLinks.classList.contains('active')) {
        navLinks.classList.remove('active');
        menuToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  const tabs = Array.from(document.querySelectorAll('[data-donation-tab]'));
  const panels = Array.from(document.querySelectorAll('[data-donation-panel]'));

  function selectDonationTab(selectedTab, moveFocus) {
    tabs.forEach(function (tab) {
      const selected = tab === selectedTab;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    panels.forEach(function (panel) {
      panel.hidden = panel.dataset.donationPanel !== selectedTab.dataset.donationTab;
    });
    if (moveFocus) selectedTab.focus();
  }

  tabs.forEach(function (tab, index) {
    tab.addEventListener('click', function () {
      selectDonationTab(tab, false);
    });
    tab.addEventListener('keydown', function (event) {
      let nextIndex;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        nextIndex = (index + 1) % tabs.length;
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        nextIndex = (index - 1 + tabs.length) % tabs.length;
      } else if (event.key === 'Home') {
        nextIndex = 0;
      } else if (event.key === 'End') {
        nextIndex = tabs.length - 1;
      } else {
        return;
      }
      event.preventDefault();
      selectDonationTab(tabs[nextIndex], true);
    });
  });

  if (tabs.length) {
    const selectedTab = tabs.find(function (tab) {
      return tab.getAttribute('aria-selected') === 'true';
    }) || tabs[0];
    selectDonationTab(selectedTab, false);
  }

  document.querySelectorAll('[data-copy]').forEach(function (button) {
    button.addEventListener('click', async function () {
      const target = document.getElementById(button.dataset.copy);
      const status = button.parentElement.querySelector('[data-copy-status]');
      if (!target || !status) return;

      try {
        if (!navigator.clipboard || !window.isSecureContext) {
          throw new Error('Clipboard access requires a secure browser context.');
        }
        await navigator.clipboard.writeText(target.textContent.trim());
        status.textContent = 'Copied to clipboard.';
      } catch (error) {
        status.textContent = 'Clipboard access is unavailable. Select and copy the value shown.';
      }
    });
  });

  document.querySelectorAll('[data-news-filter]').forEach(function (button) {
    button.addEventListener('click', function () {
      const selected = button.dataset.newsFilter;
      document.querySelectorAll('[data-news-filter]').forEach(function (item) {
        item.setAttribute('aria-pressed', String(item === button));
      });
      const cards = Array.from(document.querySelectorAll('[data-news-type]'));
      cards.forEach(function (card) {
        card.hidden = selected !== 'all' && card.dataset.newsType !== selected;
      });
      const emptyState = document.querySelector('[data-news-empty]');
      if (emptyState) emptyState.hidden = cards.some(function (card) { return !card.hidden; });
    });
  });


  document.querySelectorAll('[data-faq-filter]').forEach(function (button) {
    button.addEventListener('click', function () {
      const selected = button.dataset.faqFilter;
      document.querySelectorAll('[data-faq-filter]').forEach(function (item) {
        item.setAttribute('aria-pressed', String(item === button));
      });
      document.querySelectorAll('[data-faq-category]').forEach(function (item) {
        item.hidden = selected !== 'all' && item.dataset.faqCategory !== selected;
      });
    });
  });

  const firebaseContent = document.createElement('script');
  firebaseContent.type = 'module';
  firebaseContent.src = 'js/public-content.js';
  document.body.append(firebaseContent);

});
