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

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function stars(n) { return '★'.repeat(n); }
  function qs(k) { return new URLSearchParams(location.search).get(k); }
  function byId(x) { return document.getElementById(x); }

  /* 圖片：載入失敗時退回文字方塊 */
  function thumb(src, fallbackText, cls) {
    var f = esc(String(fallbackText || '?').slice(0, 2));
    return '<div class="thumb ' + (cls || '') + '">' +
      '<span class="fallback">' + f + '</span>' +
      (src ? '<img loading="lazy" src="' + esc(src) + '" alt="" onerror="this.remove()">' : '') +
      '</div>';
  }
  /* 小圖示（屬性、武器類型、素材…） */
  function icon(src, alt, cls) {
    if (!src) return '<span class="ico-txt ' + (cls || '') + '">' + esc(String(alt || '').slice(0, 2)) + '</span>';
    return '<img class="ico ' + (cls || '') + '" src="' + esc(src) + '" alt="' + esc(alt || '') + '" title="' + esc(alt || '') + '" onerror="this.outerHTML=\'<span class=&quot;ico-txt&quot;>' + esc(String(alt || '').slice(0, 2)) + '</span>\'">';
  }

  function findEcho(name) {
    if (!name) return null;
    var key = String(name).split(/[（(]/)[0].trim();
    return (w.WW_ECHOES || []).find(function (e) { return e.cn === key; }) || null;
  }
  function findSonata(cn) {
    return (w.WW_SONATAS || []).find(function (s) { return s.cn === cn; }) || null;
  }
  /* 把「凌冽決斷之心 3件＋凝夜白霜 2件」轉成含圖示的連結 */
  function setLinks(text) {
    if (!text) return '—';
    var out = esc(text);
    (w.WW_SONATAS || []).forEach(function (s) {
      if (out.indexOf(s.cn) < 0) return;
      out = out.split(s.cn).join('<a class="setref" href="sonata.html?id=' + s.id + '">' +
        (s.ic ? '<img class="ico" src="' + esc(s.ic) + '" alt="" onerror="this.remove()">' : '') + s.cn + '</a>');
    });
    return out;
  }

  /* ---------- 篩選 chips ---------- */
  function buildChips(host, label, values, key, state, onChange, colorize) {
    var row = document.createElement('div');
    row.className = 'frow';
    row.innerHTML = '<span class="flabel">' + esc(label) + '</span>';
    var all = document.createElement('span');
    all.className = 'chip on'; all.textContent = '全部';
    function reset() {
      row.querySelectorAll('.chip').forEach(function (n) {
        n.classList.remove('on');
        if (colorize && EL_COLOR[n.dataset.v]) { n.style.background = ''; n.style.color = EL_COLOR[n.dataset.v]; }
      });
    }
    all.onclick = function () { state[key] = null; reset(); all.classList.add('on'); onChange(); };
    row.appendChild(all);
    values.forEach(function (v) {
      var b = document.createElement('span');
      b.className = 'chip'; b.dataset.v = v;
      var ic = colorize ? iconFor(key, v) : '';
      b.innerHTML = ic + '<span>' + esc(v) + '</span>';
      if (colorize && EL_COLOR[v]) { b.style.borderColor = EL_COLOR[v]; b.style.color = EL_COLOR[v]; }
      b.onclick = function () {
        state[key] = (state[key] === v) ? null : v;
        reset();
        if (state[key]) {
          b.classList.add('on');
          if (colorize && EL_COLOR[v]) { b.style.background = EL_COLOR[v]; b.style.color = '#0d1018'; }
        } else all.classList.add('on');
        onChange();
      };
      row.appendChild(b);
    });
    host.appendChild(row);
  }
  function iconFor(key, v) {
    if (EL_LIST.indexOf(v) >= 0) return '<img class="ico" src="assets/img/element/' + encodeURIComponent(v) + '.png" alt="" onerror="this.remove()">';
    if (WP_LIST.indexOf(v) >= 0) return '<img class="ico" src="assets/img/wtype/' + encodeURIComponent(v) + '.png" alt="" onerror="this.remove()">';
    return '';
  }
  function addSearch(host, ph, state, onChange) {
    var row = document.createElement('div');
    row.className = 'frow';
    row.innerHTML = '<span class="flabel">搜尋</span>';
    var inp = document.createElement('input');
    inp.className = 'search'; inp.placeholder = ph;
    inp.oninput = function () { state.q = inp.value.trim().toLowerCase(); onChange(); };
    row.appendChild(inp);
    host.appendChild(row);
  }
  function addSort(host, opts, state, onChange) {
    var row = document.createElement('div');
    row.className = 'frow';
    row.innerHTML = '<span class="flabel">排序</span>';
    var sel = document.createElement('select');
    sel.className = 'sortsel';
    opts.forEach(function (o, i) {
      var op = document.createElement('option');
      op.value = i; op.textContent = o.label; sel.appendChild(op);
    });
    sel.onchange = function () { state.sort = +sel.value; onChange(); };
    row.appendChild(sel);
    var dir = document.createElement('span');
    dir.className = 'chip dirbtn'; dir.textContent = '↓ 遞減';
    dir.onclick = function () {
      state.desc = !state.desc;
      dir.textContent = state.desc ? '↓ 遞減' : '↑ 遞增';
      onChange();
    };
    row.appendChild(dir);
    host.appendChild(row);
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
    var state = { el: null, wp: null, r: null, role: null, g: null, q: '', sort: 0, desc: true };
    buildChips(host, '屬性', EL_LIST, 'el', state, render, true);
    buildChips(host, '武器', WP_LIST, 'wp', state, render, true);
    buildChips(host, '星級', ['5★', '4★'], 'r', state, render);
    buildChips(host, '定位', ROLE_LIST, 'role', state, render);
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
        if (state.q) {
          var hay = (c.name + ' ' + c.en + ' ' + (c.buff || '') + ' ' + c.role.join(' ') + ' ' + (c.style || []).join(' ')).toLowerCase();
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
          '<span class="badge-el" style="background:' + EL_COLOR[c.el] + '">' +
          '<img src="' + esc(c.elIc) + '" alt="" onerror="this.remove()">' + c.el + '</span>' +
          (c.tier ? '<span class="badge-tier t-' + c.tier + '">' + c.tier + '</span>' : '') +
          '<span class="badge-role">' + esc(c.role[0]) + '</span>' +
          '<div class="cbody"><div class="cname">' + esc(c.name) + '</div>' +
          '<div class="cmeta"><span class="stars">' + stars(c.r) + '</span>' +
          icon(c.wpIc, c.wp) + '<span>' + esc(c.wp) + '</span><span>' + esc(c.g) + '</span></div>' +
          '</div></a>';
      }).join('') || '<div class="empty">找不到符合條件的角色</div>';
    }
    render();
  }

  /* ================= 角色細項 ================= */
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

    var e = findEcho(c.build && c.build.echo);
    var echoHtml = e
      ? '<div class="echoref">' + icon(e.ic, e.cn, 'big') +
      '<div><div class="mn">' + esc(e.cn) + '</div><div class="mq">COST ' + e.c + '　' + esc(e.danger || '') + '</div></div></div>'
      : '<span>' + esc((c.build && c.build.echo) || '—') + '</span>';

    host.innerHTML =
      '<div class="crumb"><a href="index.html">首頁</a> / <a href="characters.html">全角色圖鑒</a> / ' + esc(c.name) + '</div>' +

      '<div class="detail-top">' +
      '<div class="artbox">' + (c.art
        ? '<img class="art" src="' + esc(c.art) + '" alt="' + esc(c.name) + '" onerror="this.remove()">'
        : '') + '</div>' +
      '<div class="dinfo">' +
      '<div class="dhead">' + thumb(c.icon, c.name, 'sm') +
      '<div><h1>' + esc(c.name) + '</h1><div class="en">' + esc(c.en) + '</div></div></div>' +
      '<div class="tags">' +
      '<span class="tag el" style="background:' + EL_COLOR[c.el] + '">' + icon(c.elIc, c.el) + c.el + '</span>' +
      '<span class="tag">' + c.r + '★</span>' +
      '<span class="tag">' + icon(c.wpIc, c.wp) + esc(c.wp) + '</span>' +
      '<span class="tag">' + esc(c.g) + '</span>' +
      c.role.map(function (r) { return '<span class="tag">' + esc(r) + '</span>'; }).join('') +
      '<span class="tag">' + esc(c.region || '—') + '</span>' +
      (c.tier ? '<span class="tag">評級 ' + c.tier + '</span>' : '') +
      '</div>' +
      (c.style && c.style.length ? '<div class="tags">' + c.style.map(function (s) { return '<span class="tag alt">' + esc(s) + '</span>'; }).join('') + '</div>' : '') +
      '<table class="kv tight">' +
      '<tr><td>共鳴能力</td><td>' + esc(c.ability || '—') + '</td></tr>' +
      (c.s90.atk
        ? '<tr><td>Lv.90 基礎</td><td>生命 ' + esc(c.s90.hp) + '　攻擊 ' + esc(c.s90.atk) + '　防禦 ' + esc(c.s90.def) + '</td></tr>'
        : (c.s1 && c.s1.atk ? '<tr><td>Lv.1 基礎</td><td>生命 ' + esc(c.s1.hp) + '　攻擊 ' + esc(c.s1.atk) + '　防禦 ' + esc(c.s1.def) + '<span class="dim">（wiki 尚未提供 90 級數值）</span></td></tr>' : '')) +
      '<tr><td>生日／料理</td><td>' + esc(c.birth) + '　·　' + esc(c.food) + '</td></tr>' +
      '</table>' +
      (c.feature ? '<div class="intro feat"><b>戰鬥特色</b><br>' + c.feature + '</div>' : '') +
      (c.intro ? '<div class="intro">' + c.intro + '</div>' : '') +
      '</div></div>' +

      '<div class="sec"><h2>可提供隊友的增益</h2><p>' + esc(c.buff || '—') + '</p>' +
      (c.note ? '<div class="note">' + esc(c.note) + '</div>' : '') + '</div>' +

      '<div class="cols">' +
      '<div class="sec"><h2>畢業面板參考</h2><table class="kv">' + panel + '</table>' +
      '<div class="note">為含隊伍增益前的自身面板參考區間，實際需求依隊伍與武器而異。</div></div>' +
      '<div class="sec"><h2>有效詞條優先序</h2><div class="pill-row">' + subs + '</div>' +
      '<div class="note">聲骸副詞條：雙暴優先，攻擊%與對應技能傷害加成次之；輔助位以共鳴效率、生命%／防禦%、治療效果為主。</div></div>' +
      '</div>' +

      '<div class="sec"><h2>突破素材（Lv.90 總計）</h2><div class="mats">' + ascHtml + '</div></div>' +

      '<div class="sec"><h2>配裝推薦</h2><table class="kv">' +
      '<tr><td>聲骸套裝</td><td>' + setLinks(c.build && c.build.set) + '</td></tr>' +
      '<tr><td>主詞條</td><td>' + esc((c.build && c.build.main) || '—') + '</td></tr>' +
      '<tr><td>指定主聲骸</td><td>' + echoHtml + '</td></tr>' +
      '<tr><td>推薦武器</td><td>' + esc((c.build && c.build.weapon) || '—') + '</td></tr>' +
      '</table></div>' +

      '<div class="sec"><h2>技能</h2><div class="skills">' + skillHtml + '</div></div>' +
      '<div class="sec"><h2>共鳴鏈（命座）</h2><div class="skills">' + chainHtml + '</div></div>';
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
    var state = { t: null, r: null, q: '', sort: 0, desc: true };
    buildChips(host, '類型', WP_LIST, 't', state, render, true);
    buildChips(host, '星級', ['5★', '4★', '3★', '2★', '1★'], 'r', state, render);
    addSort(host, WEP_SORTS, state, render);
    addSearch(host, '武器名稱／適配角色／技能…', state, render);

    function render() {
      var list = w.WW_WEAPONS.filter(function (x) {
        if (state.t && x.t !== state.t) return false;
        if (state.r && ('' + x.r + '★') !== state.r) return false;
        if (state.q) {
          var hay = (x.n + ' ' + (x.own || '') + ' ' + (x.effName || '') + ' ' + (x.eff || '') + ' ' + (x.sub || '')).toLowerCase();
          if (hay.indexOf(state.q) < 0) return false;
        }
        return true;
      });
      var f = WEP_SORTS[state.sort].f;
      list.sort(function (a, b) { var r = f(a, b); return state.desc ? -r : r; });
      cnt.textContent = list.length + ' / ' + w.WW_WEAPONS.length + ' 把武器';
      grid.innerHTML = list.map(function (x) {
        return '<a class="card r' + x.r + '" href="weapon.html?n=' + encodeURIComponent(x.n) + '">' +
          thumb(x.ic, x.n) +
          '<div class="cbody"><div class="cname">' + esc(x.n) + '</div>' +
          '<div class="cmeta"><span class="stars">' + stars(x.r) + '</span>' +
          icon(x.wpIc, x.t) + '<span>' + esc(x.t) + '</span>' +
          (x.sub && x.sub !== '—' ? '<span>' + esc(x.sub) + '</span>' : '') + '</div>' +
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
      '<div class="wepbox r' + x.r + '">' + (x.ic
        ? '<img class="wepart" src="' + esc(x.ic) + '" alt="' + esc(x.n) + '" onerror="this.remove()">' : '') + '</div>' +
      '<div class="dinfo"><h1>' + esc(x.n) + '</h1>' +
      '<div class="tags">' +
      '<span class="tag stars r' + x.r + '">' + stars(x.r) + '</span>' +
      '<span class="tag">' + icon(x.wpIc, x.t) + esc(x.t) + '</span>' +
      (x.ver ? '<span class="tag">' + esc(x.ver) + ' 版本</span>' : '') +
      '</div>' +
      '<table class="kv">' +
      '<tr><td>90 級攻擊力</td><td>' + esc(x.atk || '—') + '<span class="dim">（初始 ' + esc(x.atk0 || '—') + '）</span></td></tr>' +
      '<tr><td>副詞條</td><td>' + esc(x.sub || '—') + '　' + esc(x.subv || '') + '<span class="dim">（初始 ' + esc(x.subv0 || '—') + '）</span></td></tr>' +
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
  }

  /* ================= 聲骸套裝 ================= */
  function pageSonatas() {
    var grid = byId('grid'), cnt = byId('count'), host = byId('filters');
    var state = { el: null, q: '' };
    var els = [];
    w.WW_SONATAS.forEach(function (s) { if (els.indexOf(s.el) < 0) els.push(s.el); });
    buildChips(host, '屬性', els, 'el', state, render, true);
    addSearch(host, '套裝名稱／效果關鍵字…', state, render);

    function render() {
      var list = w.WW_SONATAS.filter(function (s) {
        if (state.el && s.el !== state.el) return false;
        if (state.q) {
          var hay = (s.cn + ' ' + s.en + ' ' + s.p2 + ' ' + s.p5).toLowerCase();
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
          '<div style="min-width:0"><h3>' + esc(s.cn) + '</h3><p>' + esc(s.en) + '</p>' +
          '<p class="dim2">' + esc(s.el) + '　·　' + esc(s.pieces) + '　·　' + n + ' 個聲骸</p></div>' +
          '</div></a>';
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
          return '<div class="card echocard" title="' + esc(e.skill.replace(/<[^>]+>/g, '')) + '">' +
            thumb(e.ic, e.cn) +
            '<div class="cbody"><div class="cname">' + esc(e.cn) + '</div>' +
            '<div class="cmeta"><span>COST ' + e.c + '</span>' + (e.danger ? '<span>' + esc(e.danger) + '</span>' : '') + '</div></div></div>';
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
      '<div class="tags"><span class="tag">' + esc(s.el) + '</span><span class="tag">' + esc(s.pieces) + '</span>' +
      '<span class="tag">' + esc(s.ver) + ' 版本</span></div>' +
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
      '<div class="note">同一顆聲骸可能同時可調諧為多個套裝；COST 配置以 4-3-3-1-1（合計 12）為主流。滑鼠停在聲骸上可看技能敘述。</div></div>';
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
        '<span class="badge-el" style="background:' + EL_COLOR[c.el] + '"><img src="' + esc(c.elIc) + '" alt="" onerror="this.remove()">' + c.el + '</span>' +
        '<div class="cbody"><div class="cname">' + esc(c.name) + '</div>' +
        '<div class="cmeta"><span class="stars">' + stars(c.r) + '</span>' + icon(c.wpIc, c.wp) + '</div></div></a>';
    }).join('');
  }

  w.WW = { esc: esc, stars: stars, thumb: thumb, icon: icon, EL_COLOR: EL_COLOR };
  document.addEventListener('DOMContentLoaded', function () {
    var p = document.body.dataset.page;
    ({
      home: pageHome, characters: pageCharacters, character: pageCharacter,
      weapons: pageWeapons, weapon: pageWeapon, echoes: pageSonatas, sonata: pageSonata
    }[p] || function () { })();
    var alias = { character: 'characters', sonata: 'echoes', weapon: 'weapons' };
    var navKey = alias[p] || p;
    document.querySelectorAll('nav.main a').forEach(function (a) {
      if (a.dataset.nav === navKey) a.classList.add('on');
    });
  });
})(window);
