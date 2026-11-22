(() => {
  'use strict';
  const D = window.CB_DATA;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const rub = n => n.toLocaleString('ru-RU', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }) + ' ₽';
  const plural = (n, a, b, c) => { const m = n % 10, h = n % 100; return m === 1 && h !== 11 ? a : (m >= 2 && m <= 4 && (h < 12 || h > 14) ? b : c); };
  const byId = id => D.products.find(p => p.id === id);

  /* меню */
  const burger = $('.burger'), menu = $('#menu');
  burger.addEventListener('click', () => { const o = burger.getAttribute('aria-expanded') !== 'true'; burger.setAttribute('aria-expanded', o); menu.hidden = !o; });
  menu.addEventListener('click', e => { if (e.target.closest('a')) { burger.setAttribute('aria-expanded', 'false'); menu.hidden = true; } });

  /* первый экран: резкие склейки, как в видео Gigantic */
  const scenes = $$('.hero .scene');
  const pauseBtn = $('.hero__pause');
  let idx = 0, timer = null;
  const DUR = [2600, 1500, 1700, 1400, 1500, 1700];
  const show = i => { scenes.forEach((s, k) => s.classList.toggle('is-on', k === i)); };
  const next = () => { idx = (idx + 1) % scenes.length; show(idx); timer = setTimeout(next, DUR[idx] || 1600); };
  const play = () => { clearTimeout(timer); timer = setTimeout(next, DUR[idx] || 1600); pauseBtn.setAttribute('aria-pressed', 'false'); pauseBtn.setAttribute('aria-label', 'Остановить смену кадров'); };
  const stop = () => { clearTimeout(timer); timer = null; pauseBtn.setAttribute('aria-pressed', 'true'); pauseBtn.setAttribute('aria-label', 'Продолжить смену кадров'); };
  pauseBtn.addEventListener('click', () => (timer ? stop() : play()));
  if (reduce) { stop(); } else {
    play();
    // не крутим, когда первый экран не виден или вкладка скрыта
    new IntersectionObserver(es => { const v = es[0].isIntersecting; if (!v && timer) { clearTimeout(timer); timer = null; } else if (v && !timer && pauseBtn.getAttribute('aria-pressed') !== 'true') play(); }).observe($('.hero'));
    document.addEventListener('visibilitychange', () => { if (document.hidden) { clearTimeout(timer); timer = null; } else if (pauseBtn.getAttribute('aria-pressed') !== 'true') play(); });
  }

  /* все позиции */
  const COL = { pakhlava: '#e9b25a', pechene: '#f0d77e', marmelad: '#f3b48c' };
  const IMG = { p1: 'pakhlava-kusok', p2: 'pakhlava-dve', p3: 'pakhlava-kusok', p4: 'pakhlava-kusok', p5: 'pakhlava-dve', p6: 'pakhlava-dve', m1: 'babochki', m2: 'babochka-vishnya' };
  let basket = {};
  try { basket = JSON.parse(localStorage.getItem('cb-basket') || '{}') || {}; } catch (e) { basket = {}; }
  const save = () => { try { localStorage.setItem('cb-basket', JSON.stringify(basket)); } catch (e) {} };
  const list = $('#list');
  let group = 'all';
  const row = p => {
    const inB = basket[p.id] > 0;
    const img = IMG[p.id] ? `<img src="img/cut/${IMG[p.id]}.webp" alt="" loading="lazy">` : '<span class="logo__mark" style="background:var(--ink);opacity:.35"></span>';
    const meta = [p.sub, p.weight, p.box ? p.box + ' шт в коробе' : '', 'срок ' + p.shelf].filter(Boolean).join(' · ');
    return `<li class="item" data-id="${p.id}" style="--c:${COL[p.group]}">
      <span class="item__dot">${img}</span>
      <div><span class="item__name">${esc(p.name)}</span>${p.tag ? `<span class="item__tag">${esc(p.tag)}</span>` : ''}<span class="item__meta">${esc(meta)}</span></div>
      <div class="item__side"><span class="item__price">${p.price ? rub(p.price) : 'по запросу'}</span>
        <button type="button" class="item__add${inB ? ' is-in' : ''}" ${p.box ? '' : 'disabled'}>${inB ? 'В заявке ✓' : '+ В заявку'}</button></div>
      <details><summary>Состав и КБЖУ</summary><p>${esc(p.comp)}.</p>${p.kbju ? `<p><b>На 100 г:</b> ${esc(p.kbju)}</p>` : ''}${p.link ? `<p><a href="${p.link}" target="_blank" rel="noopener">Карточка во ВкусВилле ↗</a></p>` : ''}</details>
    </li>`;
  };
  const render = () => { list.innerHTML = D.products.filter(p => group === 'all' || p.group === group).map(row).join(''); };
  const setGroup = g => { group = g; $$('.pills button').forEach(b => b.setAttribute('aria-selected', b.dataset.group === g)); render(); };
  $$('.pills button').forEach(b => b.addEventListener('click', () => setGroup(b.dataset.group)));
  $$('[data-filter]').forEach(a => a.addEventListener('click', () => setGroup(a.dataset.filter)));
  list.addEventListener('click', e => { const b = e.target.closest('.item__add'); if (!b) return; addItem(b.closest('.item').dataset.id); });
  render();

  /* заявка */
  const ul = $('#basket'), box = $('#basketBox'), sum = $('#basketSum'), bag = $('#bagCount'), mini = $('#minibar'), miniText = $('#miniText');
  const addItem = id => { const p = byId(id); if (!p || !p.box) return; basket[id] = (basket[id] || 0) + 1; save(); drawBasket(); render(); };
  const drawBasket = () => {
    const ids = Object.keys(basket).filter(id => basket[id] > 0 && byId(id));
    let boxes = 0, money = 0;
    ul.innerHTML = ids.map(id => { const p = byId(id), n = basket[id], pcs = n * p.box; boxes += n; money += pcs * (p.price || 0);
      return `<li data-id="${id}"><span class="b-name">${esc(p.name)}</span><span class="b-meta">${esc(p.weight)} · ${pcs} шт${p.price ? ' · ' + rub(pcs * p.price) : ''}</span>
        <span class="stepper"><button type="button" data-d="-1" aria-label="Меньше">−</button><output>${n} кор.</output><button type="button" data-d="1" aria-label="Больше">+</button></span></li>`; }).join('');
    box.hidden = !ids.length;
    sum.innerHTML = `${boxes} ${plural(boxes, 'короб', 'короба', 'коробов')} · ${rub(Math.round(money * 100) / 100)}<small>Ориентир по отпускным ценам с НДС. Точный счёт пришлём после звонка.</small>`;
    bag.hidden = !ids.length; bag.textContent = boxes;
    miniText.textContent = `В заявке: ${ids.length} поз. · ${boxes} кор.`;
    updateMini();
  };
  ul.addEventListener('click', e => { const b = e.target.closest('button[data-d]'); if (!b) return; const id = b.closest('li').dataset.id; basket[id] = Math.max(0, (basket[id] || 0) + +b.dataset.d); if (!basket[id]) delete basket[id]; save(); drawBasket(); render(); });
  let formVisible = false;
  const updateMini = () => { mini.hidden = !Object.keys(basket).length || formVisible; };
  new IntersectionObserver(es => { formVisible = es[0].isIntersecting; updateMini(); }).observe($('#opt'));
  drawBasket();

  /* ряд товаров: точки карусели и «падение» товара при появлении */
  const track = $('.row__track'), dots = $$('.row__dots i');
  track.addEventListener('scroll', () => { const w = track.firstElementChild.getBoundingClientRect().width + 16; const i = Math.round(track.scrollLeft / w); dots.forEach((d, k) => d.classList.toggle('on', k === i)); }, { passive: true });
  if (!reduce) { const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } }), { threshold: .3 }); $$('.hit').forEach(h => io.observe(h)); }

  /* цех: zoom parallax (21st.dev) */
  const zoom = $('.zoom'), zs = $$('.z'), title = $('.zoom__title');
  const SC = [4, 5, 6, 5, 6, 8, 9];
  if (!reduce) {
    let raf = 0;
    const onScroll = () => { raf = 0; const r = zoom.getBoundingClientRect(); const total = r.height - innerHeight; const p = Math.min(1, Math.max(0, -r.top / total));
      zs.forEach((z, i) => z.style.setProperty('--s', (1 + p * (SC[i] - 1)).toFixed(3)));
      title.style.setProperty('--t', Math.min(1, Math.max(0, (p - .55) / .3)).toFixed(3)); };
    addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(onScroll); }, { passive: true });
    onScroll();
  }

  /* видео-лупы: грузим, когда видны */
  if (!reduce) {
    const vio = new IntersectionObserver(es => es.forEach(en => { const v = en.target; if (en.isIntersecting) { if (!v.src) v.src = v.dataset.src; v.play().catch(() => {}); } else if (!v.paused) v.pause(); }), { rootMargin: '200px' });
    $$('video.lazyv').forEach(v => vio.observe(v));
  }

  /* форма (демо) */
  const form = $('#form'), msg = $('#formMsg');
  form.addEventListener('submit', e => {
    e.preventDefault(); let ok = true;
    $$('[required]', form).forEach(el => { const bad = el.type === 'checkbox' ? !el.checked : !el.value.trim(); el.closest('label').classList.toggle('is-error', bad); if (bad && ok) { el.focus(); ok = false; } });
    if (!ok) { msg.className = 'form__msg wide'; msg.textContent = 'Заполните отмеченные поля и согласие.'; return; }
    msg.className = 'form__msg wide ok'; msg.textContent = 'Спасибо! Перезвоним и пришлём прайс. (Демо: заявка никуда не отправляется.)';
    form.reset(); basket = {}; save(); drawBasket(); render();
  });
  form.addEventListener('input', e => { const l = e.target.closest('label'); l && l.classList.remove('is-error'); });

  document.addEventListener('click', e => {
    if (!e.target.closest('[data-policy]')) return; e.preventDefault();
    let d = $('#policyDlg');
    if (!d) { d = document.createElement('dialog'); d.id = 'policyDlg'; d.className = 'dlg'; d.innerHTML = '<p>Политику обработки персональных данных подготовим по 152-ФЗ, когда клиент пришлёт реквизиты.</p><form method="dialog"><button class="btn">Понятно</button></form>'; document.body.appendChild(d); }
    d.showModal ? d.showModal() : alert(d.textContent);
  });
})();
