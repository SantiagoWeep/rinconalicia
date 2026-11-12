/* =====================================================================
   effects.js — NUEVO 6.0
   Efectos visuales de "El rincón de Alicia". No toca Firebase ni el catálogo:
   solo anima lo que ya existe. Está separado de script.js a propósito, así
   la página sigue animada aunque Firebase tarde o falle.
   ===================================================================== */
(function(){
  'use strict';
  window.__fx = true; // avisa al "salvavidas" del <head> que este archivo cargó bien

  var d = document, root = d.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var $ = function(s, c){ return (c || d).querySelector(s); };
  var $$ = function(s, c){ return Array.prototype.slice.call((c || d).querySelectorAll(s)); };

  /* ---------- Aparición al hacer scroll ---------- */
  var reveals = $$('.reveal');
  if(reduce || !('IntersectionObserver' in window)){
    reveals.forEach(function(el){ el.classList.add('in'); });
  } else {
    var ro = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(e.isIntersecting){ e.target.classList.add('in'); ro.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(function(el){ ro.observe(el); });
  }

  /* ---------- Estrellitas del hero ---------- */
  var sp = $('.sparkles');
  if(sp){
    var count = window.innerWidth < 720 ? 14 : 26;
    for(var i = 0; i < count; i++){
      var s = d.createElement('i');
      s.style.setProperty('--x', (Math.random() * 100).toFixed(1) + '%');
      s.style.setProperty('--y', (Math.random() * 100).toFixed(1) + '%');
      s.style.setProperty('--s', (6 + Math.random() * 12).toFixed(1) + 'px');
      s.style.setProperty('--t', (3 + Math.random() * 4).toFixed(1) + 's');
      s.style.setProperty('--dl', (-Math.random() * 6).toFixed(1) + 's');
      sp.appendChild(s);
    }
  }

  /* ---------- Header: sombra, barra de progreso, botón "arriba" ---------- */
  var header = $('header'), toTop = $('#toTop');
  var ticking = false;
  function onScroll(){
    var y = window.pageYOffset || root.scrollTop;
    var max = root.scrollHeight - window.innerHeight;
    if(header){
      header.classList.toggle('scrolled', y > 20);
      header.style.setProperty('--p', max > 0 ? Math.min(1, y / max).toFixed(4) : 0);
    }
    if(toTop) toTop.classList.toggle('show', y > 700);
    ticking = false;
  }
  window.addEventListener('scroll', function(){
    if(!ticking){ ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();
  if(toTop) toTop.addEventListener('click', function(){
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  });

  /* ---------- Menú: marca la sección que se está viendo ---------- */
  if('IntersectionObserver' in window){
    var links = $$('nav.links a, .mobile-menu a');
    var spy = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(!e.isIntersecting) return;
        links.forEach(function(a){
          a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id);
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ['coleccion', 'valores'].forEach(function(id){
      var el = d.getElementById(id); if(el) spy.observe(el);
    });
    // arriba de todo no hay ninguna sección activa
    window.addEventListener('scroll', function(){
      if((window.pageYOffset || 0) < 200) links.forEach(function(a){ a.classList.remove('active'); });
    }, { passive: true });
  }

  /* ---------- Banner del hero: se inclina siguiendo el mouse ---------- */
  var hero = $('.hero'), art = $('.hero-art');
  if(hero && art && finePointer && !reduce){
    hero.addEventListener('pointermove', function(e){
      var r = hero.getBoundingClientRect();
      art.style.setProperty('--mx', (((e.clientX - r.left) / r.width) - 0.5).toFixed(3));
      art.style.setProperty('--my', (((e.clientY - r.top) / r.height) - 0.5).toFixed(3));
    });
    hero.addEventListener('pointerleave', function(){
      art.style.setProperty('--mx', 0); art.style.setProperty('--my', 0);
    });
  }

  /* ---------- Tarjetas del catálogo: leve inclinación 3D con el mouse ---------- */
  var grid = $('#cardsGrid');
  if(grid && finePointer && !reduce){
    grid.addEventListener('pointermove', function(e){
      var card = e.target.closest && e.target.closest('.card.dynamic');
      if(!card) return;
      var r = card.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - 0.5;
      var py = (e.clientY - r.top) / r.height - 0.5;
      card.style.setProperty('--ry', (px * 8).toFixed(2) + 'deg');
      card.style.setProperty('--rx', (-py * 8).toFixed(2) + 'deg');
    });
    grid.addEventListener('pointerout', function(e){
      var card = e.target.closest && e.target.closest('.card.dynamic');
      if(card && !card.contains(e.relatedTarget)){
        card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg');
      }
    });
  }

  /* ---------- Ventanas: bloquear el scroll de fondo y cerrar con Escape ---------- */
  var overlays = $$('.modal-overlay');
  function syncBody(){
    d.body.classList.toggle('modal-open', overlays.some(function(o){ return o.classList.contains('open'); }));
  }
  if('MutationObserver' in window){
    var mo = new MutationObserver(syncBody);
    overlays.forEach(function(o){ mo.observe(o, { attributes: true, attributeFilter: ['class'] }); });
  }
  d.addEventListener('keydown', function(e){
    if(e.key !== 'Escape') return;
    overlays.forEach(function(o){ o.classList.remove('open'); });
    var mm = $('#mobileMenu'), mb = $('#menuBtn');
    if(mm && mm.classList.contains('open')){ mm.classList.remove('open'); if(mb) mb.setAttribute('aria-expanded', 'false'); }
  });
})();
