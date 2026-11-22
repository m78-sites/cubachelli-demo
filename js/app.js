/* Cubachelli — демо-сайт для оптовиков. Без библиотек. */
(() => {
  'use strict';
  const D = window.CB_DATA;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const byId = Object.fromEntries(D.products.map(p => [p.id, p]));
  const groupName = Object.fromEntries(D.groups.map(g => [g.id, g.name]));

  const money = n => {
    const whole = Math.abs(n % 1) < 0.005;
    return n.toLocaleString('ru-RU', { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 }) + ' ₽';
  };
  const plural = (n, a, b, c) => {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return a;
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return b;
    return c;
  };
  const boxes = n => n + ' ' + plural(n, 'короб', 'короба', 'коробов');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const icon = id => `<svg><use href="#${id}"/></svg>`;

  /* ——— Всплывашка ——— */
  const toastEl = $('[data-toast]');
  let toastT;
  const toast = msg => {
    toastEl.textContent = msg;
    toastEl.classList.add('is-on');
    clearTimeout(toastT);
    toastT = setTimeout(() => toastEl.classList.remove('is-on'), 2200);
  };

  /* ——— Бабочки на первом экране: как белые бабочки на их бордовых открытках ——— */
  const flight = $('[data-flight]');
  if (flight) {
    const n = innerWidth < 700 ? 9 : 15;
    const rnd = (a, b) => a + Math.random() * (b - a);
    for (let i = 0; i < n; i++) {
      const f = document.createElement('span');
      f.className = 'fly';
      const w = rnd(16, i % 4 === 0 ? 64 : 38);
      f.style.cssText = `--x:${rnd(-4, 96)}%;--w:${w}px;--d:${rnd(22, 38)}s;--dl:${-rnd(0, 38)}s;--r:${rnd(-30, 30)}deg;--dx:${rnd(-80, 80)}px;--o:${(w > 40 ? rnd(.1, .16) : rnd(.14, .3)).toFixed(2)};--f:${rnd(1.1, 2.2).toFixed(2)}s`;
      f.innerHTML = '<i></i>';
      flight.appendChild(f);
    }
  }

  /* ——— Меню на телефоне ——— */
  const mnav = $('[data-mnav]');
  const burger = $('[data-burger]');
  const setMenu = open => {
    mnav.classList.toggle('is-open', open);
    mnav.setAttribute('aria-hidden', String(!open));
    burger.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
  };
  burger.addEventListener('click', () => setMenu(true));
  $('[data-mnav-close]').addEventListener('click', () => setMenu(false));
  $$('a', mnav).forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape' && mnav.classList.contains('is-open')) setMenu(false); });

  /* ——— Подборка (корзина для опта): id → число коробов ——— */
  const KEY = 'cb3-basket';
  let basket = {};
  try { basket = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { basket = {}; }
  Object.keys(basket).forEach(id => { if (!byId[id] || !(basket[id] > 0)) delete basket[id]; });
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(basket)); } catch (e) { /* приватный режим */ } };
  const boxPrice = p => (p.price && p.box) ? p.price * p.box : null;
  const totals = () => {
    let count = 0, sum = 0, unpriced = 0;
    for (const [id, q] of Object.entries(basket)) {
      count += q;
      const bp = boxPrice(byId[id]);
      if (bp) sum += bp * q; else unpriced++;
    }
    return { count, sum, unpriced };
  };

  /* ——— Ассортимент ——— */
  const visual = (p, cls = 'pcard__cut') => p.img
    ? `<img class="${cls}${p.flip ? ' is-flip' : ''}" src="${p.img}" alt="${esc(p.name)}" loading="lazy" decoding="async">`
    : `<span class="pcard__tile" style="--tb:${p.tile.bg};--ti:${p.tile.ink}" role="img" aria-label="${esc(p.name)}, фото будет"><span>${p.tile.word}<small>фото будет</small></span></span>`;
  const metaLine = p => [p.weight, p.box ? `${p.box} шт в коробе` : null, p.shelf].filter(Boolean).join(' · ');

  const catalog = $('[data-catalog]');
  catalog.innerHTML = D.groups.map(g => {
    const items = D.products.filter(p => p.group === g.id);
    return `<div class="cat" id="cat-${g.id}" data-cat="${g.id}">
      <div class="cat__head"><h3>${g.name}</h3><sup>${items.length}</sup><p class="cat__note">${g.note}</p></div>
      <div class="pgrid">${items.map(p => `
        <article class="pcard" data-card="${p.id}">
          ${p.tag ? `<span class="pcard__tag">${p.tag}</span>` : ''}
          <button class="pcard__open" type="button" data-open="${p.id}" aria-label="Подробнее: ${esc(p.name)}">
            <span class="pcard__stage">${visual(p)}</span>
            <span class="pcard__name">${p.name}</span>
            <span class="pcard__meta">${metaLine(p)}</span>
          </button>
          <div class="pcard__foot">
            ${p.price ? `<span class="pcard__price">${money(p.price)} <small>/ шт</small></span>` : '<span class="pcard__price na">Цена по&nbsp;запросу</span>'}
            <button class="add" type="button" data-add="${p.id}" aria-label="Добавить короб в подборку: ${esc(p.name)}">${icon('i-plus')}</button>
          </div>
        </article>`).join('')}</div>
    </div>`;
  }).join('') + `<div class="assort__foot"><span>Фото позиций без снимка добавим после предметной съёмки. Цены — из таблицы от ${D.updated}.</span><a class="lnk" style="color:var(--on-bordo);border-color:var(--bline-2)" href="catalog.html" target="_blank" rel="noopener">Весь каталог в PDF${icon('i-arrow-ne')}</a></div>`;

  /* вкладки: прокрутка к разделу и подсветка текущего */
  const tabsRow = $('[data-tabs-row]');
  tabsRow.innerHTML = D.groups.map((g, i) => {
    const n = D.products.filter(p => p.group === g.id).length;
    return `<button class="tab" type="button" data-tab="${g.id}" aria-current="${i === 0}">${g.name}<sup>${n}</sup></button>`;
  }).join('');
  const setTab = id => $$('.tab', tabsRow).forEach(t => {
    const on = t.dataset.tab === id;
    t.setAttribute('aria-current', String(on));
    if (on) tabsRow.scrollTo({ left: t.offsetLeft - 16, behavior: reduce ? 'auto' : 'smooth' });
  });
  tabsRow.addEventListener('click', e => {
    const t = e.target.closest('[data-tab]');
    if (!t) return;
    setTab(t.dataset.tab);
    $('#cat-' + t.dataset.tab).scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  });
  const catIO = new IntersectionObserver(es => {
    es.forEach(e => { if (e.isIntersecting) setTab(e.target.dataset.cat); });
  }, { rootMargin: '-35% 0px -60% 0px' });
  $$('.cat').forEach(c => catIO.observe(c));

  /* ——— Обновление подборки на странице ——— */
  const bagBtn = $('.bagbtn');
  const countEl = $('[data-count]');
  const fab = $('[data-fab]');
  const formPick = $('[data-form-pick]');
  let fabBlocked = false;

  const renderAdds = () => {
    $$('[data-add]').forEach(b => {
      const q = basket[b.dataset.add] || 0;
      b.classList.toggle('is-added', q > 0);
      b.innerHTML = q > 0 ? `<span class="n">${q}</span>` : icon('i-plus');
    });
  };
  const renderBag = () => {
    const list = $('[data-bag-list]');
    const ids = Object.keys(basket);
    $('[data-bag-empty]').hidden = ids.length > 0;
    $('[data-bag-foot]').hidden = ids.length === 0;
    list.innerHTML = ids.map(id => {
      const p = byId[id], q = basket[id], bp = boxPrice(p);
      return `<div class="bi">
        <span class="bi__pic">${visual(p, '')}</span>
        <div><p class="bi__name">${p.name}</p><p class="bi__price">${bp ? `${p.box} шт × ${money(p.price)} = ${money(bp)} за короб` : 'Цену пришлём по запросу'}</p></div>
        <div class="bi__row">
          <div class="qty"><button type="button" data-dec="${id}" aria-label="Убрать короб">${icon('i-minus')}</button><span>${boxes(q)}</span><button type="button" data-inc="${id}" aria-label="Добавить короб">${icon('i-plus')}</button></div>
          <span class="bi__sum">${bp ? money(bp * q) : '—'}</span>
        </div>
      </div>`;
    }).join('');
    const t = totals();
    $('[data-total]').textContent = money(t.sum);
  };
  const renderPick = () => {
    const ids = Object.keys(basket);
    if (!ids.length) {
      formPick.innerHTML = '<p>Пока пусто. Отметьте позиции в&nbsp;<a href="#assortiment">ассортименте</a> — они появятся здесь. Или напишите в&nbsp;комментарии, что нужно.</p>';
      return;
    }
    const t = totals();
    formPick.innerHTML = `<ul>${ids.map(id => `<li><span>${byId[id].name}</span><span>${boxes(basket[id])}</span></li>`).join('')}
      <li class="sum"><span>Сумма по&nbsp;отпускным ценам</span><span>${money(t.sum)}${t.unpriced ? ' + по запросу' : ''}</span></li></ul>`;
  };
  const renderFab = () => {
    const t = totals();
    $('[data-fab-count]').textContent = boxes(t.count);
    $('[data-fab-sum]').textContent = money(t.sum);
    fab.classList.toggle('is-on', t.count > 0 && !fabBlocked);
  };
  const renderAll = () => {
    const t = totals();
    countEl.textContent = t.count;
    renderAdds(); renderBag(); renderPick(); renderFab();
  };
  const change = (id, d) => {
    const q = Math.max(0, (basket[id] || 0) + d);
    if (q) basket[id] = q; else delete basket[id];
    save(); renderAll();
    if (d > 0) {
      bagBtn.classList.remove('is-bump'); void bagBtn.offsetWidth; bagBtn.classList.add('is-bump');
      const p = byId[id];
      toast(q === 1 ? `Добавили короб: ${p.name}` : `${boxes(q)}: ${p.name}`);
    }
  };

  document.addEventListener('click', e => {
    const a = e.target.closest('[data-add]');
    if (a) { change(a.dataset.add, 1); return; }
    const inc = e.target.closest('[data-inc]');
    if (inc) { change(inc.dataset.inc, 1); return; }
    const dec = e.target.closest('[data-dec]');
    if (dec) { change(dec.dataset.dec, -1); return; }
    const o = e.target.closest('[data-open]');
    if (o) { openProduct(o.dataset.open); return; }
    if (e.target.closest('[data-open-bag]')) { renderBag(); bagDlg.showModal(); return; }
    if (e.target.closest('[data-open-policy]')) { e.preventDefault(); policyDlg.showModal(); return; }
  });

  /* ——— Окна ——— */
  const modal = $('[data-modal]');
  const bagDlg = $('[data-bag]');
  const policyDlg = $('[data-policy]');
  [modal, bagDlg, policyDlg].forEach(d => {
    d.addEventListener('click', e => {
      if (e.target === d || e.target.closest('[data-close]')) d.close();
    });
  });
  $('[data-clear]').addEventListener('click', () => { basket = {}; save(); renderAll(); });
  $('[data-to-form]').addEventListener('click', () => {
    bagDlg.close();
    $('#zayavka').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  });

  let modalId = null;
  const modalAdd = $('[data-m-add]');
  const setModalBtn = () => {
    const p = byId[modalId], q = basket[modalId] || 0, bp = boxPrice(p);
    modalAdd.innerHTML = (q ? `В подборке ${boxes(q)}, добавить ещё` : (bp ? `В подборку · короб ${money(bp)}` : 'В подборку, цену пришлём')) + `<span class="btn__ico">${icon('i-plus')}</span>`;
  };
  function openProduct(id) {
    const p = byId[id];
    modalId = id;
    $('[data-m-img]').innerHTML = visual(p, '');
    $('[data-m-cat]').textContent = groupName[p.group] + (p.tag ? ' · ' + p.tag : '');
    $('[data-m-name]').innerHTML = p.name + (p.sub ? `, <i>${p.sub}</i>` : '');
    $('[data-m-line]').textContent = p.line;
    const rows = [
      ['Вес', p.weight], ['В коробе', p.box ? p.box + ' шт' : 'уточним'],
      ['Срок годности', p.shelf], ['Хранение', p.store || 'уточним'],
      ['Цена за шт', p.price ? money(p.price) : 'по запросу'], ['Цена за короб', boxPrice(p) ? money(boxPrice(p)) : 'по запросу']
    ];
    $('[data-m-spec]').innerHTML = rows.map(r => `<div><dt>${r[0]}</dt><dd>${r[1]}</dd></div>`).join('');
    $('[data-m-more]').innerHTML =
      `<p><b>Состав</b>${p.comp}</p>` +
      (p.kbju ? `<p><b>Пищевая ценность на 100 г</b>${p.kbju}</p>` : '') +
      `<p><b>Где продаётся</b>${p.channel}${p.link ? ` · <a href="${p.link}" target="_blank" rel="noopener">карточка во ВкусВилле ↗</a>` : ''}</p>`;
    setModalBtn();
    modal.showModal();
  }
  modalAdd.addEventListener('click', () => { change(modalId, 1); setModalBtn(); });

  /* ——— Плавающая кнопка прячется, когда на экране заявка ——— */
  new IntersectionObserver(es => {
    es.forEach(e => { fabBlocked = e.isIntersecting; renderFab(); });
  }, { threshold: .05 }).observe($('#zayavka'));

  /* ——— Активный пункт в шапке ——— */
  const navLinks = $$('.hdr__nav a');
  const navIO = new IntersectionObserver(es => {
    es.forEach(e => {
      if (!e.isIntersecting) return;
      navLinks.forEach(a => a.classList.toggle('is-on', a.getAttribute('href') === '#' + e.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  ['assortiment', 'ceh', 'usloviya', 'zayavka'].forEach(id => navIO.observe($('#' + id)));

  /* ——— Цех как сторис ——— */
  const SLIDES = [
    { v: 'testo', k: 'Тесто', t: 'Раскатываем очень тонко', p: 'Чтобы пахлава получилась нежной и хрустящей.' },
    { v: 'frukty', k: 'Фрукты', t: 'Только настоящий вкус фруктов', p: 'Никаких ароматизаторов и красителей. Вместо ароматизаторов — свежие апельсины.' },
    { v: 'sirop', k: 'Пропитка', t: 'Соки вместо сиропа', p: 'В пахлаве на аллюлозе вместо сиропа — апельсиновый, вишнёвый соки и финиковый сироп.' },
    { v: 'hrust', k: 'Хруст', t: 'Тот самый хруст, та самая сочность', p: 'Вместо пальмового масла — сливочное.' },
    { v: 'babochki', k: 'Мармелад', t: 'Бабочки без желатина', p: 'Свежий сок, цитрусовый пектин и 0% желатина. Бережно упаковываем в крафт.' },
    { v: 'fasovka', k: 'Фасовка', t: 'Отправляем на доставку', p: 'Фасуем в цеху и отгружаем коробами: в сети, на маркетплейсы и в магазины.' },
    { v: 'market', k: 'Маркет W/VENUE', t: 'Разобрали за день', p: 'Продукцию, рассчитанную на два дня, разобрали за день.' }
  ];
  const story = $('[data-story]');
  if (story) {
    const media = $('[data-s-media]', story);
    const bars = $('[data-s-bars]', story);
    const pan = $('[data-s-pan]', story);
    const pauseBtn = $('[data-s-pause]', story);
    media.innerHTML = SLIDES.map((s, i) => `<video class="story__v" muted playsinline loop preload="none" poster="video/st-${s.v}.webp" data-src="video/st-${s.v}.mp4" aria-hidden="true"></video>`).join('');
    bars.innerHTML = SLIDES.map(() => '<i><b></b></i>').join('');
    const vids = $$('video', media);
    const barEls = $$('i', bars);
    let cur = -1, inView = false, userPaused = reduce;
    const load = v => { if (!v.src && v.dataset.src) v.src = v.dataset.src; };
    const playing = () => inView && !userPaused && !document.hidden;
    const sync = () => {
      const on = playing();
      story.classList.toggle('is-paused', !on);
      const v = vids[cur];
      if (v) { if (on) { load(v); v.play().catch(() => {}); } else v.pause(); }
    };
    const show = i => {
      i = (i + SLIDES.length) % SLIDES.length;
      if (vids[cur]) { vids[cur].pause(); vids[cur].classList.remove('is-on'); }
      cur = i;
      const s = SLIDES[i];
      load(vids[i]); load(vids[(i + 1) % SLIDES.length]);
      vids[i].currentTime = 0;
      vids[i].classList.add('is-on');
      barEls.forEach((b, j) => {
        b.classList.toggle('is-done', j < i);
        b.classList.remove('is-on');
      });
      void bars.offsetWidth;
      barEls[i].classList.add('is-on');
      pan.innerHTML = `<small>${String(i + 1).padStart(2, '0')} · ${s.k}</small><h3>${s.t}</h3><p>${s.p}</p>`;
      sync();
    };
    bars.addEventListener('animationend', e => { if (e.target.parentElement === barEls[cur]) show(cur + 1); });
    $('[data-s-next]', story).addEventListener('click', () => show(cur + 1));
    $('[data-s-prev]', story).addEventListener('click', () => show(cur - 1));
    pauseBtn.addEventListener('click', () => {
      userPaused = !userPaused;
      pauseBtn.setAttribute('aria-pressed', String(userPaused));
      pauseBtn.setAttribute('aria-label', userPaused ? 'Продолжить' : 'Пауза');
      sync();
    });
    if (reduce) { pauseBtn.setAttribute('aria-pressed', 'true'); pauseBtn.setAttribute('aria-label', 'Продолжить'); }
    new IntersectionObserver(es => { inView = es[0].isIntersecting; sync(); }, { threshold: .35 }).observe(story);
    document.addEventListener('visibilitychange', sync);
    show(0);
  }

  /* ——— Слова основателя проявляются по мере прокрутки ——— */
  const magic = $('[data-magic]');
  if (magic) {
    const wrapWords = node => {
      [...node.childNodes].forEach(ch => {
        if (ch.nodeType === 3) {
          const frag = document.createDocumentFragment();
          ch.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) frag.appendChild(document.createTextNode(part));
            else { const s = document.createElement('span'); s.className = 'w'; s.textContent = part; frag.appendChild(s); }
          });
          ch.replaceWith(frag);
        } else if (ch.nodeType === 1) wrapWords(ch);
      });
    };
    wrapWords(magic);
    const words = $$('.w', magic);
    let ticking = false;
    const upd = () => {
      ticking = false;
      const r = magic.getBoundingClientRect();
      const vh = innerHeight;
      const prog = Math.min(1, Math.max(0, (vh * .85 - r.top) / (r.height + vh * .35)));
      const n = Math.round(prog * words.length);
      words.forEach((w, i) => w.classList.toggle('is-on', i < n));
    };
    if (!reduce) {
      addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(upd); } }, { passive: true });
      upd();
    }
  }

  /* ——— Открытка-крыло: по нажатию — следующая фраза с их открыток ——— */
  const PHRASES = [
    'Не откладывай на потом то, что может сделать счастливее сегодня',
    'Возможно, сегодня ты живёшь в одном из тех дней, о которых когда-то просил',
    'Всё случайное обычно становится самым любимым',
    'Вкус, который остаётся в памяти'
  ];
  const wing = $('[data-wing]');
  if (wing) {
    let wi = 0, busy = false;
    const ph = $('[data-wing-phrase]');
    const nEl = $('[data-wing-n]');
    wing.addEventListener('click', () => {
      if (busy) return;
      busy = true;
      wing.classList.add('is-turn');
      setTimeout(() => {
        wi = (wi + 1) % PHRASES.length;
        ph.textContent = PHRASES[wi];
        nEl.textContent = `${wi + 1} / ${PHRASES.length}`;
        wing.classList.remove('is-turn');
        busy = false;
      }, reduce ? 0 : 360);
    });
  }

  /* ——— Заявка ——— */
  const form = $('[data-form]');
  const err = $('[data-form-err]');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const miss = [];
    ['name', 'contact'].forEach(n => {
      const f = form.elements[n];
      const bad = !f.value.trim();
      f.setAttribute('aria-invalid', String(bad));
      if (bad) miss.push(n === 'name' ? 'имя' : 'телефон или Telegram');
    });
    if (!form.elements.agree.checked) miss.push('согласие на обработку данных');
    if (miss.length) {
      err.textContent = 'Заполните: ' + miss.join(', ') + '.';
      err.hidden = false;
      const first = form.querySelector('[aria-invalid="true"]') || form.elements.agree;
      first.focus();
      return;
    }
    err.hidden = true;
    $('[data-form-ok]').hidden = false;
  });
  ['name', 'contact'].forEach(n => form.elements[n].addEventListener('input', e => e.target.setAttribute('aria-invalid', 'false')));

  /* ——— Появление при прокрутке ——— */
  const revIO = new IntersectionObserver(es => {
    es.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      revIO.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: .08 });
  $$('.reveal').forEach(el => revIO.observe(el));

  renderAll();
})();
