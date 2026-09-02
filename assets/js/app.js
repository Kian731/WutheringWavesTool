/* 鳴潮攻略站 — 共用邏輯 */
(function (w) {
  'use strict';

  var EL_COLOR = {
    '冷凝': '#4fc3f7', '熱熔': '#ff7a52', '導電': '#b388ff',
    '氣動': '#5fe0a8', '衍射': '#ffd54f', '湮滅': '#ef5da8'
  };
  var WP_LIST = ['長刃', '迅刀', '佩槍', '臂鎧', '音感儀'];
  var EL_LIST = ['冷凝', '熱熔', '導電', '氣動', '衍射', '湮滅'];
  var ROLE_LIST = ['主C', '副C', '增傷輔助', '治療輔助', '護盾輔助'];
  var BUFF_LIST = ['全隊增傷', '屬性增傷', '技能增傷', '攻擊提升', '暴擊提升', '治療', '護盾', '充能', '減抗', '減傷抗打斷', '諧度破壞', '無隊伍增益'];
  var DMG_LIST = ['普攻', '重擊', '共鳴技能', '共鳴解放', '聲骸技能', '協同攻擊', '攻擊成長', '生命成長', '防禦成長'];
  var WFX_LIST = ['隊伍增益', '自身增益', '攻擊提升', '傷害加成', '暴擊', '共鳴效率', '治療', '護盾', '無視防禦', '減抗'];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function stars(n) { return '★'.repeat(n); }
  function qs(k) { return new URLSearchParams(location.search).get(k); }
  function byId(x) { return document.getElementById(x); }

  function thumb(src, fallbackText, cls) {
    var f = esc(String(fallbackText || '?').slice(0, 2));
    return '<div class="thumb ' + (cls || '') + '">' +
      '<span class="fallback">' + f + '</span>' +
      (src ? '<img loading="lazy" src="' + esc(src) + '" alt="" onerror="this.remove()">' : '') +
      '</div>';
  }
  function icon(src, alt, cls) {
    if (!src) return '<span class="ico-txt ' + (cls || '') + '">' + esc(String(alt || '').slice(0, 2)) + '</span>';
    return '<img class="ico ' + (cls || '') + '" src="' + esc(src) + '" alt="' + esc(alt || '') + '" title="' + esc(alt || '') + '" onerror="this.remove()">';
  }

  var byName = {
    echo: function (n) { return (w.WW_ECHOES || []).find(function (e) { return e.cn === n; }); },
    weapon: function (n) { return (w.WW_WEAPONS || []).find(function (e) { return e.n === n; }); },
    sonata: function (n) { return (w.WW_SONATAS || []).find(function (e) { return e.cn === n; }); }
  };

  /* ================= Lightbox ================= */
  var LB;
  function lightbox(html) {
    if (!LB) {
      LB = document.createElement('div');
      LB.className = 'lb';
      LB.innerHTML = '<div class="lb-back"></div><div class="lb-box"><button class="lb-x" aria-label="關閉">✕</button><div class="lb-body"></div></div>';
      document.body.appendChild(LB);
      LB.querySelector('.lb-back').onclick = closeLB;
      LB.querySelector('.lb-x').onclick = closeLB;
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeLB(); });
    }
    LB.querySelector('.lb-body').innerHTML = html;
    LB.classList.add('on');
    document.body.style.overflow = 'hidden';
    clampAll(LB);
  }
  function closeLB() { if (LB) { LB.classList.remove('on'); document.body.style.overflow = ''; } }

  function lbWeapon(n) {
    var x = byName.weapon(n); if (!x) return;
    lightbox(
      '<div class="lb-head">' +
      '<div class="wepbox r' + x.r + ' sm">' + (x.ic ? '<img src="' + esc(x.ic) + '" alt="" onerror="this.remove()">' : '') + '</div>' +
      '<div><h3>' + esc(x.n) + '</h3>' +
      '<div class="tags"><span class="tag stars r' + x.r + '">' + stars(x.r) + '</span>' +
      '<span class="tag">' + icon(x.wpIc, x.t) + esc(x.t) + '</span></div>' +
      '<table class="kv tight"><tr><td>90 級攻擊</td><td>' + esc(x.atk || '—') + '</td></tr>' +
      '<tr><td>副詞條</td><td>' + esc(x.sub) + ' ' + esc(x.subv || '') + '</td></tr>' +
      '<tr><td>功能效果</td><td>' + esc(x.fxText || '—') + '</td></tr></table></div></div>' +
      '<h4 class="lb-h4">武器技能' + (x.effName ? '　·　' + esc(x.effName) : '') + '</h4>' +
      '<div class="skdesc">' + (x.eff || '—') + '</div>' +
      '<a class="lb-more" href="weapon.html?n=' + encodeURIComponent(x.n) + '">開啟完整武器內頁 →</a>');
  }
  function lbEcho(n) {
    var e = byName.echo(n); if (!e) return;
    lightbox(
      '<div class="lb-head">' +
      '<div class="ico-box lg">' + (e.ic ? '<img src="' + esc(e.ic) + '" alt="" onerror="this.remove()">' : '') + '</div>' +
      '<div><h3>' + esc(e.cn) + '</h3>' +
      '<div class="tags"><span class="tag">COST ' + e.c + '</span>' +
      (e.danger ? '<span class="tag">' + esc(e.danger) + '</span>' : '') +
      (e.no ? '<span class="tag">' + esc(e.no) + '</span>' : '') +
      (e.cd ? '<span class="tag">冷卻 ' + esc(e.cd) + ' 秒</span>' : '') + '</div>' +
      '<div class="dim2">所屬套裝：' + e.s.map(function (s) {
        var so = byName.sonata(s);
        return so ? '<a class="setref" href="sonata.html?id=' + so.id + '">' + esc(s) + '</a>' : esc(s);
      }).join('、') + '</div></div></div>' +
      '<h4 class="lb-h4">裝在第一欄位（主聲骸）時的效果</h4>' +
      '<div class="skdesc">' + (e.skill || '此聲骸沒有主聲骸技能敘述。') + '</div>' +
      '<div class="note">主聲骸＝聲骸欄第 1 格，只有放在這一格才能施放上面的聲骸技能；放在 2–5 格只提供數值與套裝件數。</div>');
  }
  function lbSonata(n) {
    var s = byName.sonata(n); if (!s) return;
    var members = (w.WW_ECHOES || []).filter(function (e) { return e.s.indexOf(s.cn) >= 0; });
    lightbox(
      '<div class="lb-head">' +
      '<div class="ico-box lg">' + (s.ic ? '<img src="' + esc(s.ic) + '" alt="" onerror="this.remove()">' : '') + '</div>' +
      '<div><h3>' + esc(s.cn) + '</h3><div class="dim2">' + esc(s.en) + '</div>' +
      '<div class="tags"><span class="tag">' + esc(s.el) + '</span><span class="tag">' + esc(s.pieceTag || s.pieces) + '</span>' +
      '<span class="tag">' + members.length + ' 個聲骸</span></div></div></div>' +
      '<table class="kv"><tr><td>2 件效果</td><td>' + esc(s.p2) + '</td></tr>' +
      '<tr><td>5 件效果</td><td>' + esc(s.p5) + '</td></tr></table>' +
      '<a class="lb-more" href="sonata.html?id=' + encodeURIComponent(s.id) + '">開啟完整套裝內頁 →</a>');
  }
  w.addEventListener('click', function (e) {
    var t = e.target.closest('[data-lb]');
    if (!t) return;
    e.preventDefault();
    var kind = t.dataset.lb, n = t.dataset.n;
    if (kind === 'weapon') lbWeapon(n); else if (kind === 'echo') lbEcho(n); else if (kind === 'sonata') lbSonata(n);
  });

  /* 把文字中的套裝／武器名稱變成可點的 lightbox 連結 */
  function linkify(text, kinds) {
    if (!text) return '—';
    var out = esc(text), used = [];
    (kinds || ['sonata', 'weapon']).forEach(function (kind) {
      var arr = kind === 'sonata' ? (w.WW_SONATAS || []) : (w.WW_WEAPONS || []);
      arr.slice().sort(function (a, b) { return (b.cn || b.n).length - (a.cn || a.n).length; }).forEach(function (o) {
        var nm = o.cn || o.n;
        if (out.indexOf(nm) < 0 || used.indexOf(nm) >= 0) return;
        used.push(nm);
        var ic = kind === 'sonata' ? o.ic : o.ic;
        out = out.split(nm).join('<a class="ref" data-lb="' + kind + '" data-n="' + esc(nm) + '" href="#">' +
          (ic ? '<img class="ico" src="' + esc(ic) + '" alt="" onerror="this.remove()">' : '') + esc(nm) + '</a>');
      });
    });
    return out;
  }

  /* ================= 長文收合 ================= */
  function clampAll(root) {
    (root || document).querySelectorAll('.skdesc:not(.done)').forEach(function (d) {
      /* 還在隱藏的頁簽裡量不到高度，先跳過，等切到該頁簽再處理 */
      if (!d.offsetParent && !d.offsetHeight) return;
      d.classList.add('done');
      var lh = parseFloat(getComputedStyle(d).lineHeight) || 24;
      if (d.scrollHeight <= lh * 3.4) return;
      d.classList.add('clamp');
      var b = document.createElement('button');
      b.className = 'more';
      b.textContent = '展開全部 ▾';
      b.onclick = function () {
        var on = d.classList.toggle('clamp');
        b.textContent = on ? '展開全部 ▾' : '收合 ▴';
      };
      d.parentNode.insertBefore(b, d.nextSibling);
    });
  }

  /* ================= 篩選 ================= */
  function buildChips(host, label, values, key, state, onChange, opt) {
    opt = opt || {};
    var row = document.createElement('div');
    row.className = 'frow';
    row.innerHTML = '<span class="flabel">' + esc(label) + '</span>';
    var box = document.createElement('div');
    box.className = 'fopts';
    var all = document.createElement('span');
    all.className = 'chip on'; all.textContent = '全部';
    function reset() {
      box.querySelectorAll('.chip').forEach(function (n) {
        n.classList.remove('on');
        if (EL_COLOR[n.dataset.v]) { n.style.background = ''; n.style.color = EL_COLOR[n.dataset.v]; }
      });
    }
    all.onclick = function () { state[key] = null; reset(); all.classList.add('on'); onChange(); };
    box.appendChild(all);
    values.forEach(function (v) {
      var b = document.createElement('span');
      b.className = 'chip'; b.dataset.v = v;
      b.innerHTML = (opt.icons ? iconFor(v) : '') + '<span>' + esc(v) + '</span>';
      if (EL_COLOR[v]) { b.style.borderColor = EL_COLOR[v]; b.style.color = EL_COLOR[v]; }
      b.onclick = function () {
        state[key] = (state[key] === v) ? null : v;
        reset();
        if (state[key]) {
          b.classList.add('on');
          if (EL_COLOR[v]) { b.style.background = EL_COLOR[v]; b.style.color = '#0d1018'; }
        } else all.classList.add('on');
        onChange();
      };
      box.appendChild(b);
    });
    row.appendChild(box);
    host.appendChild(row);
  }
  function iconFor(v) {
    if (EL_LIST.indexOf(v) >= 0) return '<img class="ico" src="assets/img/element/' + encodeURIComponent(v) + '.png" alt="" onerror="this.remove()">';
    if (WP_LIST.indexOf(v) >= 0) return '<img class="ico" src="assets/img/wtype/' + encodeURIComponent(v) + '.png" alt="" onerror="this.remove()">';
    return '';
  }
  function addSearch(host, ph, state, onChange) {
    var row = document.createElement('div');
    row.className = 'frow';
    row.innerHTML = '<span class="flabel">搜尋</span>';
    var box = document.createElement('div'); box.className = 'fopts';
    var inp = document.createElement('input');
    inp.className = 'search'; inp.placeholder = ph;
    inp.oninput = function () { state.q = inp.value.trim().toLowerCase(); onChange(); };
    box.appendChild(inp); row.appendChild(box); host.appendChild(row);
  }
  function addSort(host, opts, state, onChange) {
    var row = document.createElement('div');
    row.className = 'frow';
    row.innerHTML = '<span class="flabel">排序</span>';
    var box = document.createElement('div'); box.className = 'fopts';
    var sel = document.createElement('select');
    sel.className = 'sortsel';
    opts.forEach(function (o, i) {
      var op = document.createElement('option');
      op.value = i; op.textContent = o.label; sel.appendChild(op);
    });
    sel.onchange = function () { state.sort = +sel.value; onChange(); };
    box.appendChild(sel);
    var dir = document.createElement('span');
    dir.className = 'chip dirbtn'; dir.textContent = '↓ 遞減';
    dir.onclick = function () {
      state.desc = !state.desc;
      dir.textContent = state.desc ? '↓ 遞減' : '↑ 遞增';
      onChange();
    };
    box.appendChild(dir); row.appendChild(box); host.appendChild(row);
  }

  /* ================= 角色列表 ================= */
  var CHAR_SORTS = [
    { label: '版本（新→舊）', f: function (a, b) { return (a.date || '').localeCompare(b.date || ''); } },
    { label: '星級', f: function (a, b) { return a.r - b.r; } },
    { label: '強度評級', f: function (a, b) { return 'SABCD'.indexOf(b.tier || 'D') - 'SABCD'.indexOf(a.tier || 'D'); } },
    { label: '屬性', f: function (a, b) { return EL_LIST.indexOf(b.el) - EL_LIST.indexOf(a.el); } },
    { label: '武器類型', f: function (a, b) { return WP_LIST.indexOf(b.wp) - WP_LIST.indexOf(a.wp); } },
    { label: '定位', f: function (a, b) { return ROLE_LIST.indexOf(b.role[0]) - ROLE_LIST.indexOf(a.role[0]); } },
    { label: '名稱', f: function (a, b) { return b.name.localeCompare(a.name, 'zh-Hant'); } },
    { label: '90級攻擊力', f: function (a, b) { return (+a.s90.atk || -1) - (+b.s90.atk || -1); } },
    { label: '90級生命值', f: function (a, b) { return (+a.s90.hp || -1) - (+b.s90.hp || -1); } }
  ];

  function pageCharacters() {
    var host = byId('filters'), grid = byId('grid'), cnt = byId('count');
    var state = { el: null, wp: null, r: null, role: null, g: null, buff: null, dmg: null, q: '', sort: 0, desc: true };
    buildChips(host, '屬性', EL_LIST, 'el', state, render, { icons: 1 });
    buildChips(host, '武器', WP_LIST, 'wp', state, render, { icons: 1 });
    buildChips(host, '星級', ['5★', '4★'], 'r', state, render);
    buildChips(host, '定位', ROLE_LIST, 'role', state, render);
    buildChips(host, '增益能力', BUFF_LIST, 'buff', state, render);
    buildChips(host, '傷害來源', DMG_LIST, 'dmg', state, render);
    buildChips(host, '性別', ['女', '男', '可選'], 'g', state, render);
    addSort(host, CHAR_SORTS, state, render);
    addSearch(host, '角色名稱／英文名／增益關鍵字…', state, render);

    function render() {
      var list = w.WW_CHARACTERS.filter(function (c) {
        if (state.el && c.el !== state.el) return false;
        if (state.wp && c.wp !== state.wp) return false;
        if (state.r && ('' + c.r + '★') !== state.r) return false;
        if (state.role && c.role.indexOf(state.role) < 0) return false;
        if (state.g && c.g !== state.g) return false;
        if (state.buff && (c.buffTags || []).indexOf(state.buff) < 0) return false;
        if (state.dmg && (c.dmgTags || []).indexOf(state.dmg) < 0) return false;
        if (state.q) {
          var hay = (c.name + ' ' + c.en + ' ' + (c.buff || '') + ' ' + c.role.join(' ') + ' ' +
            (c.style || []).join(' ') + ' ' + (c.buffTags || []).join(' ') + ' ' + (c.dmgTags || []).join(' ')).toLowerCase();
          if (hay.indexOf(state.q) < 0) return false;
        }
        return true;
      });
      var f = CHAR_SORTS[state.sort].f;
      list.sort(function (a, b) { var r = f(a, b); return state.desc ? -r : r; });
      cnt.textContent = list.length + ' / ' + w.WW_CHARACTERS.length + ' 位共鳴者';
      grid.innerHTML = list.map(function (c) {
        return '<a class="card r' + c.r + '" href="character.html?id=' + encodeURIComponent(c.id) + '">' +
          thumb(c.icon, c.name) +
          '<span class="badge-el" style="border-color:' + EL_COLOR[c.el] + ';color:' + EL_COLOR[c.el] + '">' +
          '<img src="' + esc(c.elIc) + '" alt="" onerror="this.remove()">' + c.el + '</span>' +
          (c.tier ? '<span class="badge-tier t-' + c.tier + '">' + c.tier + '</span>' : '') +
          '<span class="badge-role' + (c.auto ? ' auto' : '') + '" title="' +
          (c.auto ? '定位為系統依技能文字推估' : '') + '">' + esc(c.role[0]) + (c.auto ? '?' : '') + '</span>' +
          '<div class="cbody"><div class="cname">' + esc(c.name) + '</div>' +
          '<div class="cmeta"><span class="stars">' + stars(c.r) + '</span>' +
          icon(c.wpIc, c.wp) + '<span class="hide-xs">' + esc(c.wp) + '</span></div>' +
          '</div></a>';
      }).join('') || '<div class="empty">找不到符合條件的角色</div>';
    }
    render();
  }

  /* ================= 角色細項（頁簽） ================= */
  function pageCharacter() {
    var c = (w.WW_CHARACTERS || []).find(function (x) { return x.id === qs('id'); });
    var host = byId('detail');
    if (!c) { host.innerHTML = '<div class="empty">找不到這位角色，<a href="characters.html">回角色圖鑒</a></div>'; return; }
    document.title = c.name + '｜鳴潮攻略站';

    var panel = Object.keys(c.panel || {}).map(function (k) {
      return '<tr><td>' + esc(k) + '</td><td>' + esc(c.panel[k]) + '</td></tr>';
    }).join('');
    var subs = (c.sub || []).map(function (s, i) {
      return '<span class="pill' + (i === 0 ? ' no1' : '') + '">' + (i + 1) + '. ' + esc(s) + '</span>';
    }).join('');
    var ascHtml = (c.asc || []).map(function (a) {
      return '<div class="mat">' + icon(a.ic, a.n, 'big') +
        '<div><div class="mn">' + esc(a.n) + '</div><div class="mq">×' + esc(a.q) + '</div></div></div>';
    }).join('') || '<div class="empty">此角色無突破素材資料</div>';

    var skillHtml = (c.skills || []).map(function (s) {
      return '<div class="skill">' +
        '<div class="skhead">' + icon(s.ic, s.name, 'big') +
        '<div><div class="sktag">' + esc(s.k) + '</div><div class="skname">' + esc(s.name) + '</div></div></div>' +
        '<div class="skdesc">' + (s.desc || '—') + '</div></div>';
    }).join('');

    var chainHtml = (c.chains || []).map(function (ch) {
      return '<div class="chain">' +
        '<div class="chhead">' + icon(ch.ic, 'M' + ch.n, 'big') +
        '<div><div class="sktag">共鳴鏈 ' + ch.n + '　<span class="mtag">M' + ch.n + '</span></div>' +
        '<div class="skname">' + esc(ch.name) + '</div></div></div>' +
        '<div class="skdesc">' + (ch.desc || '—') + '</div></div>';
    }).join('') || '<div class="empty">無共鳴鏈資料</div>';

    var e = c.build && c.build.echo ? byName.echo(String(c.build.echo).split(/[（(]/)[0].trim()) : null;
    var echoHtml = e
      ? '<a class="echoref" data-lb="echo" data-n="' + esc(e.cn) + '" href="#">' + icon(e.ic, e.cn, 'big') +
      '<span><span class="mn">' + esc(e.cn) + '</span><span class="mq">COST ' + e.c + '　' + esc(e.danger || '') + '</span></span></a>'
      : '<span>' + esc((c.build && c.build.echo) || '—') + '</span>';

    var tagBar =
      '<div class="tags">' +
      '<span class="tag el" style="background:' + EL_COLOR[c.el] + '">' + icon(c.elIc, c.el) + c.el + '</span>' +
      '<span class="tag">' + c.r + '★</span>' +
      '<span class="tag">' + icon(c.wpIc, c.wp) + esc(c.wp) + '</span>' +
      '<span class="tag">' + esc(c.g) + '</span>' +
      c.role.map(function (r) { return '<span class="tag">' + esc(r) + '</span>'; }).join('') +
      '<span class="tag">' + esc(c.region || '—') + '</span>' +
      (c.tier ? '<span class="tag">評級 ' + c.tier + '</span>' : '') +
      '</div>';

    var tabBasic =
      '<div class="cols">' +
      '<div class="sec"><h2>基本資料</h2><table class="kv">' +
      '<tr><td>共鳴能力</td><td>' + esc(c.ability || '—') + '</td></tr>' +
      (c.s90.atk
        ? '<tr><td>Lv.90 基礎</td><td>生命 ' + esc(c.s90.hp) + '　攻擊 ' + esc(c.s90.atk) + '　防禦 ' + esc(c.s90.def) + '</td></tr>'
        : (c.s1 && c.s1.atk ? '<tr><td>Lv.1 基礎</td><td>生命 ' + esc(c.s1.hp) + '　攻擊 ' + esc(c.s1.atk) + '　防禦 ' + esc(c.s1.def) + '<span class="dim">（wiki 未提供 90 級）</span></td></tr>' : '')) +
      '<tr><td>成長屬性</td><td>' + esc(c.scale || '攻擊') + '</td></tr>' +
      '<tr><td>輸出來源</td><td>' + (c.dmgTags || []).map(function (t) { return '<span class="pill">' + esc(t) + '</span>'; }).join(' ') + '</td></tr>' +
      '<tr><td>生日／料理</td><td>' + esc(c.birth) + '　·　' + esc(c.food) + '</td></tr>' +
      '</table>' +
      (c.feature ? '<div class="intro feat"><b>戰鬥特色</b><br>' + c.feature + '</div>' : '') +
      (c.intro ? '<div class="intro">' + c.intro + '</div>' : '') + '</div>' +

      '<div class="sec"><h2>可提供隊友的增益' +
      (c.auto ? '<span class="srcbadge auto">系統推估</span>' : '') + '</h2>' +
      '<div class="pill-row" style="margin-bottom:10px">' +
      (c.buffTags || []).map(function (t) { return '<span class="pill no1">' + esc(t) + '</span>'; }).join('') + '</div>' +
      '<p>' + esc(c.buff || '—') + '</p>' +
      (c.note ? '<div class="note">' + esc(c.note) + '</div>' : '') + '</div>' +
      '</div>' +

      '<div class="cols">' +
      '<div class="sec"><h2>畢業面板參考' +
      (c.auto ? '<span class="srcbadge auto">系統推估</span>' : '') + '</h2><table class="kv">' + panel + '</table>' +
      '<div class="note">為含隊伍增益前的自身面板參考區間，實際需求依隊伍與武器而異。</div></div>' +
      '<div class="sec"><h2>有效詞條優先序' +
      (c.auto ? '<span class="srcbadge auto">系統推估</span>' : '') + '</h2><div class="pill-row">' + subs + '</div>' +
      '<div class="note">聲骸副詞條：雙暴優先，攻擊%與對應技能傷害加成次之；輔助位以共鳴效率、生命%／防禦%、治療效果為主。</div></div>' +
      '</div>';

    var tabBuild =
      '<div class="sec"><h2>配裝推薦' +
      (c.build && c.build.src ? '<span class="srcbadge' + (/庫街區/.test(c.build.src) ? ' official' : '') + '">' + esc(c.build.src) + '</span>' : '') +
      '</h2><table class="kv">' +
      '<tr><td>聲骸套裝</td><td>' + linkify(c.build && c.build.set, ['sonata']) + '</td></tr>' +
      '<tr><td>主詞條</td><td>' + esc((c.build && c.build.main) || '—') + '</td></tr>' +
      '<tr><td>主聲骸（首位）</td><td>' + echoHtml +
      '<div class="note">主聲骸＝聲骸欄第 1 格，要施放的就是它的聲骸技能；不一定是 COST 最高的那顆。</div></td></tr>' +
      '<tr><td>推薦武器</td><td>' + linkify(c.build && c.build.weapon, ['weapon']) + '</td></tr>' +
      (c.subText ? '<tr><td>官方副詞條</td><td>' + esc(c.subText) + '</td></tr>' : '') +
      '</table><div class="note">點武器或聲骸可直接開啟說明視窗，不會離開這一頁。' +
      (c.build && c.build.src === '站方整理' ? '　此角色官方尚未公布配裝，這裡是站方整理的建議。' : '') + '</div></div>' +
      '<div class="sec"><h2>突破素材（Lv.90 總計）</h2><div class="mats">' + ascHtml + '</div></div>';

    host.innerHTML =
      '<div class="crumb"><a href="index.html">首頁</a> / <a href="characters.html">全角色圖鑒</a> / ' + esc(c.name) + '</div>' +
      '<div class="detail-top">' +
      '<div class="artbox">' + (c.art ? '<img class="art" src="' + esc(c.art) + '" alt="' + esc(c.name) + '" onerror="this.remove()">' : '') + '</div>' +
      '<div class="dinfo">' +
      '<div class="dhead">' + thumb(c.icon, c.name, 'sm') +
      '<div><h1>' + esc(c.name) + '</h1><div class="en">' + esc(c.en) + '</div></div></div>' +
      tagBar +
      (c.style && c.style.length ? '<div class="tags">' + c.style.filter(function (s) { return !/^\d+$/.test(s); })
        .map(function (s) { return '<span class="tag alt">' + esc(s) + '</span>'; }).join('') + '</div>' : '') +
      '</div></div>' +

      '<div class="tabbar">' +
      '<button class="tabbtn on" data-t="0">基本資料・畢業門檻</button>' +
      '<button class="tabbtn" data-t="1">配裝・突破素材</button>' +
      '<button class="tabbtn" data-t="2">技能 <span class="n">' + (c.skills || []).length + '</span></button>' +
      '<button class="tabbtn" data-t="3">共鳴鏈 <span class="n">' + (c.chains || []).length + '</span></button>' +
      '</div>' +
      '<div class="tabpane on" data-p="0">' + tabBasic + '</div>' +
      '<div class="tabpane" data-p="1">' + tabBuild + '</div>' +
      '<div class="tabpane" data-p="2"><div class="skills">' + skillHtml + '</div></div>' +
      '<div class="tabpane" data-p="3"><div class="skills">' + chainHtml + '</div></div>';

    host.querySelectorAll('.tabbtn').forEach(function (b) {
      b.onclick = function () {
        host.querySelectorAll('.tabbtn').forEach(function (x) { x.classList.remove('on'); });
        host.querySelectorAll('.tabpane').forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on');
        host.querySelector('.tabpane[data-p="' + b.dataset.t + '"]').classList.add('on');
        clampAll(host);
      };
    });
    clampAll(host);
  }

  /* ================= 武器 ================= */
  var WEP_SORTS = [
    { label: '星級', f: function (a, b) { return a.r - b.r; } },
    { label: '武器類型', f: function (a, b) { return WP_LIST.indexOf(b.t) - WP_LIST.indexOf(a.t); } },
    { label: '90級攻擊力', f: function (a, b) { return (+a.atk || 0) - (+b.atk || 0); } },
    { label: '版本', f: function (a, b) { return parseFloat(a.ver || 0) - parseFloat(b.ver || 0); } },
    { label: '名稱', f: function (a, b) { return b.n.localeCompare(a.n, 'zh-Hant'); } }
  ];

  function pageWeapons() {
    var host = byId('filters'), grid = byId('grid'), cnt = byId('count');
    var state = { t: null, r: null, fx: null, q: '', sort: 0, desc: true };
    buildChips(host, '類型', WP_LIST, 't', state, render, { icons: 1 });
    buildChips(host, '星級', ['5★', '4★', '3★', '2★', '1★'], 'r', state, render);
    buildChips(host, '功能效果', WFX_LIST, 'fx', state, render);
    addSort(host, WEP_SORTS, state, render);
    addSearch(host, '武器名稱／適配角色／技能…', state, render);

    function render() {
      var list = w.WW_WEAPONS.filter(function (x) {
        if (state.t && x.t !== state.t) return false;
        if (state.r && ('' + x.r + '★') !== state.r) return false;
        if (state.fx && (x.fx || []).indexOf(state.fx) < 0) return false;
        if (state.q) {
          var hay = (x.n + ' ' + (x.own || '') + ' ' + (x.effName || '') + ' ' + (x.eff || '') + ' ' + (x.sub || '') + ' ' + (x.fxText || '')).toLowerCase();
          if (hay.indexOf(state.q) < 0) return false;
        }
        return true;
      });
      var f = WEP_SORTS[state.sort].f;
      list.sort(function (a, b) { var r = f(a, b); return state.desc ? -r : r; });
      cnt.textContent = list.length + ' / ' + w.WW_WEAPONS.length + ' 把武器';
      grid.innerHTML = list.map(function (x) {
        var scope = (x.fx || []).indexOf('隊伍增益') >= 0 ? '<span class="badge-scope team">隊伍</span>'
          : ((x.fx || []).indexOf('自身增益') >= 0 ? '<span class="badge-scope">自身</span>' : '');
        return '<a class="card r' + x.r + '" href="weapon.html?n=' + encodeURIComponent(x.n) + '">' +
          thumb(x.ic, x.n) + scope +
          '<div class="cbody"><div class="cname">' + esc(x.n) + '</div>' +
          '<div class="cmeta"><span class="stars">' + stars(x.r) + '</span>' +
          icon(x.wpIc, x.t) + '<span class="hide-xs">' + esc(x.sub && x.sub !== '—' ? x.sub : x.t) + '</span></div>' +
          '</div></a>';
      }).join('') || '<div class="empty">找不到符合條件的武器</div>';
    }
    render();
  }

  function pageWeapon() {
    var x = (w.WW_WEAPONS || []).find(function (y) { return y.n === qs('n'); });
    var host = byId('detail');
    if (!x) { host.innerHTML = '<div class="empty">找不到這把武器，<a href="weapons.html">回武器圖鑒</a></div>'; return; }
    document.title = x.n + '｜鳴潮攻略站';
    var users = (w.WW_CHARACTERS || []).filter(function (c) {
      return c.wp === x.t && c.build && c.build.weapon && c.build.weapon.indexOf(x.n) >= 0;
    });
    host.innerHTML =
      '<div class="crumb"><a href="index.html">首頁</a> / <a href="weapons.html">武器圖鑒</a> / ' + esc(x.n) + '</div>' +
      '<div class="detail-top">' +
      '<div class="wepbox r' + x.r + '">' + (x.ic ? '<img class="wepart" src="' + esc(x.ic) + '" alt="' + esc(x.n) + '" onerror="this.remove()">' : '') + '</div>' +
      '<div class="dinfo"><h1>' + esc(x.n) + '</h1>' +
      '<div class="tags">' +
      '<span class="tag stars r' + x.r + '">' + stars(x.r) + '</span>' +
      '<span class="tag">' + icon(x.wpIc, x.t) + esc(x.t) + '</span>' +
      (x.ver ? '<span class="tag">' + esc(x.ver) + ' 版本</span>' : '') +
      (x.fx || []).map(function (t) { return '<span class="tag alt">' + esc(t) + '</span>'; }).join('') +
      '</div>' +
      '<table class="kv">' +
      '<tr><td>90 級攻擊力</td><td>' + esc(x.atk || '—') + '<span class="dim">（初始 ' + esc(x.atk0 || '—') + '）</span></td></tr>' +
      '<tr><td>副詞條</td><td>' + esc(x.sub || '—') + '　' + esc(x.subv || '') + '<span class="dim">（初始 ' + esc(x.subv0 || '—') + '）</span></td></tr>' +
      '<tr><td>功能效果</td><td>' + esc(x.fxText || '—') + '</td></tr>' +
      '<tr><td>取得途徑</td><td>' + esc(x.src || '—') + '</td></tr>' +
      (x.own ? '<tr><td>主要適配</td><td>' + esc(x.own) + '</td></tr>' : '') +
      '</table></div></div>' +
      '<div class="sec"><h2>武器技能' + (x.effName ? '　·　' + esc(x.effName) : '') + '</h2>' +
      '<div class="skdesc">' + (x.eff || '—') + '</div>' +
      '<div class="note">技能數值依精煉 1／2／3／4／5 階段以斜線分隔。</div></div>' +
      (users.length ? '<div class="sec"><h2>本站推薦使用此武器的角色</h2><div class="grid chars mini">' +
        users.map(function (c) {
          return '<a class="card r' + c.r + '" href="character.html?id=' + c.id + '">' + thumb(c.icon, c.name) +
            '<div class="cbody"><div class="cname">' + esc(c.name) + '</div></div></a>';
        }).join('') + '</div></div>' : '') +
      (x.story ? '<div class="sec"><h2>武器故事</h2><div class="skdesc quote">' + x.story + '</div></div>' : '');
    clampAll(host);
  }

  /* ================= 聲骸套裝 ================= */
  function pageSonatas() {
    var grid = byId('grid'), cnt = byId('count'), host = byId('filters');
    var state = { el: null, piece: null, p2: null, fx: null, q: '' };
    var els = EL_LIST.filter(function (e) { return w.WW_SONATAS.some(function (s) { return s.el === e; }); });
    w.WW_SONATAS.forEach(function (s) { if (els.indexOf(s.el) < 0) els.push(s.el); });
    var pieces = [], p2s = [], fxs = [];
    w.WW_SONATAS.forEach(function (s) {
      if (s.pieceTag && pieces.indexOf(s.pieceTag) < 0) pieces.push(s.pieceTag);
      if (s.p2Tag && p2s.indexOf(s.p2Tag) < 0) p2s.push(s.p2Tag);
      (s.fxTags || []).forEach(function (t) { if (fxs.indexOf(t) < 0) fxs.push(t); });
    });
    buildChips(host, '屬性', els, 'el', state, render, { icons: 1 });
    buildChips(host, '件數', pieces, 'piece', state, render);
    buildChips(host, '2 件效果', p2s, 'p2', state, render);
    buildChips(host, '增益效果', fxs, 'fx', state, render);
    addSearch(host, '套裝名稱／效果關鍵字…', state, render);

    function render() {
      var list = w.WW_SONATAS.filter(function (s) {
        if (state.el && s.el !== state.el) return false;
        if (state.piece && s.pieceTag !== state.piece) return false;
        if (state.p2 && s.p2Tag !== state.p2) return false;
        if (state.fx && (s.fxTags || []).indexOf(state.fx) < 0) return false;
        if (state.q) {
          var hay = (s.cn + ' ' + s.en + ' ' + s.p2 + ' ' + s.p5 + ' ' + (s.fxTags || []).join(' ')).toLowerCase();
          if (hay.indexOf(state.q) < 0) return false;
        }
        return true;
      });
      cnt.textContent = list.length + ' / ' + w.WW_SONATAS.length + ' 個套裝';
      grid.innerHTML = list.map(function (s) {
        var n = (w.WW_ECHOES || []).filter(function (e) { return e.s.indexOf(s.cn) >= 0; }).length;
        return '<a class="card" href="sonata.html?id=' + encodeURIComponent(s.id) + '">' +
          '<div class="setcard">' +
          '<div class="ico-box">' + (s.ic ? '<img src="' + esc(s.ic) + '" alt="" onerror="this.remove()">' : '') + '</div>' +
          '<div style="min-width:0"><h3>' + esc(s.cn) + '</h3>' +
          '<p class="dim2">' + esc(s.el) + '　·　' + esc(s.pieceTag || s.pieces) + '　·　' + n + ' 聲骸</p>' +
          '<p class="settags">' + (s.fxTags || []).slice(0, 3).map(function (t) { return '<span>' + esc(t) + '</span>'; }).join('') + '</p>' +
          '</div></div></a>';
      }).join('') || '<div class="empty">找不到符合條件的套裝</div>';
    }
    render();
  }

  function pageSonata() {
    var s = (w.WW_SONATAS || []).find(function (x) { return x.id === qs('id'); });
    var host = byId('detail');
    if (!s) { host.innerHTML = '<div class="empty">找不到這個套裝，<a href="echoes.html">回聲骸套裝</a></div>'; return; }
    document.title = s.cn + '｜鳴潮攻略站';

    var members = (w.WW_ECHOES || []).filter(function (e) { return e.s.indexOf(s.cn) >= 0; });
    var byCost = {};
    members.forEach(function (e) { (byCost[e.c] || (byCost[e.c] = [])).push(e); });

    function block(cost) {
      var arr = byCost[cost] || [];
      if (!arr.length) return '';
      return '<h3 class="subh">COST ' + cost + '<span class="dim">（' + arr.length + ' 個）</span></h3>' +
        '<div class="grid echoes">' + arr.map(function (e) {
          return '<a class="card echocard" data-lb="echo" data-n="' + esc(e.cn) + '" href="#">' +
            thumb(e.ic, e.cn) +
            '<div class="cbody"><div class="cname">' + esc(e.cn) + '</div>' +
            '<div class="cmeta"><span>COST ' + e.c + '</span></div></div></a>';
        }).join('') + '</div>';
    }
    var users = (w.WW_CHARACTERS || []).filter(function (c) {
      return c.build && c.build.set && c.build.set.indexOf(s.cn) >= 0;
    });

    host.innerHTML =
      '<div class="crumb"><a href="index.html">首頁</a> / <a href="echoes.html">聲骸套裝</a> / ' + esc(s.cn) + '</div>' +
      '<div class="detail-top">' +
      '<div class="setbox">' + (s.ic ? '<img src="' + esc(s.ic) + '" alt="" onerror="this.remove()">' : '') + '</div>' +
      '<div class="dinfo"><h1>' + esc(s.cn) + '</h1><div class="en">' + esc(s.en) + '</div>' +
      '<div class="tags"><span class="tag">' + esc(s.el) + '</span><span class="tag">' + esc(s.pieceTag || s.pieces) + '</span>' +
      '<span class="tag">' + esc(s.ver) + ' 版本</span>' +
      (s.fxTags || []).map(function (t) { return '<span class="tag alt">' + esc(t) + '</span>'; }).join('') + '</div>' +
      '<table class="kv"><tr><td>2 件效果</td><td>' + esc(s.p2) + '</td></tr>' +
      '<tr><td>5 件效果</td><td>' + esc(s.p5) + '</td></tr>' +
      '<tr><td>推薦角色</td><td>' + esc(s['用於'] || '—') + '</td></tr></table>' +
      '</div></div>' +
      (users.length ? '<div class="sec"><h2>本站配裝推薦使用此套裝的角色</h2><div class="grid chars mini">' +
        users.map(function (c) {
          return '<a class="card r' + c.r + '" href="character.html?id=' + c.id + '">' + thumb(c.icon, c.name) +
            '<div class="cbody"><div class="cname">' + esc(c.name) + '</div></div></a>';
        }).join('') + '</div></div>' : '') +
      '<div class="sec"><h2>可調諧成此套裝的聲骸（共 ' + members.length + ' 個）</h2>' +
      block(4) + block(3) + block(1) +
      '<div class="note">點任一聲骸可看它「裝在第一欄位（主聲骸）」時的技能效果。COST 配置以 4-3-3-1-1（合計 12）為主流。</div></div>';
  }

  /* ================= 首頁 ================= */
  function pageHome() {
    var el = byId('stats');
    if (el) el.innerHTML =
      '<div class="stat"><b>' + w.WW_CHARACTERS.length + '</b><span>共鳴者</span></div>' +
      '<div class="stat"><b>' + w.WW_WEAPONS.length + '</b><span>武器</span></div>' +
      '<div class="stat"><b>' + w.WW_SONATAS.length + '</b><span>聲骸套裝</span></div>' +
      '<div class="stat"><b>' + w.WW_ECHOES.length + '</b><span>聲骸</span></div>';
    var neu = byId('newest');
    if (neu) neu.innerHTML = w.WW_CHARACTERS.slice(0, 8).map(function (c) {
      return '<a class="card r' + c.r + '" href="character.html?id=' + c.id + '">' + thumb(c.icon, c.name) +
        '<span class="badge-el" style="border-color:' + EL_COLOR[c.el] + ';color:' + EL_COLOR[c.el] + '"><img src="' + esc(c.elIc) + '" alt="" onerror="this.remove()">' + c.el + '</span>' +
        '<div class="cbody"><div class="cname">' + esc(c.name) + '</div>' +
        '<div class="cmeta"><span class="stars">' + stars(c.r) + '</span>' + icon(c.wpIc, c.wp) + '</div></div></a>';
    }).join('');
  }

  /* ================= 本機儲存 ================= */
  var Store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
  };
  var K_ROSTER = 'ww_roster', K_PLAN = 'ww_plan', K_OWN = 'ww_owned_mats';

  /* ================= 備份與換裝置同步 =================
   * 網站是純靜態的、沒有伺服器，練度只存在各自瀏覽器裡，
   * 所以用「匯出一段代碼 → 到另一台貼上」的方式搬資料。
   */
  function b64enc(str) {
    var b = new TextEncoder().encode(str), out = '';
    for (var i = 0; i < b.length; i += 0x8000) out += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
    return btoa(out);
  }
  function b64dec(b) {
    var raw = atob(String(b).replace(/\s+/g, ''));
    var arr = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
    return new TextDecoder().decode(arr);
  }
  function snapshot() {
    return {
      v: 1, app: 'wuwa-guide', t: new Date().toISOString(),
      roster: Store.get(K_ROSTER, {}),
      plan: Store.get(K_PLAN, { items: [] }),
      mats: Store.get(K_OWN, {})
    };
  }
  function summarize(d) {
    var owned = Object.values(d.roster || {}).filter(function (r) { return r && r.own; }).length;
    return '角色 ' + owned + ' 位｜養成計劃 ' + ((d.plan && d.plan.items || []).length) +
      ' 項｜素材庫存 ' + Object.keys(d.mats || {}).length + ' 種' +
      (d.t ? '｜備份於 ' + String(d.t).slice(0, 16).replace('T', ' ') : '');
  }
  function syncBox() {
    var snap = snapshot(), code = b64enc(JSON.stringify(snap));
    lightbox(
      '<h3 style="margin:0 0 4px">備份 · 換裝置同步</h3>' +
      '<div class="dim2" style="margin-bottom:12px">練度只存在這台裝置的瀏覽器裡。要換手機或電腦時，' +
      '在原本那台按「複製代碼」，到新裝置的同一頁貼上再按匯入就好。</div>' +
      '<h4 class="lb-h4">① 這台裝置的資料</h4>' +
      '<div class="dim2" style="margin-bottom:6px">' + esc(summarize(snap)) + '</div>' +
      '<textarea class="synctxt" id="sy_out" readonly>' + esc(code) + '</textarea>' +
      '<div class="planbtns">' +
      '<button class="btn" id="sy_copy">複製代碼</button>' +
      '<button class="btn ghost" id="sy_file">下載成檔案</button></div>' +
      '<h4 class="lb-h4">② 從別的裝置匯入</h4>' +
      '<div class="dim2" style="margin-bottom:6px">把代碼貼進來，或選擇之前下載的備份檔。</div>' +
      '<textarea class="synctxt" id="sy_in" placeholder="在這裡貼上代碼…"></textarea>' +
      '<div class="planbtns">' +
      '<button class="btn" id="sy_load">匯入（覆蓋本機資料）</button>' +
      '<label class="btn ghost" style="cursor:pointer">選擇備份檔<input type="file" id="sy_pick" accept=".json,.txt" hidden></label>' +
      '</div><div id="sy_msg" class="note" style="display:none"></div>');

    var msg = byId('sy_msg');
    function say(t, ok) { msg.style.display = 'block'; msg.innerHTML = (ok ? '✓ ' : '⚠ ') + esc(t); }

    byId('sy_copy').onclick = function () {
      var ta = byId('sy_out');
      ta.select(); ta.setSelectionRange(0, 999999);
      var done = false;
      try { done = document.execCommand('copy'); } catch (e) { }
      if (!done && navigator.clipboard) { navigator.clipboard.writeText(ta.value); done = true; }
      say(done ? '已複製，到另一台裝置貼上即可。' : '複製失敗，請手動全選複製。', done);
    };
    byId('sy_file').onclick = function () {
      var blob = new Blob([JSON.stringify(snap, null, 1)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'wuwa-練度備份-' + new Date().toISOString().slice(0, 10) + '.json';
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 3000);
      say('已下載備份檔。', 1);
    };
    function apply(text) {
      var d = null;
      try { d = JSON.parse(text); } catch (e) { }
      if (!d) { try { d = JSON.parse(b64dec(text)); } catch (e) { } }
      if (!d || !d.roster) { say('看不懂這段內容，請確認是本站產生的代碼或備份檔。'); return; }
      if (!confirm('要用這份資料覆蓋本機練度嗎？\n\n' + summarize(d) + '\n\n覆蓋後無法復原。')) return;
      Store.set(K_ROSTER, d.roster || {});
      Store.set(K_PLAN, d.plan || { items: [] });
      Store.set(K_OWN, d.mats || {});
      say('匯入完成，重新整理中…', 1);
      setTimeout(function () { location.reload(); }, 700);
    }
    byId('sy_load').onclick = function () {
      var v = byId('sy_in').value.trim();
      if (!v) { say('請先貼上代碼。'); return; }
      apply(v);
    };
    byId('sy_pick').onchange = function (e) {
      var f = e.target.files && e.target.files[0];
      if (!f) return;
      var fr = new FileReader();
      fr.onload = function () { apply(String(fr.result).trim()); };
      fr.readAsText(f);
    };
  }

  var LV_OPTS = [0, 20, 40, 50, 60, 70, 80, 90];
  function lvLabel(v) { return v === 0 ? '未養成' : 'Lv.' + v; }

  /* ================= 素材計算 ================= */
  function tiersOf(kind, key) {
    var A = w.WW_ASC; if (!A) return null;
    return kind === 'c' ? A.chars[key] : A.weapons[key];
  }
  /* 把選定的項目換算成素材總需求（突破＋技能升級＋分支節點） */
  var SK_COUNT = 5;               // 常態攻擊／共鳴技能／共鳴迴路／共鳴解放／變奏技能
  function needsOf(items) {
    var A = w.WW_ASC, need = {};
    if (!A) return need;
    function add(m) { need[m.n] = (need[m.n] || 0) + m.q; }
    items.forEach(function (it) {
      var tiers = tiersOf(it.k, it.id);
      if (tiers) A.levels.forEach(function (L, i) {
        if (it.from <= L && it.to > L) (tiers[i] || []).forEach(add);
      });
      if (it.k !== 'c') return;
      var sc = (A.skills || {})[it.id];
      if (!sc) return;
      var a = Math.max(1, it.sk || 1), b = Math.min(10, it.skTo == null ? 10 : it.skTo);
      /* lv[0] 是 1→2 的花費，依此類推；五個技能都要各升一次 */
      for (var L = a; L < b; L++) (sc.lv[L - 1] || []).forEach(function (m) {
        need[m.n] = (need[m.n] || 0) + m.q * SK_COUNT;
      });
      if (it.nodes !== 0) (sc.branch || []).forEach(function (bn) { (bn.mats || []).forEach(add); });
    });
    return need;
  }
  /* 合成推算：同家族 3 個下階可合成 1 個上階，由低階往高階遞補 */
  function solveMats(need, own) {
    var A = w.WW_ASC, mats = (A && A.mats) || {};
    var rows = [], fams = {};
    Object.keys(need).forEach(function (n) {
      var m = mats[n] || {};
      if (m.fam) { (fams[m.fam] = fams[m.fam] || {})[m.tier] = n; }
    });
    /* 同家族但需求為 0 的階層也要納入（可能有庫存可以往上合成） */
    Object.keys(mats).forEach(function (n) {
      var m = mats[n];
      if (m.fam && fams[m.fam] && !fams[m.fam][m.tier]) fams[m.fam][m.tier] = n;
    });
    var handled = {};
    Object.keys(fams).forEach(function (f) {
      var carry = 0;
      for (var t = 0; t <= 3; t++) {
        var n = fams[f][t]; if (!n) continue;
        handled[n] = 1;
        var nd = need[n] || 0, ow = +(own[n] || 0), avail = ow + carry;
        var short = Math.max(0, nd - avail);
        var craft = (ow < nd) ? Math.min(nd - ow, carry) : 0;
        var left = Math.max(0, avail - nd);
        rows.push({ n: n, need: nd, own: ow, short: short, craft: craft, spare: left, carryIn: carry, fam: f, tier: t });
        carry = Math.floor(left / 3);
      }
    });
    Object.keys(need).forEach(function (n) {
      if (handled[n]) return;
      var nd = need[n], ow = +(own[n] || 0);
      rows.push({ n: n, need: nd, own: ow, short: Math.max(0, nd - ow), craft: 0, spare: Math.max(0, ow - nd), tier: -1 });
    });
    return rows.filter(function (r) { return r.need > 0; });
  }

  /* ================= 頭像挑選器 ================= */
  function picker(kind, onPick, filterFn, opts) {
    opts = opts || {};
    var list = kind === 'c' ? w.WW_CHARACTERS : w.WW_WEAPONS.filter(function (x) { return x.r >= 3; });
    if (filterFn) list = list.filter(filterFn);
    var id = 'pk' + Date.now();
    lightbox(
      '<h3 style="margin:0 0 4px">' + esc(opts.title || ('選擇' + (kind === 'c' ? '角色' : '武器'))) + '</h3>' +
      '<div class="dim2" style="margin-bottom:10px">' +
      esc(opts.hint || '點頭像即可加入，可連續點選多個') + '</div>' +
      '<input class="search" id="' + id + 'q" placeholder="輸入名稱搜尋…" style="width:100%;margin-bottom:12px">' +
      '<div class="grid ' + (kind === 'c' ? 'chars' : 'weps') + ' mini pickgrid" id="' + id + '"></div>');
    var grid = byId(id), inp = byId(id + 'q');
    function draw() {
      var q = (inp.value || '').trim().toLowerCase();
      var arr = list.filter(function (x) {
        var nm = (kind === 'c' ? x.name + ' ' + x.en : x.n + ' ' + (x.own || '')).toLowerCase();
        return !q || nm.indexOf(q) >= 0;
      });
      grid.innerHTML = arr.map(function (x, i) {
        var nm = kind === 'c' ? x.name : x.n, ic = kind === 'c' ? x.icon : x.ic;
        return '<div class="card r' + x.r + ' pickitem" data-k="' + esc(kind === 'c' ? x.id : x.n) + '">' +
          thumb(ic, nm) + '<div class="cbody"><div class="cname">' + esc(nm) + '</div></div></div>';
      }).join('') || '<div class="empty">沒有符合的項目</div>';
      grid.querySelectorAll('.pickitem').forEach(function (el) {
        el.onclick = function () {
          if (opts.once) { closeLB(); onPick(el.dataset.k); return; }
          onPick(el.dataset.k);
          el.classList.add('picked');
        };
      });
    }
    inp.oninput = draw; draw(); inp.focus();
  }

  /* ================= 養成計劃 ================= */
  function pagePlan() {
    var host = byId('plan');
    var plan = Store.get(K_PLAN, { items: [] });
    var own = Store.get(K_OWN, {});
    if (!w.WW_ASC) { host.innerHTML = '<div class="empty">找不到 data/ascension.js</div>'; return; }

    function save() { Store.set(K_PLAN, plan); Store.set(K_OWN, own); }
    function nameOf(it) {
      if (it.k === 'c') { var c = w.WW_CHARACTERS.find(function (x) { return x.id === it.id; }); return c ? c.name : it.id; }
      return it.id;
    }
    function iconOf(it) {
      if (it.k === 'c') { var c = w.WW_CHARACTERS.find(function (x) { return x.id === it.id; }); return c ? c.icon : null; }
      var v = w.WW_WEAPONS.find(function (x) { return x.n === it.id; }); return v ? v.ic : null;
    }
    function rarityOf(it) {
      if (it.k === 'c') { var c = w.WW_CHARACTERS.find(function (x) { return x.id === it.id; }); return c ? c.r : 5; }
      var v = w.WW_WEAPONS.find(function (x) { return x.n === it.id; }); return v ? v.r : 5;
    }
    function add(k, id) {
      if (plan.items.some(function (x) { return x.k === k && x.id === id; })) return;
      plan.items.push({ k: k, id: id, from: 0, to: 90, sk: 1, skTo: 10, nodes: 1 });
      save(); render();
    }

    function render() {
      var need = needsOf(plan.items);
      var rows = solveMats(need, own);
      var credit = rows.filter(function (r) { return /貝幣/.test(r.n); });
      rows = rows.filter(function (r) { return !/貝幣/.test(r.n); });
      rows.sort(function (a, b) {
        if (a.fam && b.fam) return a.fam === b.fam ? a.tier - b.tier : a.fam.localeCompare(b.fam, 'zh-Hant');
        if (a.fam) return -1; if (b.fam) return 1;
        return b.need - a.need;
      });
      var totalShort = rows.reduce(function (s, r) { return s + r.short; }, 0);
      var craftable = rows.filter(function (r) { return r.craft > 0; });

      host.innerHTML =
        '<div class="sec"><h2>養成對象<span class="dim">（可同時放多位角色與武器，素材會合併統計）</span></h2>' +
        '<div class="planlist">' +
        (plan.items.length ? plan.items.map(function (it, i) {
          return '<div class="planitem r' + rarityOf(it) + '">' +
            '<div class="pi-ic">' + thumb(iconOf(it), nameOf(it)) + '</div>' +
            '<div class="pi-body"><div class="pi-name">' + esc(nameOf(it)) +
            '<span class="pi-kind">' + (it.k === 'c' ? '角色' : '武器') + '</span></div>' +
            '<div class="pi-lv">' +
            '<label>等級 <select data-i="' + i + '" data-f="from">' +
            LV_OPTS.map(function (v) { return '<option value="' + v + '"' + (v === it.from ? ' selected' : '') + '>' + lvLabel(v) + '</option>'; }).join('') +
            '</select></label><span class="arrow">→</span>' +
            '<select data-i="' + i + '" data-f="to">' +
            LV_OPTS.filter(function (v) { return v > 0; }).map(function (v) { return '<option value="' + v + '"' + (v === it.to ? ' selected' : '') + '>' + lvLabel(v) + '</option>'; }).join('') +
            '</select></div>' +
            (it.k === 'c' && (w.WW_ASC.skills || {})[it.id] ?
              '<div class="pi-lv"><label>技能 <select data-i="' + i + '" data-f="sk">' +
              Array.from({ length: 10 }, function (_, n) { return n + 1; }).map(function (v) {
                return '<option value="' + v + '"' + (v === (it.sk || 1) ? ' selected' : '') + '>' + v + '</option>';
              }).join('') + '</select></label><span class="arrow">→</span>' +
              '<select data-i="' + i + '" data-f="skTo">' +
              Array.from({ length: 10 }, function (_, n) { return n + 1; }).map(function (v) {
                return '<option value="' + v + '"' + (v === (it.skTo == null ? 10 : it.skTo) ? ' selected' : '') + '>' + v + '</option>';
              }).join('') + '</select>' +
              '<span class="dimtxt">×5 技能</span>' +
              '<label class="sw tiny"><input type="checkbox" data-i="' + i + '" data-f="nodes"' +
              (it.nodes !== 0 ? ' checked' : '') + '><span>含固有技能／屬性加成</span></label>' +
              '</div>' : '') +
            (it.k === 'c' && !tiersOf('c', it.id) ? '<div class="pi-warn">wiki 尚未提供突破素材，只會算技能部分</div>' : '') +
            (it.k === 'c' && !(w.WW_ASC.skills || {})[it.id] ? '<div class="pi-warn">wiki 尚未提供技能升級素材</div>' : '') +
            '</div>' +
            '<button class="pi-x" data-del="' + i + '" title="移除">✕</button></div>';
        }).join('') : '<div class="empty">還沒有選擇任何角色或武器</div>') +
        '</div>' +
        '<div class="planbtns">' +
        '<button class="btn" id="addChar">＋ 加入角色</button>' +
        '<button class="btn" id="addWep">＋ 加入武器</button>' +
        '<span class="impgroup">從我的角色帶入：' +
        '<button class="btn ghost sm" id="impLv">角色等級</button>' +
        '<button class="btn ghost sm" id="impSk">技能等級</button>' +
        '<button class="btn ghost sm" id="impWep">武器等級</button></span>' +
        (plan.items.length ? '<button class="btn ghost" id="clearAll">清空</button>' : '') +
        '<button class="btn ghost" id="syncOpen">備份 · 換裝置同步</button>' +
        '</div></div>' +

        '<div class="sec"><h2>需要的突破素材' +
        (plan.items.length ? '<span class="dim">還缺 ' + totalShort + ' 個</span>' : '') + '</h2>' +
        (rows.length ?
          '<div class="matbar">' +
          '<button class="btn ghost sm" id="clearOwn">清空持有數量</button>' +
          '<span class="dim">持有數量會存在這台裝置的瀏覽器裡</span></div>' +
          '<div class="mattable"><div class="mt-head"><span>素材</span><span>需要</span><span>持有</span><span>還缺</span><span>備註</span></div>' +
          rows.map(function (r) {
            var m = (w.WW_ASC.mats[r.n]) || {};
            var note = '';
            if (r.short === 0 && r.craft > 0) note = '<span class="ok craft">庫存夠，但要合成 ' + r.craft + ' 個（消耗下階 ' + r.craft * 3 + '）</span>';
            else if (r.short === 0) note = '<span class="ok">已足夠</span>';
            else if (r.craft > 0) note = '<span class="warn">合成補 ' + r.craft + ' 個後仍缺 ' + r.short + '</span>';
            else if (r.spare > 0) note = '';
            return '<div class="mt-row' + (r.short === 0 ? ' done' : '') + '">' +
              '<span class="mt-n">' + icon(m.ic, r.n, 'big') + '<b>' + esc(r.n) + '</b></span>' +
              '<span class="mt-need">' + r.need + '</span>' +
              '<span><input class="ownin" type="number" min="0" data-n="' + esc(r.n) + '" value="' + (own[r.n] || '') + '" placeholder="0"></span>' +
              '<span class="mt-short">' + (r.short || '—') + '</span>' +
              '<span class="mt-note">' + note + '</span></div>';
          }).join('') + '</div>' +
          (craftable.length ? '<div class="note">「要合成」表示這階庫存不夠，但下階素材有多，到<b>合成台</b>用 3 個下階換 1 個上階就能補上，不必再去刷。</div>'
            : '<div class="note">同一系列的素材可在合成台以 3 換 1 往上合成；上面的「還缺」已經把下階多出來的量換算進去了。</div>') +
          (credit.length ? '<div class="creditrow">' + credit.map(function (r) {
            var m = (w.WW_ASC.mats[r.n]) || {};
            return icon(m.ic, r.n, 'big') + '<b>' + esc(r.n) + '</b><span>' + r.need.toLocaleString() + '</span>';
          }).join('') + '</div>' : '')
          : '<div class="empty">選擇對象後這裡會列出合併統計的素材</div>') +
        '</div>';

      host.querySelectorAll('select[data-i]').forEach(function (s) {
        s.onchange = function () {
          var it = plan.items[+s.dataset.i];
          it[s.dataset.f] = +s.value;
          if (it.to <= it.from) it.to = 90;
          if ((it.skTo == null ? 10 : it.skTo) < (it.sk || 1)) it.skTo = 10;
          save(); render();
        };
      });
      host.querySelectorAll('input[type=checkbox][data-i]').forEach(function (b) {
        b.onchange = function () {
          plan.items[+b.dataset.i][b.dataset.f] = b.checked ? 1 : 0;
          save(); render();
        };
      });
      host.querySelectorAll('[data-del]').forEach(function (b) {
        b.onclick = function () { plan.items.splice(+b.dataset.del, 1); save(); render(); };
      });
      host.querySelectorAll('.ownin').forEach(function (i) {
        i.onchange = i.oninput = function () {
          var v = parseInt(i.value, 10);
          if (!v || v < 0) delete own[i.dataset.n]; else own[i.dataset.n] = v;
          Store.set(K_OWN, own);
          clearTimeout(i._t); i._t = setTimeout(function () { var a = document.activeElement === i; render(); if (a) { var n2 = host.querySelector('.ownin[data-n="' + CSS.escape(i.dataset.n) + '"]'); if (n2) { n2.focus(); n2.setSelectionRange(n2.value.length, n2.value.length); } } }, 500);
        };
      });
      var b1 = byId('addChar'), b2 = byId('addWep'),
        b4 = byId('clearAll'), b5 = byId('clearOwn');
      if (b1) b1.onclick = function () { picker('c', function (id) { add('c', id); }); };
      if (b2) b2.onclick = function () { picker('w', function (n) { add('w', n); }); };
      if (b4) b4.onclick = function () { if (confirm('清空所有養成對象？')) { plan.items = []; save(); render(); } };
      if (b5) b5.onclick = function () { if (confirm('清空所有持有數量？')) { own = {}; Store.set(K_OWN, own); render(); } };
      var b6 = byId('syncOpen'); if (b6) b6.onclick = syncBox;
      /* 取得（必要時建立）某角色在計劃裡的項目；新建時預設「什麼都不算」，
         由按下的那顆按鈕決定要開啟哪一個維度，避免互相蓋掉 */
      function itemFor(id) {
        var it = plan.items.filter(function (x) { return x.k === 'c' && x.id === id; })[0];
        if (!it) { it = { k: 'c', id: id, from: 90, to: 90, sk: 10, skTo: 10, nodes: 0 }; plan.items.push(it); }
        return it;
      }
      function skillMin(r) {
        var mn = 10;
        ['basic', 'skill', 'forte', 'ult', 'intro'].forEach(function (k) {
          var v = (r.sk && r.sk[k] != null) ? r.sk[k] : ((r.done || {}).skill ? 10 : 1);
          if (v < mn) mn = v;
        });
        return mn;
      }
      function eachOwned(fn) {
        var R = Store.get(K_ROSTER, {}), n = 0;
        Object.keys(R).forEach(function (id) {
          var r = R[id];
          if (!r || !r.own) return;
          if (!w.WW_CHARACTERS.some(function (c) { return c.id === id; })) return;
          if (fn(id, r)) n++;
        });
        save(); render();
        return n;
      }
      var bLv = byId('impLv'), bSk = byId('impSk'), bWep = byId('impWep');
      if (bLv) bLv.onclick = function () {
        var n = eachOwned(function (id, r) {
          if ((r.lv || 0) >= 90) return false;
          var it = itemFor(id); it.from = r.lv || 0; it.to = 90; return true;
        });
        if (!n) alert('沒有角色等級還沒到 90 的（或「我的角色」還沒設定）。');
      };
      if (bSk) bSk.onclick = function () {
        var n = eachOwned(function (id, r) {
          var mn = skillMin(r);
          if (mn >= 10) return false;
          var it = itemFor(id); it.sk = mn; it.skTo = 10; it.nodes = 1; return true;
        });
        if (!n) alert('沒有技能還沒滿 10 級的角色（或「我的角色」還沒設定）。');
      };
      if (bWep) bWep.onclick = function () {
        var n = eachOwned(function (id, r) {
          if (!r.wep || (r.wlv || 0) >= 90) return false;
          if (plan.items.some(function (x) { return x.k === 'w' && x.id === r.wep; })) return false;
          plan.items.push({ k: 'w', id: r.wep, from: r.wlv || 0, to: 90 });
          return true;
        });
        if (!n) alert('沒有還沒滿等的武器（或「我的角色」裡還沒設定武器）。');
      };
    }
    render();
  }

  /* ================= 我的角色 ================= */
  function pageRoster() {
    var host = byId('roster');
    var R = Store.get(K_ROSTER, {});
    var state = { show: '全部', el: null, r: null, q: '' };
    function save() { Store.set(K_ROSTER, R); }
    function rec(id) { return R[id] || (R[id] = { own: 0, lv: 0, m: 0, wep: '', wlv: 0, wr: 1, sk: {}, ec: [0, 0, 0, 0, 0], done: {} }); }

    /* 畢業檢查：回傳未達成項目 */
    /* 可升級的五個技能（延奏與固有技能不獨立升級） */
    var SK_KEYS = [
      { k: '常態攻擊', slug: 'basic' }, { k: '共鳴技能', slug: 'skill' },
      { k: '共鳴迴路', slug: 'forte' }, { k: '共鳴解放', slug: 'ult' },
      { k: '變奏技能', slug: 'intro' }
    ];
    var SK_MAX = 10, ECHO_MAX = 25, ECHO_LV = [0, 5, 10, 15, 20, 25];
    /* 官方推薦裡的「COST 配置 34311」決定五格的 COST 與首位是哪一格 */
    function costLayout(c) {
      var m = String((c.build && c.build.echo) || '').match(/COST\s*配置\s*(\d{5})/);
      return (m ? m[1] : '43311').split('');
    }
    function skLv(r, slug) {
      if (r.sk && r.sk[slug] != null) return r.sk[slug];
      return (r.done || {}).skill ? SK_MAX : 1;     /* 相容舊資料的「技能已升滿」勾選 */
    }
    function skDone(r) { return SK_KEYS.every(function (s) { return skLv(r, s.slug) >= SK_MAX; }); }
    function skMin(r) { return Math.min.apply(null, SK_KEYS.map(function (s) { return skLv(r, s.slug); })); }

    function gaps(c) {
      var r = R[c.id] || {}, g = [];
      if ((r.lv || 0) < 90) g.push({ s: '角色90', f: '角色 ' + lvLabel(r.lv || 0) + ' → 90' });
      if (!r.wep) g.push({ s: '設定武器', f: '尚未設定武器' });
      else if ((r.wlv || 0) < 90) g.push({ s: '武器90', f: '武器 ' + lvLabel(r.wlv || 0) + ' → 90' });
      var ec = r.ec || [], low = ec.length === 5 ? Math.min.apply(null, ec.map(function (x) { return +x || 0; })) : 0;
      if (!(r.done || {}).set) g.push({ s: '聲骸套裝', f: '聲骸套裝未配好' });
      else if (low < ECHO_MAX) g.push({ s: '聲骸' + low + '/' + ECHO_MAX, f: '聲骸最低只練到 +' + low + '（目標 +' + ECHO_MAX + '）' });
      if (!(r.done || {}).echo) g.push({ s: '主聲骸', f: '主聲骸未到位' });
      if (!skDone(r)) g.push({ s: '技能' + skMin(r) + '/' + SK_MAX, f: '技能最低只有 ' + skMin(r) + ' 級（目標 ' + SK_MAX + '）' });
      return g;
    }
    var TOTAL_CHECKS = 5;

    var filters = byId('rfilters');
    filters.innerHTML = '';
    buildChips(filters, '顯示', ['全部', '已擁有', '未擁有', '未畢業'], 'show', state, render);
    buildChips(filters, '屬性', EL_LIST, 'el', state, render, { icons: 1 });
    buildChips(filters, '星級', ['5★', '4★'], 'r', state, render);
    addSearch(filters, '角色名稱…', state, render);
    /* 「顯示」預設全部：把 state.show 初始化為 null 代表全部 */
    state.show = null;

    /* 把目前表單上的值寫回紀錄（切換到武器挑選器時不會遺失） */
    function readForm(r) {
      if (!byId('e_own')) return;
      r.own = byId('e_own').checked ? 1 : 0;
      r.lv = +byId('e_lv').value;
      r.m = +byId('e_m').value;
      r.wlv = +byId('e_wlv').value;
      if (byId('e_wr')) r.wr = +byId('e_wr').value;
      r.sk = r.sk || {};
      SK_KEYS.forEach(function (s) { var el = byId('e_sk_' + s.slug); if (el) r.sk[s.slug] = +el.value; });
      r.done = { set: byId('e_set').checked ? 1 : 0, echo: byId('e_echo').checked ? 1 : 0 };
      r.ec = [0, 1, 2, 3, 4].map(function (i) { var el = byId('e_ec' + i); return el ? +el.value : ((r.ec || [])[i] || 0); });
    }


    /* ===== 批次設定 =====
     * 只套用在「目前篩選出來的角色」上，而且只改有勾選的欄位，
     * 沒勾的維持原樣，避免一次把不想動的資料蓋掉。
     */
    function bulkBox() {
      var list = lastList.slice();
      if (!list.length) { alert('目前篩選結果是空的，請先調整上方篩選條件。'); return; }
      var names = list.map(function (c) { return c.name; });
      var lvOpt = function (id) {
        return '<select id="' + id + '">' + LV_OPTS.map(function (v) {
          return '<option value="' + v + '"' + (v === 90 ? ' selected' : '') + '>' + lvLabel(v) + '</option>';
        }).join('') + '</select>';
      };
      var numOpt = function (id, arr, def) {
        return '<select id="' + id + '">' + arr.map(function (v) {
          return '<option value="' + v + '"' + (v === def ? ' selected' : '') + '>' + v + '</option>';
        }).join('') + '</select>';
      };
      var row = function (key, label, ctrl, hint) {
        return '<label class="bulkrow"><input type="checkbox" id="ck_' + key + '">' +
          '<span class="bl">' + esc(label) + '</span>' + ctrl +
          (hint ? '<i class="bh">' + esc(hint) + '</i>' : '') + '</label>';
      };

      lightbox(
        '<h3 style="margin:0 0 4px">批次設定</h3>' +
        '<div class="dim2">會套用到<b>目前篩選出的 ' + list.length + ' 位角色</b>：' +
        esc(names.slice(0, 12).join('、')) + (names.length > 12 ? ' …等 ' + names.length + ' 位' : '') + '</div>' +
        '<div class="note" style="margin:10px 0">只有<b>勾起來</b>的項目會被覆蓋，沒勾的維持原樣。想只改一部分角色，先用上方的篩選（屬性／星級／顯示）縮小範圍再進來。</div>' +

        '<div class="planbtns" style="margin-bottom:12px">' +
        '<button class="btn sm" id="bk_full">套用「滿練」預設</button>' +
        '<button class="btn ghost sm" id="bk_none">全部取消勾選</button></div>' +

        '<div class="bulklist">' +
        row('own', '擁有', '<select id="v_own"><option value="1">標記為擁有</option><option value="0">標記為未擁有</option></select>') +
        row('lv', '角色等級', lvOpt('v_lv')) +
        row('m', '共鳴鏈', numOpt('v_m', [0, 1, 2, 3, 4, 5, 6], 0)) +
        row('sk', '技能等級', numOpt('v_sk', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 10), '五個技能一起') +
        row('ec', '聲骸等級', numOpt('v_ec', ECHO_LV, ECHO_MAX), '五格一起') +
        row('wlv', '武器等級', lvOpt('v_wlv'), '只套用已設定武器的角色') +
        row('wr', '武器精煉', numOpt('v_wr', [1, 2, 3, 4, 5], 1), '只套用已設定武器的角色') +
        row('set', '聲骸套裝已配好', '<select id="v_set"><option value="1">是</option><option value="0">否</option></select>') +
        row('echo', '主聲骸已到位', '<select id="v_echo"><option value="1">是</option><option value="0">否</option></select>') +
        '</div>' +
        '<div class="planbtns"><button class="btn" id="bk_apply">套用到這 ' + list.length + ' 位</button></div>');

      var KEYS = ['own', 'lv', 'm', 'sk', 'ec', 'wlv', 'wr', 'set', 'echo'];
      byId('bk_none').onclick = function () { KEYS.forEach(function (k) { byId('ck_' + k).checked = false; }); };
      byId('bk_full').onclick = function () {
        KEYS.forEach(function (k) { byId('ck_' + k).checked = ['own', 'lv', 'sk', 'ec', 'wlv', 'set', 'echo'].indexOf(k) >= 0; });
        byId('v_own').value = '1'; byId('v_lv').value = '90'; byId('v_sk').value = '10';
        byId('v_ec').value = String(ECHO_MAX); byId('v_wlv').value = '90';
        byId('v_set').value = '1'; byId('v_echo').value = '1';
      };
      byId('bk_apply').onclick = function () {
        var on = {};
        KEYS.forEach(function (k) { if (byId('ck_' + k).checked) on[k] = byId('v_' + k).value; });
        var picked = Object.keys(on);
        if (!picked.length) { alert('至少要勾選一個要設定的項目。'); return; }
        if (!confirm('要把「' + picked.length + ' 個項目」套用到 ' + list.length + ' 位角色嗎？\n\n這個動作無法復原（可先到「備份 · 換裝置同步」存一份）。')) return;

        var noWeapon = 0;
        list.forEach(function (c) {
          var r = rec(c.id);
          if (on.own != null) r.own = +on.own;
          if (on.lv != null) r.lv = +on.lv;
          if (on.m != null) r.m = +on.m;
          if (on.sk != null) { r.sk = r.sk || {}; SK_KEYS.forEach(function (x) { r.sk[x.slug] = +on.sk; }); }
          if (on.ec != null) r.ec = [0, 1, 2, 3, 4].map(function () { return +on.ec; });
          if (on.wlv != null || on.wr != null) {
            if (r.wep) {
              if (on.wlv != null) r.wlv = +on.wlv;
              if (on.wr != null) r.wr = +on.wr;
            } else noWeapon++;
          }
          if (on.set != null || on.echo != null) {
            r.done = r.done || {};
            if (on.set != null) r.done.set = +on.set;
            if (on.echo != null) r.done.echo = +on.echo;
          }
        });
        save(); closeLB(); render();
        if (noWeapon) setTimeout(function () {
          alert('已套用。其中 ' + noWeapon + ' 位還沒設定武器，武器等級／精煉沒有套用到他們身上。');
        }, 100);
      };
    }

    function editor(c) {
      var r = rec(c.id);
      var wep = r.wep ? w.WW_WEAPONS.find(function (x) { return x.n === r.wep; }) : null;
      var recEcho = c.build && c.build.echo
        ? byName.echo(String(c.build.echo).split(/[（(]/)[0].trim()) : null;

      var panelRows = Object.keys(c.panel || {}).map(function (k) {
        return '<tr><td>' + esc(k) + '</td><td>' + esc(c.panel[k]) + '</td></tr>';
      }).join('') || '<tr><td colspan="2" class="dimtxt">此角色尚無畢業面板參考</td></tr>';

      lightbox(
        '<div class="lb-head">' + thumb(c.icon, c.name, 'sm') +
        '<div><h3>' + esc(c.name) + '</h3><div class="dim2">' +
        esc(c.el) + '　' + c.r + '★　' + esc(c.wp) + '　' + esc((c.role || []).join('／')) + '</div></div></div>' +

        '<table class="kv">' +
        '<tr><td>擁有</td><td><label class="sw"><input type="checkbox" id="e_own"' + (r.own ? ' checked' : '') + '><span>我有這位角色</span></label></td></tr>' +
        '<tr><td>角色等級</td><td><select id="e_lv">' +
        LV_OPTS.map(function (v) { return '<option value="' + v + '"' + (v === (r.lv || 0) ? ' selected' : '') + '>' + lvLabel(v) + '</option>'; }).join('') +
        '</select></td></tr>' +
        '<tr><td>共鳴鏈</td><td><select id="e_m">' +
        [0, 1, 2, 3, 4, 5, 6].map(function (v) { return '<option value="' + v + '"' + (v === (r.m || 0) ? ' selected' : '') + '>M' + v + '</option>'; }).join('') +
        '</select></td></tr>' +
        '<tr><td>武器</td><td><div class="wsel">' +
        '<button class="wepbtn' + (wep ? ' r' + wep.r : '') + '" id="e_wepbtn">' +
        (wep ? '<img src="' + esc(wep.ic) + '" alt="" onerror="this.remove()"><span><b>' + esc(wep.n) + '</b><i>' + stars(wep.r) + '　' + esc(wep.t) + '</i></span>'
          : '<span class="pick-empty">＋ 點此挑選武器</span>') + '</button>' +
        (wep ? '<button class="btn ghost sm" id="e_wepclr">清除</button>' : '') +
        '</div></td></tr>' +
        '<tr><td>武器等級</td><td><div class="wsel">' +
        '<select id="e_wlv"' + (wep ? '' : ' disabled') + '>' +
        LV_OPTS.map(function (v) { return '<option value="' + v + '"' + (v === (r.wlv || 0) ? ' selected' : '') + '>' + lvLabel(v) + '</option>'; }).join('') +
        '</select>' +
        '<label class="inlab">精煉 <select id="e_wr"' + (wep ? '' : ' disabled') + '>' +
        [1, 2, 3, 4, 5].map(function (v) { return '<option value="' + v + '"' + (v === (r.wr || 1) ? ' selected' : '') + '>' + v + '</option>'; }).join('') +
        '</select></label></div></td></tr>' +

        '<tr><td>技能等級</td><td><div class="sklv">' +
        SK_KEYS.map(function (s) {
          var sk = (c.skills || []).find(function (x) { return x.k === s.k; }) || {};
          var v = skLv(r, s.slug);
          return '<label class="sklv-row"><span class="sklv-n">' + icon(sk.ic, s.k) +
            '<i>' + esc(s.k) + '</i></span>' +
            '<select id="e_sk_' + s.slug + '">' +
            Array.from({ length: SK_MAX }, function (_, i) { return i + 1; })
              .map(function (n) { return '<option value="' + n + '"' + (n === v ? ' selected' : '') + '>' + n + '</option>'; }).join('') +
            '</select></label>';
        }).join('') +
        '</div><div class="planbtns" style="margin-top:8px">' +
        '<button class="btn ghost sm" id="e_skmax">全部設為 ' + SK_MAX + '</button>' +
        '<button class="btn ghost sm" id="e_skmin">全部設為 1</button></div></td></tr>' +

        '<tr><td>聲骸等級</td><td><div class="eclv">' +
        costLayout(c).map(function (cost, i) {
          var v = ((r.ec || [])[i] != null) ? r.ec[i] : 0;
          return '<label class="eclv-row"><span class="eclv-n"><i class="cost c' + cost + '">C' + cost + '</i>' +
            (i === 0 ? '<b>首位</b>' : '<b>' + (i + 1) + '</b>') + '</span>' +
            '<select id="e_ec' + i + '">' + ECHO_LV.map(function (n) {
              return '<option value="' + n + '"' + (n === v ? ' selected' : '') + '>+' + n + '</option>';
            }).join('') + '</select></label>';
        }).join('') +
        '</div><div class="planbtns" style="margin-top:8px">' +
        '<button class="btn ghost sm" id="e_ecmax">全部 +' + ECHO_MAX + '</button>' +
        '<button class="btn ghost sm" id="e_ecmin">全部 +0</button></div>' +
        '<div class="dimtxt" style="margin-top:4px">COST 配置依官方推薦；首位那一格就是主聲骸，要用它的聲骸技能。</div></td></tr>' +
        '<tr><td>聲骸</td><td>' +
        '<label class="sw"><input type="checkbox" id="e_set"' + ((r.done || {}).set ? ' checked' : '') + '><span>套裝已配好</span></label>' +
        '<div class="dimtxt" style="margin:2px 0 8px 24px">' + linkify(c.build && c.build.set, ['sonata']) + '</div>' +
        '<label class="sw"><input type="checkbox" id="e_echo"' + ((r.done || {}).echo ? ' checked' : '') + '><span>主聲骸已到位</span></label>' +
        '<div class="dimtxt" style="margin:2px 0 0 24px">' +
        (recEcho ? '<a class="ref" data-lb="echo" data-n="' + esc(recEcho.cn) + '" href="#">' +
          icon(recEcho.ic, recEcho.cn) + esc(recEcho.cn) + '</a>' : esc((c.build && c.build.echo) || '—')) +
        '</div></td></tr>' +
        '</table>' +

        '<div class="planbtns"><button class="btn" id="e_save">儲存</button>' +
        '<a class="btn ghost" href="character.html?id=' + c.id + '">看完整角色內頁</a></div>' +

        '<h4 class="lb-h4">推薦畢業面板</h4>' +
        '<table class="kv">' + panelRows + '</table>' +
        '<div class="dimtxt" style="margin-top:6px">為含隊伍增益前的自身面板參考區間，實際需求依隊伍與武器而異。</div>' +
        '<h4 class="lb-h4">有效詞條優先序</h4>' +
        '<div class="pill-row">' + (c.sub || []).map(function (s, i) {
          return '<span class="pill' + (i === 0 ? ' no1' : '') + '">' + (i + 1) + '. ' + esc(s) + '</span>';
        }).join('') + '</div>' +
        '<h4 class="lb-h4">配裝重點' +
        (c.build && c.build.src ? '<span class="srcbadge' + (/庫街區/.test(c.build.src) ? ' official' : '') + '">' + esc(c.build.src) + '</span>' : '') + '</h4>' +
        '<table class="kv">' +
        '<tr><td>主詞條</td><td>' + esc((c.build && c.build.main) || '—') + '</td></tr>' +
        '<tr><td>推薦武器</td><td>' + linkify(c.build && c.build.weapon, ['weapon']) + '</td></tr>' +
        (c.subText ? '<tr><td>官方副詞條</td><td>' + esc(c.subText) + '</td></tr>' : '') +
        '</table>');

      byId('e_wepbtn').onclick = function () {
        readForm(r);
        picker('w', function (n) {
          r.wep = n;
          if (!r.wlv) r.wlv = 0;
          if (!r.wr) r.wr = 1;
          save(); editor(c);
        }, function (x) { return x.t === c.wp; },
          { once: 1, title: '選擇武器（' + c.wp + '）', hint: '只列出 ' + c.name + ' 能使用的' + c.wp + '，點一下就選定' });
      };
      var clr = byId('e_wepclr');
      if (clr) clr.onclick = function () { readForm(r); r.wep = ''; r.wlv = 0; r.wr = 1; save(); editor(c); };
      byId('e_ecmax').onclick = function () { [0, 1, 2, 3, 4].forEach(function (i) { byId('e_ec' + i).value = ECHO_MAX; }); };
      byId('e_ecmin').onclick = function () { [0, 1, 2, 3, 4].forEach(function (i) { byId('e_ec' + i).value = 0; }); };
      byId('e_skmax').onclick = function () { SK_KEYS.forEach(function (s) { byId('e_sk_' + s.slug).value = SK_MAX; }); };
      byId('e_skmin').onclick = function () { SK_KEYS.forEach(function (s) { byId('e_sk_' + s.slug).value = 1; }); };
      byId('e_save').onclick = function () { readForm(r); save(); closeLB(); render(); };
    }

    var lastList = [];
    function render() {
      var grid = byId('grid'), cnt = byId('count');
      var list = w.WW_CHARACTERS.filter(function (c) {
        var r = R[c.id] || {};
        if (state.show === '已擁有' && !r.own) return false;
        if (state.show === '未擁有' && r.own) return false;
        if (state.show === '未畢業' && (!r.own || gaps(c).length === 0)) return false;
        if (state.el && c.el !== state.el) return false;
        if (state.r && ('' + c.r + '★') !== state.r) return false;
        if (state.q && (c.name + ' ' + c.en).toLowerCase().indexOf(state.q) < 0) return false;
        return true;
      });
      lastList = list;
      var ownedAll = w.WW_CHARACTERS.filter(function (c) { return (R[c.id] || {}).own; });
      var grad = ownedAll.filter(function (c) { return gaps(c).length === 0; });
      var sb = byId('syncbar');
      if (sb && !sb.dataset.done) {
        sb.dataset.done = '1';
        sb.innerHTML = '<button class="btn sm" id="bulkOpen">批次設定</button>' +
          '<button class="btn ghost sm" id="sy_open">備份 · 換裝置同步</button>';
        byId('sy_open').onclick = syncBox;
        byId('bulkOpen').onclick = function () { bulkBox(); };
      }
      byId('summary').innerHTML =
        '<div class="stat"><b>' + ownedAll.length + '</b><span>已擁有</span></div>' +
        '<div class="stat"><b>' + grad.length + '</b><span>已畢業</span></div>' +
        '<div class="stat"><b>' + (ownedAll.length - grad.length) + '</b><span>養成中</span></div>' +
        '<div class="stat"><b>' + (w.WW_CHARACTERS.length - ownedAll.length) + '</b><span>未擁有</span></div>';
      cnt.textContent = list.length + ' / ' + w.WW_CHARACTERS.length + ' 位';

      grid.innerHTML = list.map(function (c) {
        var r = R[c.id] || {}, g = r.own ? gaps(c) : null;
        var pct = r.own ? Math.round((TOTAL_CHECKS - g.length) / TOTAL_CHECKS * 100) : 0;
        return '<div class="card r' + c.r + ' rcard' + (r.own ? '' : ' unowned') + '" data-id="' + c.id + '">' +
          thumb(c.icon, c.name) +
          '<span class="badge-el" style="border-color:' + EL_COLOR[c.el] + ';color:' + EL_COLOR[c.el] + '"><img src="' + esc(c.elIc) + '" alt="" onerror="this.remove()"></span>' +
          (r.own ? '<span class="badge-lv">' + (r.lv ? 'Lv' + r.lv : '未養成') + '</span>' : '<span class="badge-lv off">未擁有</span>') +
          (r.own && (r.m || r.wep)
            ? '<span class="badge-mr" title="共鳴鏈 M' + (r.m || 0) +
            (r.wep ? '　·　' + esc(r.wep) + ' 精煉 ' + (r.wr || 1) : '　·　尚未設定武器') + '">' +
            'M' + (r.m || 0) + (r.wep ? '<em>+</em>R' + (r.wr || 1) : '') + '</span>' : '') +
          (r.own && !g.length ? '<span class="badge-grad">畢業</span>' : '') +
          '<div class="cbody"><div class="cname">' + esc(c.name) + '</div>' +
          (r.own ? '<div class="prog" title="畢業進度 ' + (TOTAL_CHECKS - g.length) + '/' + TOTAL_CHECKS + '"><i style="width:' + pct + '%"></i></div>' +
            '<div class="gaps' + (g.length ? '' : ' okgap') + '" title="' + esc(g.map(function (x) { return x.f; }).join('、')) + '">' +
            (g.length ? '缺 ' + esc(g[0].s) + (g.length > 1 ? ' +' + (g.length - 1) : '') : '★ 已畢業') + '</div>'
            : '<div class="gaps dimtxt">點一下設定</div>') +
          '</div></div>';
      }).join('') || '<div class="empty">沒有符合條件的角色</div>';

      grid.querySelectorAll('.rcard').forEach(function (el) {
        el.onclick = function () {
          var c = w.WW_CHARACTERS.find(function (x) { return x.id === el.dataset.id; });
          editor(c);
        };
      });
    }
    render();
  }

  w.WW = { esc: esc, stars: stars, thumb: thumb, icon: icon, EL_COLOR: EL_COLOR, lightbox: lightbox, Store: Store };
  document.addEventListener('DOMContentLoaded', function () {
    var p = document.body.dataset.page;
    ({
      home: pageHome, characters: pageCharacters, character: pageCharacter,
      weapons: pageWeapons, weapon: pageWeapon, echoes: pageSonatas, sonata: pageSonata,
      plan: pagePlan, roster: pageRoster
    }[p] || function () { })();
    var alias = { character: 'characters', sonata: 'echoes', weapon: 'weapons' };
    var navKey = alias[p] || p;
    document.querySelectorAll('nav.main a').forEach(function (a) {
      if (a.dataset.nav === navKey) a.classList.add('on');
    });
  });
})(window);
