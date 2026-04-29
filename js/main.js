// ========== LOADER ==========
(function () {
  const loader = document.getElementById('loader');
  const pct = document.getElementById('loaderPct');
  const start = performance.now();
  const duration = 2400; // keep in sync with .track::after animation
  function tick(t) {
    const p = Math.min(1, (t - start) / duration);
    if (pct)
      pct.textContent = String(Math.floor(p * 100)).padStart(2, '0');
    if (p < 1) {
      requestAnimationFrame(tick);
    } else {
      setTimeout(() => {
        loader.classList.add('gone');
        document.body.classList.remove('loading');
      }, 280);
    }
  }
  requestAnimationFrame(tick);
})();

// Apply tweaks on load
(function () {
  const html = document.documentElement;
  html.setAttribute('data-palette', TWEAKS.palette || 'bronce-noir');
  html.setAttribute(
    'data-display',
    TWEAKS.displayFont || 'instrument-italic'
  );
})();

// Scroll reveal
const io = new IntersectionObserver(
  entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    });
  },
  { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
);
document.querySelectorAll('.reveal').forEach(el => {
  if (el.getBoundingClientRect().top < window.innerHeight * 0.9) {
    el.classList.add('in');
  } else {
    io.observe(el);
  }
});

// Nav scroll
const nav = document.getElementById('nav');
window.addEventListener(
  'scroll',
  () => {
    nav.classList.toggle('scrolled', window.scrollY > 80);
  },
  { passive: true }
);

// Smooth anchor
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', ev => {
    const id = a.getAttribute('href').slice(1);
    const el = document.getElementById(id);
    if (el) {
      ev.preventDefault();
      window.scrollTo({ top: el.offsetTop - 40, behavior: 'smooth' });
    }
  });
});

// ========== TWEAKS (edit mode) ==========
const tweaksPanel = document.getElementById('tweaks');
const palSwatches = document.getElementById('palSwatches');
const fontSel = document.getElementById('fontSel');

function syncTweaksUI() {
  palSwatches.querySelectorAll('.sw').forEach(sw => {
    sw.classList.toggle('active', sw.dataset.pal === TWEAKS.palette);
  });
  fontSel.value = TWEAKS.displayFont;
}
syncTweaksUI();

palSwatches.addEventListener('click', e => {
  const sw = e.target.closest('.sw');
  if (!sw) return;
  TWEAKS.palette = sw.dataset.pal;
  document.documentElement.setAttribute('data-palette', TWEAKS.palette);
  syncTweaksUI();
  persist({ palette: TWEAKS.palette });
});
fontSel.addEventListener('change', () => {
  TWEAKS.displayFont = fontSel.value;
  document.documentElement.setAttribute(
    'data-display',
    TWEAKS.displayFont
  );
  persist({ displayFont: TWEAKS.displayFont });
});

function persist(edits) {
  try {
    window.parent.postMessage(
      { type: '__edit_mode_set_keys', edits },
      '*'
    );
  } catch (e) {}
}

window.addEventListener('message', e => {
  const d = e.data || {};
  if (d.type === '__activate_edit_mode') {
    tweaksPanel.classList.add('on');
  }
  if (d.type === '__deactivate_edit_mode') {
    tweaksPanel.classList.remove('on');
  }
});

document.getElementById('tweaksClose').addEventListener('click', () => {
  tweaksPanel.classList.remove('on');
});

try {
  window.parent.postMessage({ type: '__edit_mode_available' }, '*');
} catch (e) {}
