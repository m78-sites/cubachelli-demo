(() => {
  'use strict';
  const D = window.CB_DATA;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rub = n => n.toLocaleString('ru-RU', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }) + ' ₽';
  const plural = (n, a, b, c) => { const m10 = n % 10, m100 = n % 100; return m10 === 1 && m100 !== 11 ? a : (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? b : c); };
  const byId = id => D.products.find(p => p.id === id);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  $$('[data-updated]').forEach(el => el.textContent = D.updated);

  /* шапка */
  const top = $('.top');
  const onScroll = () => top.classList.toggle('is-scrolled', scrollY > 8);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  const burger = $('.burger'), mnav = $('#mnav');
  burger.addEventListener('click', () => {
    const open = burger.getAttribute('aria-expanded') !== 'true';
    burger.setAttribute('aria-expanded', open); mnav.hidden = !open;
  });
  mnav.addEventListener('click', e => { if (e.target.closest('a')) { burger.setAttribute('aria-expanded', 'false'); mnav.hidden = true; } });

  /* заявка: короба по позициям (только в этом браузере) */
  let basket = {};
  try { basket = JSON.parse(localStorage.getItem('cb-basket') || '{}') || {}; } catch (e) { basket = {}; }
  const save = () => { try { localStorage.setItem('cb-basket', JSON.stringify(basket)); } catch (e) {} };

  /* ассортимент */
  const grid = $('#grid');
  const groupName = id => (D.groups.find(g => g.id === id) || {}).name || '';
  const card = p => {
    const inB = basket[p.id] > 0;
    const price = p.price ? `${rub(p.price)}<small>/шт с НДС</small>` : '<small>цена по запросу</small>';
    return `
    <article class="label" data-id="${p.id}">
      <div class="label__face label__front">
        <div class="label__top"><span class="label__brand"><span class="mark" aria-hidden="true"></span>${esc(groupName(p.group))}</span>${p.tag ? `<span class="label__tag">${esc(p.tag)}</span>` : `<span>${esc(p.channel)}</span>`}</div>
        <h3 class="label__name">${esc(p.name)}</h3>
        ${p.sub ? `<p class="label__sub">${esc(p.sub)}</p>` : ''}
        <p class="label__line">${esc(p.line)}</p>
        <dl class="spec">
          <div><dt>вес</dt><dd>${esc(p.weight)}</dd></div>
          <div><dt>в коробе</dt><dd>${p.box ? p.box + ' шт' : '—'}</dd></div>
          <div><dt>срок</dt><dd>${esc(p.shelf.replace(' суток', ' сут'))}</dd></div>
        </dl>
        <p class="label__price">${price}</p>
        <div class="label__actions">
          <button type="button" class="flip" aria-label="Состав: ${esc(p.name)}">Состав ↻</button>
          <button type="button" class="add${inB ? ' is-in' : ''}" ${p.box ? '' : 'disabled'}>${inB ? 'В заявке ✓' : 'В заявку'}</button>
        </div>
      </div>
      <div class="label__face label__back" aria-hidden="true">
        <div class="label__top"><span class="label__brand"><span class="mark" aria-hidden="true"></span>Оборот этикетки</span><span>${esc(p.channel)}</span></div>
        <h4>Состав</h4>
        <p>${esc(p.comp)}</p>
        <h4>На 100 г</h4>
        <p class="kb">${p.kbju ? esc(p.kbju) : 'КБЖУ уточняем по этикетке'}</p>
        ${p.store ? `<h4>Хранение</h4><p class="kb">${esc(p.store)}</p>` : ''}
        ${p.link ? `<p><a href="${p.link}" target="_blank" rel="noopener">Карточка во ВкусВилле ↗</a></p>` : ''}
        <div class="label__actions">
          <button type="button" class="flip">← Лицо</button>
          <button type="button" class="add${inB ? ' is-in' : ''}" ${p.box ? '' : 'disabled'}>${inB ? 'В заявке ✓' : 'В заявку'}</button>
        </div>
      </div>
    </article>`;
  };
  let current = 'all';
  const render = () => {
    const list = D.products.filter(p => current === 'all' || p.group === current);
    grid.innerHTML = list.map(card).join('');
    const lines = $('.lines'); let shown = 0;
    $$('.line-card', lines).forEach(f => { const on = current === 'all' || f.dataset.line === current; f.hidden = !on; shown += on; });
    lines.classList.toggle('is-empty', !shown); lines.classList.toggle('is-single', shown === 1);
  };
  $$('.groups button').forEach(b => b.addEventListener('click', () => {
    $$('.groups button').forEach(x => x.setAttribute('aria-selected', x === b));
    current = b.dataset.group; render();
  }));
  grid.addEventListener('click', e => {
    const art = e.target.closest('.label'); if (!art) return;
    if (e.target.closest('a')) return;
    if (e.target.closest('.add')) { addItem(art.dataset.id); return; }
    if (e.target.closest('.flip')) {
      const f = art.classList.toggle('is-flipped');
      $('.label__front', art).setAttribute('aria-hidden', f); $('.label__back', art).setAttribute('aria-hidden', !f);
      const btn = $(f ? '.label__back .flip' : '.label__front .flip', art); btn && btn.focus({ preventScroll: true });
    }
  });
  render();

  /* корзина-заявка */
  const ul = $('#basket'), sumBox = $('#basketSum'), hint = $('[data-empty]'), mini = $('#minibar'), miniText = $('#miniText');
  const addItem = id => {
    const p = byId(id); if (!p || !p.box) return;
    basket[id] = (basket[id] || 0) + 1; save(); drawBasket();
    $$(`.label[data-id="${id}"] .add`).forEach(b => { b.classList.add('is-in'); b.textContent = 'В заявке ✓'; });
  };
  const drawBasket = () => {
    const ids = Object.keys(basket).filter(id => basket[id] > 0 && byId(id));
    let boxes = 0, money = 0;
    ul.innerHTML = ids.map(id => {
      const p = byId(id), n = basket[id], pcs = n * p.box; boxes += n; money += pcs * (p.price || 0);
      return `<li data-id="${id}"><span class="b-name">${esc(p.name)}${p.sub ? ', ' + esc(p.sub) : ''}</span>
        <span class="b-meta">${esc(p.weight)} · ${pcs} шт${p.price ? ' · ' + rub(pcs * p.price) : ''}</span>
        <span class="stepper"><button type="button" data-d="-1" aria-label="Меньше">−</button><output>${n} кор.</output><button type="button" data-d="1" aria-label="Больше">+</button></span></li>`;
    }).join('');
    sumBox.hidden = !ids.length; hint.hidden = !!ids.length;
    $('#sumBoxes').textContent = `${boxes} ${plural(boxes, 'короб', 'короба', 'коробов')}`;
    $('#sumMoney').textContent = rub(Math.round(money * 100) / 100);
    miniText.textContent = `В заявке: ${ids.length} поз. · ${boxes} кор.`;
    updateMini();
  };
  ul.addEventListener('click', e => {
    const b = e.target.closest('button[data-d]'); if (!b) return;
    const id = b.closest('li').dataset.id; basket[id] = Math.max(0, (basket[id] || 0) + +b.dataset.d);
    if (!basket[id]) { delete basket[id]; $$(`.label[data-id="${id}"] .add`).forEach(x => { x.classList.remove('is-in'); x.textContent = 'В заявку'; }); }
    save(); drawBasket();
  });
  let orderVisible = false;
  const updateMini = () => { mini.hidden = !Object.keys(basket).length || orderVisible; };
  new IntersectionObserver(es => { orderVisible = es[0].isIntersecting; updateMini(); }, { threshold: 0 }).observe($('#form'));
  drawBasket();

  /* лупы из рилсов: грузим, когда видны; при «уменьшить движение» — только кадр */
  const vids = $$('video.lazyv');
  if (!reduce && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(en => {
      const v = en.target;
      if (en.isIntersecting) { if (!v.src) { v.src = v.dataset.src; } v.play().catch(() => {}); }
      else if (!v.paused) v.pause();
    }), { rootMargin: '200px 0px', threshold: .2 });
    vids.forEach(v => io.observe(v));
  }

  /* мягкое появление заголовков */
  if (!reduce && 'IntersectionObserver' in window) {
    const els = $$('.sec-head, .tag, .step, .perks li, .quote, .phrase p');
    els.forEach(el => el.classList.add('rv'));
    const io2 = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('is-in'); io2.unobserve(en.target); } }), { threshold: .12 });
    els.forEach(el => io2.observe(el));
  }

  /* форма (демо: никуда не отправляется) */
  const form = $('#form'), msg = $('#formMsg');
  form.addEventListener('submit', e => {
    e.preventDefault();
    let ok = true;
    $$('[required]', form).forEach(el => {
      const bad = el.type === 'checkbox' ? !el.checked : !el.value.trim();
      (el.closest('.field') || el.closest('.check')).classList.toggle('is-error', bad);
      if (bad && ok) { el.focus(); ok = false; }
    });
    if (!ok) { msg.className = 'form__msg'; msg.textContent = 'Заполните отмеченные поля и согласие.'; return; }
    msg.className = 'form__msg ok';
    msg.textContent = 'Спасибо! Заявка принята. Перезвоним и пришлём прайс. (Демо-версия: заявка никуда не отправляется.)';
    form.reset(); basket = {}; save(); drawBasket(); render();
  });
  form.addEventListener('input', e => { const f = e.target.closest('.field, .check'); f && f.classList.remove('is-error'); });

  /* политика — заглушка демо */
  document.addEventListener('click', e => {
    if (!e.target.closest('[data-policy]')) return;
    e.preventDefault();
    let d = $('#policyDlg');
    if (!d) {
      d = document.createElement('dialog'); d.id = 'policyDlg'; d.className = 'dlg';
      d.innerHTML = '<p>Политику обработки персональных данных подготовим по 152-ФЗ, когда клиент пришлёт реквизиты.</p><form method="dialog"><button class="btn btn--small">Понятно</button></form>';
      document.body.appendChild(d);
    }
    d.showModal ? d.showModal() : alert(d.textContent);
  });
})();
