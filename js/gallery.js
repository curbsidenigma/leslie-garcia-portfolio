(() => {
  // Inline series catalogue. `picks` is the curated photo order (1-indexed)
  // matching files `{slug}-{NN}-{thumb|mid}.webp` on disk.
  const SERIES = {
    'sesion-rawlight-polemaniamx': {
      label: 'RawLight × Polemania MX',
      count: 7,
    },
    'luna': {
      label: 'Luna',
      count: 8,
    },
    'retratos-2026': {
      label: 'Retratos · 2026',
      count: 7,
    },
    'agua-y-mezcal': {
      label: 'Agua y Mezcal',
      count: 6,
    },
    'aerialarts-2025': {
      label: 'Aerial Arts · 2025',
      count: 5,
    },
  };

  const INTERVAL = 4800;

  function buildItems(slug, count) {
    const items = [];
    for (let i = 1; i <= count; i++) {
      const id = `${slug}-${String(i).padStart(2, '0')}`;
      items.push({
        thumb: `assets/gallery/${id}-thumb.webp`,
        mid: `assets/gallery/${id}-mid.webp`,
      });
    }
    return items;
  }

  function init() {
    const tiles = Array.from(
      document.querySelectorAll('.g-carousel[data-series]')
    );
    if (!tiles.length) return;

    tiles.forEach((tile, i) => {
      if (tile.dataset.hydrated === '1') return;
      const slug = tile.dataset.series;
      const meta = SERIES[slug];
      if (!meta || !meta.count) {
        console.warn('Gallery: unknown or empty series', slug);
        return;
      }
      tile.dataset.hydrated = '1';
      const items = buildItems(slug, meta.count);
      initCarousel(tile, { slug, label: meta.label, items }, i);
    });
  }

  function initCarousel(tile, series, tileIdx) {
    const items = series.items;
    const slidesEl = document.createElement('div');
    slidesEl.className = 'g-slides';

    items.forEach((item, i) => {
      const slide = document.createElement('div');
      slide.className = 'g-slide' + (i === 0 ? ' on' : '');
      const img = document.createElement('img');
      img.src = item.thumb;
      img.srcset = `${item.thumb} 800w, ${item.mid} 1400w`;
      img.sizes = '(max-width: 900px) 100vw, 50vw';
      img.alt = `${series.label} — ${String(i + 1).padStart(2, '0')}`;
      img.loading = i < 2 ? 'eager' : 'lazy';
      img.decoding = 'async';
      img.draggable = false;
      slide.appendChild(img);
      slidesEl.appendChild(slide);
    });

    const cover = document.createElement('div');
    cover.className = 'g-cover';
    const chevron = (dir) => `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="${dir === 'prev' ? '15 5 8 12 15 19' : '9 5 16 12 9 19'}"/></svg>`;
    cover.innerHTML = `
      <div class="g-meta">
        <span class="g-label">${series.label}</span>
        <span class="g-count" aria-live="polite"><i class="cur">01</i><i>/</i><i>${String(items.length).padStart(2, '0')}</i></span>
      </div>
      <div class="g-nav">
        <button class="g-arrow prev" type="button" aria-label="Imagen anterior">${chevron('prev')}</button>
        <button class="g-arrow next" type="button" aria-label="Imagen siguiente">${chevron('next')}</button>
      </div>
      <div class="g-bar" aria-hidden="true"><i></i></div>
    `;

    tile.appendChild(slidesEl);
    tile.appendChild(cover);

    const slideEls = slidesEl.querySelectorAll('.g-slide');
    const counter = cover.querySelector('.g-count .cur');
    const bar = cover.querySelector('.g-bar i');
    const prevBtn = cover.querySelector('.prev');
    const nextBtn = cover.querySelector('.next');

    let current = 0;
    let timer = null;
    let paused = false;

    function go(i) {
      const next = (i + items.length) % items.length;
      if (next === current) return;
      slideEls[current].classList.remove('on');
      slideEls[next].classList.add('on');
      current = next;
      counter.textContent = String(current + 1).padStart(2, '0');
      const upcoming = slideEls[
        (current + 1) % items.length
      ].querySelector('img');
      if (upcoming && upcoming.loading === 'lazy') upcoming.loading = 'eager';
      restartBar();
    }

    function restartBar() {
      bar.style.transition = 'none';
      bar.style.transform = 'scaleX(0)';
      void bar.offsetHeight; // reflow
      if (!paused) {
        bar.style.transition = `transform ${INTERVAL}ms linear`;
        bar.style.transform = 'scaleX(1)';
      }
    }

    function start() {
      stop();
      restartBar();
      timer = window.setInterval(() => {
        if (!paused) go(current + 1);
      }, INTERVAL);
    }

    function stop() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    }

    prevBtn.addEventListener('click', e => {
      e.stopPropagation();
      go(current - 1);
      start();
    });
    nextBtn.addEventListener('click', e => {
      e.stopPropagation();
      go(current + 1);
      start();
    });

    tile.addEventListener('mouseenter', () => {
      paused = true;
      bar.style.transition = 'none';
    });
    tile.addEventListener('mouseleave', () => {
      paused = false;
      restartBar();
    });

    setTimeout(start, tileIdx * 700);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
