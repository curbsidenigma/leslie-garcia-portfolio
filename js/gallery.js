(() => {
  const grid = document.getElementById('galleryGrid');
  const filtersEl = document.getElementById('galleryFilters');
  const lightbox = document.getElementById('lightbox');
  const lbImg = document.getElementById('lbImg');
  const lbCaption = document.getElementById('lbCaption');
  const lbClose = document.getElementById('lbClose');
  const lbPrev = document.getElementById('lbPrev');
  const lbNext = document.getElementById('lbNext');
  if (!grid || !filtersEl) return;

  let manifest = null;
  let visibleItems = [];
  let activeFilter = 'all';
  let lbIndex = 0;

  fetch('assets/gallery/manifest.json', { cache: 'no-cache' })
    .then(r => r.json())
    .then(data => {
      manifest = data;
      renderFilters();
      applyFilter('all');
    })
    .catch(err => {
      grid.innerHTML = '<p style="color: var(--fg-dim)">No se pudo cargar la galería.</p>';
      console.error('gallery manifest load failed', err);
    });

  function renderFilters() {
    const total = manifest.series.reduce((n, s) => n + s.items.length, 0);
    const chips = [
      makeChip('all', 'Todas', total),
      ...manifest.series.map(s => makeChip(s.slug, s.label, s.items.length)),
    ];
    filtersEl.replaceChildren(...chips);
  }

  function makeChip(slug, label, count) {
    const btn = document.createElement('button');
    btn.className = 'g-chip';
    btn.type = 'button';
    btn.role = 'tab';
    btn.dataset.filter = slug;
    btn.innerHTML = `<span>${label}</span><i>${count}</i>`;
    btn.addEventListener('click', () => applyFilter(slug));
    return btn;
  }

  function applyFilter(slug) {
    activeFilter = slug;
    filtersEl.querySelectorAll('.g-chip').forEach(c => {
      c.classList.toggle('on', c.dataset.filter === slug);
      c.setAttribute('aria-selected', c.dataset.filter === slug ? 'true' : 'false');
    });
    visibleItems = [];
    manifest.series.forEach(s => {
      if (slug !== 'all' && s.slug !== slug) return;
      s.items.forEach(item => visibleItems.push({ ...item, seriesLabel: s.label }));
    });
    renderGrid();
  }

  function renderGrid() {
    grid.replaceChildren(
      ...visibleItems.map((item, idx) => {
        const fig = document.createElement('button');
        fig.className = 'g-item';
        fig.type = 'button';
        fig.style.setProperty('--ratio', item.ratio);
        fig.dataset.index = idx;
        fig.setAttribute('aria-label', `Abrir imagen — ${item.seriesLabel}`);
        const img = document.createElement('img');
        img.src = item.thumb;
        img.alt = item.seriesLabel;
        img.loading = 'lazy';
        img.decoding = 'async';
        img.width = item.w;
        img.height = item.h;
        fig.appendChild(img);
        const cap = document.createElement('span');
        cap.className = 'g-item-cap';
        cap.textContent = item.seriesLabel;
        fig.appendChild(cap);
        fig.addEventListener('click', () => openLightbox(idx));
        return fig;
      })
    );
  }

  function openLightbox(idx) {
    lbIndex = idx;
    showCurrent();
    if (typeof lightbox.showModal === 'function') lightbox.showModal();
    else lightbox.setAttribute('open', '');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    if (typeof lightbox.close === 'function') lightbox.close();
    else lightbox.removeAttribute('open');
    document.body.style.overflow = '';
    lbImg.src = '';
  }

  function showCurrent() {
    const item = visibleItems[lbIndex];
    if (!item) return;
    lbImg.src = item.full || item.mid;
    lbImg.alt = item.seriesLabel;
    lbCaption.textContent = `${item.seriesLabel} · ${lbIndex + 1} / ${visibleItems.length}`;
  }

  function step(delta) {
    if (!visibleItems.length) return;
    lbIndex = (lbIndex + delta + visibleItems.length) % visibleItems.length;
    showCurrent();
  }

  lbClose.addEventListener('click', closeLightbox);
  lbPrev.addEventListener('click', () => step(-1));
  lbNext.addEventListener('click', () => step(+1));

  lightbox.addEventListener('click', e => {
    // click on backdrop (the dialog itself, not its children) closes
    if (e.target === lightbox) closeLightbox();
  });
  lightbox.addEventListener('cancel', e => {
    e.preventDefault();
    closeLightbox();
  });

  document.addEventListener('keydown', e => {
    if (!lightbox.open) return;
    if (e.key === 'ArrowLeft') step(-1);
    else if (e.key === 'ArrowRight') step(+1);
    else if (e.key === 'Escape') closeLightbox();
  });

  // Touch swipe
  let touchX = null;
  lightbox.addEventListener('touchstart', e => {
    touchX = e.changedTouches[0].screenX;
  }, { passive: true });
  lightbox.addEventListener('touchend', e => {
    if (touchX == null) return;
    const dx = e.changedTouches[0].screenX - touchX;
    if (Math.abs(dx) > 50) step(dx < 0 ? +1 : -1);
    touchX = null;
  }, { passive: true });
})();
