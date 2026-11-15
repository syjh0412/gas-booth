/* 기체 실험 부스 웹앱: 실험 선택 → 슬라이드 → 활동지 인쇄 */
(function () {
  'use strict';
  var D = window.GAS_DATA, EX = D.exps, CATS = D.cats, STDS = D.standards;
  var BY = {}; EX.forEach(function (e) { BY[e.code] = e; });
  var GROUPS = [
    ['P', '기체의 압력', '압력의 뜻과, 입자의 충돌로 생기는 기체의 압력'],
    ['B', '보일 법칙', '압력이 변할 때 기체의 부피가 어떻게 변하는지 보는 실험'],
    ['C', '샤를 법칙', '온도가 변할 때 기체의 부피가 어떻게 변하는지 보는 실험'],
    ['D', '선생님 시연', '선생님이 앞에서 보여 주는 실험'],
    ['X', '보너스 미션', '성취기준 밖의 원리가 섞인 도전 과제. 궁금증을 남기는 용도']
  ];
  var SAMPLE = ['P1', 'P2', 'P4', 'P3', 'B2', 'B3', 'B4', 'B6', 'C1', 'C2', 'C7', 'C8'];
  var KEY = 'gasbooth.selection.v1';
  var app = document.getElementById('app');
  var sim = null, toastTimer = null;

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function order(codes) { return EX.filter(function (e) { return codes.indexOf(e.code) >= 0; }).map(function (e) { return e.code; }); }

  /* ---------- 선택 상태 ---------- */
  function loadSel() {
    var m = /[?&]s=([^&#]*)/.exec(location.search);
    if (m) { return order(decodeURIComponent(m[1]).split('.')); }
    try { var raw = localStorage.getItem(KEY); if (raw) { return order(JSON.parse(raw)); } } catch (e) { /* 저장소를 못 쓰는 환경 */ }
    return [];
  }
  var sel = loadSel();
  function saveSel() { try { localStorage.setItem(KEY, JSON.stringify(sel)); } catch (e) { /* 무시 */ } }
  function shareUrl() { return location.origin + location.pathname + '?s=' + sel.join('.'); }

  function toast(html, ms) {
    var old = document.querySelector('.toast'); if (old) { old.remove(); }
    var t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.innerHTML = html;
    document.body.appendChild(t); clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.remove(); }, ms || 2600);
  }

  /* ---------- QR 코드 ---------- */
  function siteUrl() { return location.origin + location.pathname; }
  function qrCanvas(text, px) {
    var q = window.qrcode(0, 'M'); q.addData(text); q.make();
    var n = q.getModuleCount(), quiet = 4, cell = Math.max(2, Math.floor(px / (n + quiet * 2))), size = (n + quiet * 2) * cell;
    var cv = document.createElement('canvas'); cv.width = size; cv.height = size;
    var c = cv.getContext('2d'); c.fillStyle = '#FFFFFF'; c.fillRect(0, 0, size, size); c.fillStyle = '#000000';
    for (var r = 0; r < n; r++) { for (var k = 0; k < n; k++) { if (q.isDark(r, k)) { c.fillRect((k + quiet) * cell, (r + quiet) * cell, cell, cell); } } }
    return cv;
  }
  function closeModal() { var m = document.querySelector('.modal-bg'); if (m) { m.remove(); } }
  function shareModal() {
    closeModal();
    var url = shareUrl(), bg = document.createElement('div');
    bg.className = 'modal-bg';
    bg.innerHTML = '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="mdt"><h2 id="mdt">이 구성 공유하기</h2>' +
      '<p>지금 고른 실험 ' + sel.length + '개가 선택된 상태로 열리는 주소입니다. QR 코드를 화면에 띄우거나 인쇄해서 학생에게 보여 주세요.</p>' +
      '<div class="qrbig" id="qrbig"></div><label class="sr" for="surl">공유 주소</label><input id="surl" readonly value="' + esc(url) + '">' +
      '<div class="mbtns"><button class="btn pri sm" id="mcopy">주소 복사</button><button class="btn yel sm" id="msave">QR 이미지 저장</button><button class="btn sm" id="mclose">닫기</button></div>' +
      '<p class="mmsg" id="mmsg" role="status"></p></div>';
    document.body.appendChild(bg);
    var big = qrCanvas(url, 720); big.setAttribute('role', 'img'); big.setAttribute('aria-label', '공유 주소 QR 코드');
    document.getElementById('qrbig').appendChild(big);
    var msg = document.getElementById('mmsg'), inp = document.getElementById('surl');
    document.getElementById('mclose').onclick = closeModal;
    bg.addEventListener('click', function (ev) { if (ev.target === bg) { closeModal(); } });
    document.getElementById('mcopy').onclick = function () {
      var manual = function () { inp.focus(); inp.select(); msg.textContent = '주소를 선택했습니다. Ctrl+C로 복사하세요.'; };
      if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(url).then(function () { msg.textContent = '주소를 복사했습니다.'; }, manual); } else { manual(); }
    };
    document.getElementById('msave').onclick = function () {
      var a = document.createElement('a'); a.download = '기체실험부스_QR.png'; a.href = big.toDataURL('image/png');
      document.body.appendChild(a); a.click(); a.remove(); msg.textContent = 'QR 이미지를 저장했습니다.';
    };
    document.getElementById('mclose').focus();
  }
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') { closeModal(); } });

  /* ---------- 작은 그림 ---------- */
  function face(x, y, r) {
    return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="#FFD43B" stroke="#1B1F3B" stroke-width="3"/>' +
      '<circle cx="' + (x - r * 0.33) + '" cy="' + (y - r * 0.08) + '" r="' + Math.max(1.6, r * 0.13) + '" fill="#1B1F3B"/>' +
      '<circle cx="' + (x + r * 0.33) + '" cy="' + (y - r * 0.08) + '" r="' + Math.max(1.6, r * 0.13) + '" fill="#1B1F3B"/>';
  }
  function art(e) { return '<svg role="img" aria-label="' + esc(e.title) + ' 실험 그림" viewBox="0 0 660 300">' + e.art + '</svg>'; }

  /* ================= 홈 ================= */
  function renderHome() {
    stopSim(); document.body.style.overflow = '';
    var h = '<div class="home">';
    h += '<header class="hero"><svg class="dots" aria-hidden="true" viewBox="0 0 300 170">' + face(40, 50, 18) + face(120, 110, 26) + face(210, 46, 14) + face(262, 120, 20) + face(170, 150, 10) + '</svg>' +
      '<div class="htext"><span class="tag">중학교 1학년 과학 · 기체의 성질</span><h1>기체 실험 부스</h1>' +
      '<p>압력, 보일 법칙, 샤를 법칙을 눈으로 보고 입자로 설명하는 실험 ' + EX.length + '가지. 할 실험만 골라서 슬라이드로 설명하고, 고른 실험의 활동지만 인쇄하세요.</p></div>' +
      '<div class="hqr"><div id="hqr"></div><span>휴대폰으로 열기</span></div></header>';
    h += '<section class="panel"><h2>오늘의 도착점 (2022 개정 교육과정 성취기준)</h2><div class="stds">';
    [['9과06-01', 'P'], ['9과06-02', 'B'], ['9과06-03', 'C']].forEach(function (s) {
      h += '<div class="std" style="background:' + CATS[s[1]].tint + '"><b style="color:' + CATS[s[1]].main + '">[' + s[0] + '] ' + CATS[s[1]].name.replace(' 부스', '') + '</b>' + esc(STDS[s[0]]) + '</div>';
    });
    h += '</div></section>';
    h += '<section class="panel"><h2>이렇게 쓰세요</h2><ol class="how">' +
      '<li><span class="n">1</span><span><b>실험 고르기</b><br>준비할 수 있는 실험에 체크합니다. 선택은 이 기기에 저장됩니다.</span></li>' +
      '<li><span class="n">2</span><span><b>슬라이드 보기</b><br>고른 실험만 순서대로 보여 줍니다. 부스 태블릿에는 "이 부스만 보기"를 띄워 두세요.</span></li>' +
      '<li><span class="n">3</span><span><b>활동지 인쇄</b><br>고른 실험만, A4 한 장에 1·2·3·4·6칸 중에서 골라 인쇄합니다.</span></li>' +
      '<li><span class="n">4</span><span><b>이 구성 공유하기</b><br>지금 고른 실험 구성을 주소와 QR 코드로 만듭니다. 학생이나 동료 선생님이 열면 같은 실험이 선택된 상태로 열립니다.</span></li></ol></section>';
    h += '<div class="tools"><button class="btn sm" data-act="all">전체 선택</button><button class="btn sm" data-act="none">전체 해제</button><button class="btn sm" data-act="sample">예시 구성 (12개)</button></div>';
    GROUPS.forEach(function (g) {
      var c = CATS[g[0]], list = EX.filter(function (e) { return e.cat === g[0]; });
      h += '<section class="group"><div class="ghead"><h2 style="background:' + c.main + '">' + g[1] + '</h2><span class="gsub">' + g[2] + '</span>' +
        '<button class="btn sm" data-group="' + g[0] + '">이 묶음 모두 선택</button></div><div class="cards">';
      list.forEach(function (e) {
        var on = sel.indexOf(e.code) >= 0;
        h += '<div class="card' + (on ? ' on' : '') + '" data-code="' + e.code + '">' +
          '<input type="checkbox" id="ck' + e.code + '"' + (on ? ' checked' : '') + ' aria-label="' + esc(e.code + ' ' + e.title) + ' 선택">' +
          '<label for="ck' + e.code + '"><div class="thumb" style="background:' + c.tint + '">' + art(e) + '</div>' +
          '<div><span class="code">' + e.code + '</span><span class="ttl">' + esc(e.title) + '</span></div><div class="hk">' + esc(e.hook) + '</div></label>' +
          '<div class="foot"><span>' + (e.level ? '난이도 ' + '●●●'.slice(0, e.level) + '○○○'.slice(0, 3 - e.level) : '선생님 시연') + ' · ' + (e.std === '보너스' ? '보너스' : e.std) + '</span>' +
          '<a href="#slides/' + e.code + '">이 부스만 보기</a></div></div>';
      });
      h += '</div></section>';
    });
    h += '<p class="footnote">성취기준과 활동지 수준은 2022 개정 과학과 교육과정과 중학교 과학 1 교과서를 참고했습니다. 실험 전에 반드시 예비 실험을 하고, 안전 약속을 학생과 함께 확인하세요.</p></div>';
    h += '<div class="bar"><span class="cnt" id="cnt"></span><a class="btn pri" href="#slides" id="goSlides">슬라이드 보기</a><a class="btn yel" href="#print" id="goPrint">활동지 인쇄</a><button class="btn" data-act="share">이 구성 공유하기</button></div>';
    app.innerHTML = h;
    var hq = qrCanvas(siteUrl(), 360); hq.setAttribute('role', 'img'); hq.setAttribute('aria-label', '이 사이트 주소 QR 코드');
    document.getElementById('hqr').appendChild(hq);
    updateCount();
  }
  function updateCount() {
    var c = document.getElementById('cnt'); if (c) { c.textContent = '선택한 실험 ' + sel.length + '개'; }
    document.querySelectorAll('[data-group]').forEach(function (b) {
      var full = groupFull(b.getAttribute('data-group'));
      b.textContent = full ? '이 묶음 모두 해제' : '이 묶음 모두 선택';
      b.setAttribute('aria-pressed', full ? 'true' : 'false');
    });
  }
  function setSel(list) {
    sel = order(list); saveSel();
    document.querySelectorAll('.card').forEach(function (card) {
      var on = sel.indexOf(card.getAttribute('data-code')) >= 0;
      card.classList.toggle('on', on); card.querySelector('input').checked = on;
    });
    updateCount();
  }
  function groupFull(g) { return EX.filter(function (e) { return e.cat === g; }).every(function (e) { return sel.indexOf(e.code) >= 0; }); }
  app.addEventListener('change', function (ev) {
    var card = ev.target.closest && ev.target.closest('.card');
    if (card && ev.target.type === 'checkbox') {
      var code = card.getAttribute('data-code'), list = sel.slice();
      if (ev.target.checked) { list.push(code); } else { list = list.filter(function (c) { return c !== code; }); }
      setSel(list);
    }
  });
  app.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('[data-act],[data-group]'); if (!b) { return; }
    var act = b.getAttribute('data-act'), grp = b.getAttribute('data-group');
    if (grp) {
      var codes = EX.filter(function (e) { return e.cat === grp; }).map(function (e) { return e.code; });
      if (groupFull(grp)) { setSel(sel.filter(function (c) { return codes.indexOf(c) < 0; })); } else { setSel(sel.concat(codes)); }
    } else if (act === 'all') { setSel(EX.map(function (e) { return e.code; })); }
    else if (act === 'none') { setSel([]); }
    else if (act === 'sample') { setSel(SAMPLE); toast('예시 구성 12개를 선택했습니다.'); }
    else if (act === 'share') {
      if (!sel.length) { toast('먼저 실험을 하나 이상 골라 주세요.'); return; }
      shareModal();
    }
  });

  /* ================= 슬라이드 ================= */
  var STEPS = ['시작', '준비', '방법', '예상', '입자', '정리'];
  function buildDeck(single) {
    var list = single ? [BY[single]] : sel.map(function (c) { return BY[c]; });
    var deck = [];
    if (!single) { deck.push({ t: 'cover', list: list }, { t: 'goal', list: list }, { t: 'flow' }, { t: 'talk' }); }
    list.forEach(function (e) { for (var i = 0; i < 6; i++) { deck.push({ t: 'exp', e: e, k: i }); } });
    if (!single) { deck.push({ t: 'wrap', list: list }); }
    return deck;
  }
  function head(e, k) {
    var c = CATS[e.cat];
    return '<div class="s-head" style="background:' + c.main + '"><div class="code">' + e.code + '</div><div class="ttl">' + esc(e.title) + '</div>' +
      '<nav class="steps-nav" aria-label="이 실험의 단계">' + STEPS.map(function (s, i) { return '<button type="button" data-step="' + i + '"' + (i === k ? ' class="cur" aria-current="step" style="color:' + c.main + '"' : '') + '>' + s + '</button>'; }).join('') + '</nav></div>';
  }
  function ul(items, color) { return '<ul class="list">' + items.map(function (x) { return '<li><span class="dot" style="background:' + color + '"></span><span>' + esc(x) + '</span></li>'; }).join('') + '</ul>'; }
  function slideHtml(s) {
    var c, e, h;
    if (s.t === 'cover') {
      return '<div class="slide cover" style="background:#1B1F3B"><div class="in"><div style="flex:1"><span class="chip" style="color:#1B1F3B">중학교 1학년 과학 · 기체의 성질</span><h1>기체 실험 부스</h1>' +
        '<div class="hook">오늘 만날 실험 ' + s.list.length + '가지</div><div class="chips" style="margin-top:22px">' + s.list.slice(0, 18).map(function (x) { return '<span style="font-size:22px;padding:2px 14px;border-width:3px;color:#1B1F3B">' + x.code + ' ' + esc(x.title) + '</span>'; }).join('') + (s.list.length > 18 ? '<span style="font-size:22px;padding:2px 14px;border-width:3px;color:#1B1F3B">외 ' + (s.list.length - 18) + '개</span>' : '') + '</div></div></div></div>';
    }
    if (s.t === 'goal') {
      var used = {}; s.list.forEach(function (x) { if (STDS[x.std]) { used[x.std] = x.cat === 'D' ? 'C' : x.cat; } });
      h = '<div class="slide" style="background:#F3F5FB"><div class="s-head" style="background:#1B1F3B"><div class="ttl">오늘의 도착점</div></div><div class="s-body" style="flex-direction:column;gap:14px;padding-top:20px;padding-bottom:20px">';
      Object.keys(used).sort().forEach(function (k) {
        var cc = CATS[used[k]];
        h += '<div class="box" style="background:' + cc.tint + ';padding:14px 24px;gap:8px"><span class="pill" style="background:' + cc.main + ';font-size:22px">' + cc.name.replace(' 부스', '') + '</span><div style="font-size:27px;font-weight:700;line-height:1.35">' + esc(STDS[k]) + '</div></div>';
      });
      if (!Object.keys(used).length) { h += '<div class="box"><div style="font-size:32px;font-weight:700">보너스 미션: 궁금증을 품고 관찰해 보자.</div></div>'; }
      return h + '<div class="note" style="font-size:22px">실험을 보고 끝내지 말고, 입자로 설명할 수 있어야 도착!</div></div></div>';
    }
    if (s.t === 'flow') {
      var f = [['예상', '결과를 먼저 예상하고 활동지에 표시'], ['실험', '안전 약속을 지키며 차례대로'], ['관찰', '본 것을 그대로 기록'], ['입자', '입자를 그리고 입자로 말하기'], ['도장', '도우미에게 설명하고 도장 받기']];
      return '<div class="slide" style="background:#F3F5FB"><div class="s-head" style="background:#1B1F3B"><div class="ttl">부스에서는 이렇게</div></div><div class="s-body" style="flex-direction:column;justify-content:center;gap:26px"><div class="flow">' +
        f.map(function (x, i) { return '<div><i>' + (i + 1) + '</i><b>' + x[0] + '</b><span>' + x[1] + '</span></div>'; }).join('') +
        '</div><div class="box" style="background:#FFD43B"><div style="font-size:28px;font-weight:700">부스 도우미의 일: 방법 안내하기 → "왜 그럴까?" 물어보기 → 입자로 설명하면 도장 찍어 주기</div></div></div></div>';
    }
    if (s.t === 'talk') {
      return '<div class="slide" style="background:#F3F5FB"><div class="s-head" style="background:#1B1F3B"><div class="ttl">입자로 말하기 약속</div></div><div class="s-body" style="flex-direction:column;gap:20px">' +
        '<div class="box"><span class="pill dark">이 낱말로 설명해요</span><div class="chips"><span>입자 수</span><span>입자 사이의 거리</span><span>입자의 빠르기</span><span>충돌 횟수</span><span>압력</span><span>부피</span><span>온도</span></div></div>' +
        '<div class="box" style="flex:1"><span class="pill dark">이렇게 말해요</span><div style="font-size:30px;line-height:1.6"><b>무엇이 변했나</b> → <b>입자는 어떻게 되었나</b> → <b>그래서 어떻게 되었나</b></div>' +
        '<div style="font-size:28px;line-height:1.6;color:#5B6185">예) 주사기를 누르면 공간이 좁아져요. 입자 수는 그대로인데 입자 사이가 가까워져서 벽에 더 자주 충돌해요. 그래서 기체의 압력이 커져요.</div></div></div></div>';
    }
    if (s.t === 'wrap') {
      return '<div class="slide" style="background:#F3F5FB"><div class="s-head" style="background:#1B1F3B"><div class="ttl">마무리: 입자로 한 문장</div></div><div class="s-body" style="flex-direction:column;gap:20px;justify-content:center">' +
        '<div class="bigq">오늘 본 실험들의 공통점을<br>입자로 한 문장으로 말해 보자</div>' +
        '<div class="box"><span class="pill dark">스스로 점검</span><ul class="list"><li><span class="dot" style="background:#1B1F3B"></span><span>무엇이 변할 때 기체의 부피가 어떻게 변하는지 말할 수 있다.</span></li><li><span class="dot" style="background:#1B1F3B"></span><span>생활 속에서 같은 예를 찾을 수 있다.</span></li><li><span class="dot" style="background:#1B1F3B"></span><span>그 까닭을 입자 모형으로 설명할 수 있다.</span></li></ul></div></div></div>';
    }
    e = s.e; c = CATS[e.cat];
    if (s.k === 0) {
      return '<div class="slide cover" style="background:' + c.main + '"><div class="in"><div style="flex:1;min-width:0"><span class="chip" style="color:' + c.main + '">' + c.name + '</span>' +
        '<h1 style="font-size:' + (e.title.length > 10 ? 64 : e.title.length > 8 ? 76 : 92) + 'px">' + esc(e.title) + '</h1><div class="hook">' + esc(e.hook) + '</div>' +
        '<div class="badge" style="margin-top:26px"><small>부스</small><b>' + e.code + '</b></div></div><div class="art">' + art(e) + '</div></div></div>';
    }
    h = '<div class="slide" style="background:' + c.tint + '">' + head(e, s.k) + '<div class="s-body">';
    if (s.k === 1) {
      h += '<div class="box" style="flex:1"><span class="pill" style="background:' + c.main + '">준비물</span>' + ul(e.materials, c.main) + '</div>' +
        '<div style="flex:1;display:flex;flex-direction:column;gap:20px;min-width:0"><div class="box" style="background:#FFD43B"><span class="pill dark">안전 약속</span>' + ul(e.safety, '#1B1F3B') + '</div>' +
        '<div class="box" style="flex:1"><span class="pill" style="background:' + c.main + '">성공 꿀팁</span>' + ul(e.tips, c.main) + '</div></div>';
    } else if (s.k === 2) {
      h += '<div class="box" style="flex:1.25"><span class="pill" style="background:' + c.main + '">실험 방법</span><ol class="list">' +
        e.steps.map(function (x, i) { return '<li><span class="num">' + (i + 1) + '</span><span style="padding-top:3px">' + esc(x) + '</span></li>'; }).join('') + '</ol></div>' +
        '<div class="box" style="flex:1"><div class="artbox">' + art(e) + '</div><div style="font-size:22px;background:' + c.tint + ';border-radius:14px;padding:8px 14px"><b style="color:' + c.main + '">뒷정리</b> ' + esc(e.cleanup) + '</div></div>';
    } else if (s.k === 3) {
      h += '<div style="flex:1;display:flex;flex-direction:column;gap:26px;justify-content:center"><div class="note" style="font-weight:700;color:' + c.main + '">실험하기 전에 먼저 예상해 보자</div>' +
        '<div class="bigq">' + esc(e.ws.q) + '</div><div class="opts">' + e.ws.o.map(function (x) { return '<button class="opt" aria-pressed="false">' + esc(x) + '</button>'; }).join('') + '</div>' +
        '<div class="note">활동지에 내 예상을 표시하고, 실험으로 확인하자!</div></div>';
    } else if (s.k === 4) {
      var left;
      if (e.sim) {
        left = '<div class="box" style="flex:1.05"><span class="pill" style="background:' + c.main + '">입자 모형으로 보기</span><div class="sim" data-sim="' + e.sim + '"></div></div>';
      } else {
        left = '<div class="box" style="flex:1.05"><span class="pill" style="background:' + c.main + '">' + (e.cat === 'X' ? '무슨 일이 일어났을까?' : '그림으로 보기') + '</span><div class="artbox"><svg role="img" aria-label="원리 그림" viewBox="0 0 400 236">' + e.pd + '</svg></div></div>';
      }
      h += left + '<div class="box" style="flex:1"><span class="pill dark">' + (e.cat === 'X' ? '힌트' : '입자로 설명해 보자') + '</span><div style="font-weight:700;line-height:1.4">' + esc(e.qs[1]) + '</div>' +
        '<ul class="list why" style="font-size:25px">' + e.why.map(function (x) { return '<li class="hid"><span class="dot" style="background:' + c.main + '"></span><span>' + esc(x) + '</span></li>'; }).join('') + '</ul>' +
        '<button class="btn" data-reveal style="margin-top:auto;align-self:flex-start;font-size:22px;min-height:54px">설명 한 줄씩 보기 (0/' + e.why.length + ')</button></div>';
    } else {
      h += '<div style="flex:1;display:flex;flex-direction:column;gap:22px;min-width:0"><div class="lawband" style="background:' + c.main + '"><small>오늘의 한 줄</small><b>' + esc(e.law) + '</b></div>' +
        '<div style="display:flex;gap:22px;flex:1;min-height:0"><div class="box" style="flex:1"><span class="pill" style="background:' + c.main + '">생활 속에서 찾아보기</span>' + ul(e.life, c.main) + '</div>' +
        '<div class="box" style="flex:1"><span class="pill dark">활동지 마무리</span>' + ul(['입자 그림을 그렸나요?', '입자로 말하기 문장을 완성했나요?', '도우미에게 설명하고 도장을 받았나요?'], '#1B1F3B') + '</div></div></div>';
    }
    return h + '</div></div>';
  }

  var deck = [], pos = 0, single = null;
  function renderSlides(code) {
    single = code && BY[code] ? code : null;
    if (!single && !sel.length) { location.hash = '#home'; setTimeout(function () { toast('먼저 실험을 하나 이상 골라 주세요.'); }, 50); return; }
    deck = buildDeck(single); pos = 0;
    var list = single ? [BY[single]] : sel.map(function (c) { return BY[c]; });
    var opts;
    if (single) {
      opts = GROUPS.map(function (g) {
        return '<optgroup label="' + g[1] + '">' + EX.filter(function (e) { return e.cat === g[0]; }).map(function (e) {
          return '<option value="' + e.code + '"' + (e.code === single ? ' selected' : '') + '>' + e.code + ' ' + esc(e.title) + (sel.indexOf(e.code) >= 0 ? ' ✓' : '') + '</option>';
        }).join('') + '</optgroup>';
      }).join('');
    } else {
      opts = '<option value="0">처음 안내</option>' + list.map(function (e) {
        var idx = deck.findIndex(function (s) { return s.e === e; });
        return '<option value="' + idx + '">' + e.code + ' ' + esc(e.title) + '</option>';
      }).join('');
    }
    app.innerHTML = '<div class="deck"><div class="dbar"><a class="btn sm" href="#home">처음으로</a>' +
      '<label class="sr" for="jump">다른 실험으로 이동</label><select id="jump">' + opts + '</select><span class="sp"></span>' +
      '<button class="btn sm" id="prev" aria-label="이전 슬라이드">이전</button><span class="pg" id="pg" aria-live="polite"></span><button class="btn sm" id="next" aria-label="다음 슬라이드">다음</button>' +
      '<button class="btn sm" id="full">전체 화면</button></div><div class="viewport" id="vp"><div class="stage" id="stage"></div></div></div>';
    document.body.style.overflow = 'hidden';
    document.getElementById('prev').onclick = function () { go(pos - 1); };
    document.getElementById('next').onclick = function () { go(pos + 1); };
    document.getElementById('jump').onchange = function () {
      if (single) { location.hash = '#slides/' + this.value; } else { go(parseInt(this.value, 10)); this.blur(); }
    };
    document.getElementById('full').onclick = function () {
      var el = document.documentElement;
      if (document.fullscreenElement) { document.exitFullscreen(); } else if (el.requestFullscreen) { el.requestFullscreen().catch(function () { toast('이 브라우저에서는 전체 화면을 쓸 수 없습니다.'); }); }
    };
    document.getElementById('stage').addEventListener('click', onStageClick);
    fit(); go(0);
  }
  function fit() {
    var vp = document.getElementById('vp'), st = document.getElementById('stage'); if (!vp || !st) { return; }
    var k = Math.min(vp.clientWidth / 1280, vp.clientHeight / 720);
    st.style.transform = 'translate(-50%, -50%) scale(' + k + ')';
  }
  function go(i) {
    if (i < 0 || i >= deck.length) { return; }
    stopSim(); pos = i;
    var st = document.getElementById('stage'); st.innerHTML = slideHtml(deck[pos]);
    document.getElementById('pg').textContent = (pos + 1) + ' / ' + deck.length;
    document.getElementById('prev').disabled = pos === 0;
    document.getElementById('next').disabled = pos === deck.length - 1;
    var j = document.getElementById('jump'), best = 0;
    if (single) { j.value = single; } else {
      Array.prototype.forEach.call(j.options, function (o) { if (parseInt(o.value, 10) <= pos) { best = o.value; } });
      j.value = best;
    }
    var holder = st.querySelector('[data-sim]');
    if (holder) { sim = new Sim(holder, holder.getAttribute('data-sim')); }
  }
  function onStageClick(ev) {
    var o = ev.target.closest('.opt'), r = ev.target.closest('[data-reveal]'), st = ev.target.closest('[data-step]');
    if (st) {
      var cur = deck[pos], k = parseInt(st.getAttribute('data-step'), 10);
      var idx = deck.findIndex(function (d) { return d.t === 'exp' && d.e === cur.e && d.k === k; });
      if (idx >= 0) { go(idx); }
    } else if (o) {
      o.parentNode.querySelectorAll('.opt').forEach(function (b) { b.setAttribute('aria-pressed', b === o ? 'true' : 'false'); });
    } else if (r) {
      var items = r.parentNode.querySelectorAll('.why li'), n = r.parentNode.querySelectorAll('.why li:not(.hid)').length;
      if (n < items.length) { items[n].classList.remove('hid'); n++; }
      r.textContent = n >= items.length ? '설명을 모두 보았어요' : '설명 한 줄씩 보기 (' + n + '/' + items.length + ')';
      if (n >= items.length) { r.disabled = true; }
    }
  }
  document.addEventListener('keydown', function (ev) {
    if (!document.querySelector('.deck')) { return; }
    var tag = (ev.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'select' || tag === 'button' && (ev.key === ' ' || ev.key === 'Enter')) { return; }
    if (ev.key === 'ArrowRight' || ev.key === 'PageDown' || ev.key === ' ') { ev.preventDefault(); go(pos + 1); }
    else if (ev.key === 'ArrowLeft' || ev.key === 'PageUp') { ev.preventDefault(); go(pos - 1); }
  });
  window.addEventListener('resize', fit);

  /* ================= 입자 모형 ================= */
  function stopSim() { if (sim) { sim.stop(); sim = null; } }
  function Sim(root, mode) {
    var self = this; this.mode = mode; this.alive = true;
    var cfg = {
      boyle: { label: '부피', min: 30, max: 100, val: 100, left: '작게', right: '크게', tip: '피스톤을 밀어 부피를 줄여 보자. 입자 수는 그대로인데 충돌 횟수는 어떻게 될까?' },
      charles: { label: '온도', min: 1, max: 9, val: 4, left: '차갑게', right: '뜨겁게', tip: '온도를 올려 보자. 입자의 빠르기와 부피는 어떻게 될까? (피스톤은 자유롭게 움직인다)' },
      count: { label: '입자 수', min: 4, max: 36, val: 8, left: '적게', right: '많게', tip: '입자 수를 늘려 보자. 벽에 충돌하는 횟수는 어떻게 될까?' }
    }[mode];
    root.innerHTML = '<canvas width="620" height="300" role="img" aria-label="상자 안에서 움직이는 기체 입자 모형"></canvas>' +
      '<div class="ctl"><span>' + cfg.left + '</span><input type="range" min="' + cfg.min + '" max="' + cfg.max + '" value="' + cfg.val + '" step="1" aria-label="' + cfg.label + ' 조절"><span>' + cfg.right + '</span></div>' +
      '<div class="meters"><div class="meter"><span data-m="a"></span><div class="track"><div class="fill" data-f="a"></div></div></div>' +
      '<div class="meter"><span data-m="b"></span><div class="track"><div class="fill" data-f="b" style="background:#D6336C"></div></div></div></div>' +
      '<div style="font-size:19px;color:#5B6185;line-height:1.35">' + cfg.tip + '</div>';
    this.cv = root.querySelector('canvas'); this.ctx = this.cv.getContext('2d');
    this.slider = root.querySelector('input'); this.root = root;
    this.X0 = 20; this.Y0 = 20; this.H = 260; this.WM = 560; this.W = this.WM; this.R = 13;
    this.ps = []; this.hits = []; this.sparks = []; this.speed = 150; this.temp = 1;
    this.setN(mode === 'count' ? cfg.val : 14);
    this.apply(true);
    this.slider.addEventListener('input', function () { self.apply(false); });
    this.last = performance.now();
    this.loop = function (now) { if (!self.alive) { return; } self.step(Math.min(0.033, (now - self.last) / 1000), now); self.last = now; self.raf = requestAnimationFrame(self.loop); };
    this.raf = requestAnimationFrame(this.loop);
  }
  Sim.prototype.stop = function () { this.alive = false; cancelAnimationFrame(this.raf); };
  Sim.prototype.setN = function (n) {
    while (this.ps.length < n) {
      var a = Math.random() * Math.PI * 2;
      this.ps.push({ x: this.X0 + this.R + Math.random() * (this.W - 2 * this.R), y: this.Y0 + this.R + Math.random() * (this.H - 2 * this.R), dx: Math.cos(a), dy: Math.sin(a) });
    }
    this.ps.length = n;
  };
  Sim.prototype.apply = function (instant) {
    var v = parseInt(this.slider.value, 10);
    if (this.mode === 'boyle') { this.target = this.WM * v / 100; }
    else if (this.mode === 'charles') { this.temp = 0.4 + (v - 1) * 0.15; this.target = this.WM * this.temp / 1.6; this.speed = 150 * Math.sqrt(this.temp); }
    else { this.setN(v); this.target = this.WM; }
    if (instant) { this.W = this.target; }
  };
  Sim.prototype.step = function (dt, now) {
    var i, p, R = this.R, x0 = this.X0, y0 = this.Y0, self = this;
    this.W += (this.target - this.W) * Math.min(1, dt * 6);
    var xr = x0 + this.W - R, hit = function (x, y) { self.hits.push(now); self.sparks.push({ x: x, y: y, t: now }); };
    for (i = 0; i < this.ps.length; i++) {
      p = this.ps[i]; p.x += p.dx * this.speed * dt; p.y += p.dy * this.speed * dt;
      if (p.x < x0 + R) { p.x = x0 + R; p.dx = Math.abs(p.dx); hit(x0, p.y); }
      if (p.x > xr) { p.x = xr; p.dx = -Math.abs(p.dx); hit(x0 + this.W, p.y); }
      if (p.y < y0 + R) { p.y = y0 + R; p.dy = Math.abs(p.dy); hit(p.x, y0); }
      if (p.y > y0 + this.H - R) { p.y = y0 + this.H - R; p.dy = -Math.abs(p.dy); hit(p.x, y0 + this.H); }
    }
    while (this.hits.length && now - this.hits[0] > 2000) { this.hits.shift(); }
    while (this.sparks.length && now - this.sparks[0].t > 260) { this.sparks.shift(); }
    this.draw(now);
  };
  Sim.prototype.color = function () {
    if (this.mode !== 'charles') { return '#FFD43B'; }
    var k = Math.max(0, Math.min(1, (this.temp - 0.4) / 1.2)), a = [140, 203, 255], b = [255, 155, 138];
    return 'rgb(' + Math.round(a[0] + (b[0] - a[0]) * k) + ',' + Math.round(a[1] + (b[1] - a[1]) * k) + ',' + Math.round(a[2] + (b[2] - a[2]) * k) + ')';
  };
  Sim.prototype.draw = function (now) {
    var c = this.ctx, x0 = this.X0, y0 = this.Y0, W = this.W, H = this.H, i, p, s, R = this.R;
    c.clearRect(0, 0, 620, 300);
    c.fillStyle = '#FFFFFF'; c.fillRect(x0, y0, W, H);
    c.lineWidth = 4; c.strokeStyle = '#1B1F3B'; c.strokeRect(x0, y0, W, H);
    if (this.mode !== 'count') {
      c.fillStyle = '#8A93C8'; c.fillRect(x0 + W, y0 - 4, 12, H + 8);
      c.fillStyle = '#1B1F3B'; c.fillRect(x0 + W + 12, y0 + H / 2 - 5, 24, 10);
    }
    c.strokeStyle = '#D6336C'; c.lineWidth = 3;
    for (i = 0; i < this.sparks.length; i++) {
      s = this.sparks[i]; var k = (now - s.t) / 260, r1 = 6 + 10 * k, r2 = r1 + 7;
      c.globalAlpha = 1 - k;
      for (var a = 0; a < 6; a++) { var an = a * Math.PI / 3; c.beginPath(); c.moveTo(s.x + Math.cos(an) * r1, s.y + Math.sin(an) * r1); c.lineTo(s.x + Math.cos(an) * r2, s.y + Math.sin(an) * r2); c.stroke(); }
    }
    c.globalAlpha = 1;
    var col = this.color();
    for (i = 0; i < this.ps.length; i++) {
      p = this.ps[i];
      c.beginPath(); c.arc(p.x, p.y, R, 0, Math.PI * 2); c.fillStyle = col; c.fill(); c.lineWidth = 3; c.strokeStyle = '#1B1F3B'; c.stroke();
      c.fillStyle = '#1B1F3B'; c.beginPath(); c.arc(p.x - 4.2, p.y - 1, 1.9, 0, Math.PI * 2); c.fill(); c.beginPath(); c.arc(p.x + 4.2, p.y - 1, 1.9, 0, Math.PI * 2); c.fill();
    }
    var rate = Math.round(this.hits.length / 2), ma = this.root.querySelector('[data-m="a"]'), mb = this.root.querySelector('[data-m="b"]');
    var fa = this.root.querySelector('[data-f="a"]'), fb = this.root.querySelector('[data-f="b"]');
    if (this.mode === 'boyle') { ma.textContent = '부피'; fa.style.width = Math.round(W / this.WM * 100) + '%'; }
    else if (this.mode === 'charles') { ma.textContent = '부피 (입자 빠르기: ' + (this.temp < 0.8 ? '느림' : this.temp < 1.2 ? '보통' : '빠름') + ')'; fa.style.width = Math.round(W / this.WM * 100) + '%'; }
    else { ma.textContent = '입자 수 ' + this.ps.length + '개'; fa.style.width = Math.round(this.ps.length / 36 * 100) + '%'; }
    mb.textContent = (this.mode === 'charles' ? '벽 충돌 1초에 약 ' : '압력: 벽 충돌 1초에 약 ') + rate + '번';
    fb.style.width = Math.min(100, Math.round(rate / (this.mode === 'count' ? 60 : 50) * 100)) + '%';
  };

  /* ================= 활동지 ================= */
  var layout = 4, showKey = false;
  var CHECKS = {
    '9과06-01': ['압력의 뜻을 말할 수 있다', '생활 속 예를 들 수 있다', '기체의 압력을 입자의 충돌로 설명할 수 있다'],
    '9과06-02': ['압력에 따라 부피가 어떻게 변하는지 말할 수 있다', '생활 속 예를 들 수 있다', '그 까닭을 입자 모형으로 설명할 수 있다'],
    '9과06-03': ['온도에 따라 부피가 어떻게 변하는지 말할 수 있다', '생활 속 예를 들 수 있다', '그 까닭을 입자 모형으로 설명할 수 있다']
  };
  function lines(n) { var s = ''; for (var i = 0; i < n; i++) { s += '<div class="wline"></div>'; } return s; }
  function frame(f, key) {
    return esc(f).replace(/\[([^\]]+)\]/g, function (m, a) { return key ? '<span class="blank ans">' + a + '</span>' : '<span class="blank" style="min-width:' + Math.max(11, a.length * 4.2 + 5) + 'mm">&nbsp;</span>'; });
  }
  function wsCard(e, d, key) {
    var w = e.ws, bonus = e.cat === 'X', n = 0, num = function () { n++; return '<i>' + n + '</i>'; };
    var std = bonus ? '보너스 미션 · 성취기준 밖 도전' : '[' + e.std + ']' + (d <= 2 ? ' ' + STDS[e.std] : '');
    var headHtml = '<div class="whead"><span class="wc">' + e.code + '</span><span class="wt">' + esc(e.title) + '</span><span class="wstd">' + esc(std) + '</span><span class="stamp">도장</span></div>';
    var obsN = { 1: 3, 2: 2, 3: 2, 4: 1, 6: 1 }[d];
    var meas = w.measure && d <= 4 ? '<div class="wmeas">' + w.measure.map(function (m) { return '<span>' + m + ' <span class="blank">&nbsp;</span> cm</span>'; }).join('') + '</div>' : '';
    var S = {
      pred: function () { return '<div class="wsec"><h4>' + num() + '예상 <span style="font-weight:400">' + esc(w.q) + '</span></h4><div class="wopts">' + w.o.map(function (x, i) { return '<span' + (key && i === w.a ? ' class="ans"' : '') + '>' + esc(x) + '</span>'; }).join('') + '</div></div>'; },
      obs: function () { return '<div class="wsec"><h4>' + num() + '관찰 <span style="font-weight:400">실험에서 본 것</span></h4>' + meas + lines(meas && d > 1 ? Math.max(1, obsN - 1) : obsN) + '</div>'; },
      draw: function () {
        return '<div class="wsec" style="flex:1"><h4>' + num() + (bonus ? '그림으로 남기기' : e.std === '9과06-01' && e.sim === null ? '그림으로 생각하기' : '입자로 그리기') +
          (d === 6 ? ' <span style="font-weight:400">' + esc(w.hs) + '</span>' : '') + '</h4>' + (d <= 4 ? '<p>' + esc(w.hint) + '</p>' : '') +
          '<div class="wdraw"><svg role="img" aria-label="그리기 칸" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid meet">' + (key ? w.key : w.svg) + '</svg></div></div>';
      },
      talk: function () {
        if (w.f) { return '<div class="wsec"><h4>' + num() + (e.sim === null ? '문장으로 정리하기' : '입자로 말하기') + '</h4><p class="wframe">' + frame(w.f, key) + '</p></div>'; }
        return '<div class="wsec"><h4>' + num() + '내 생각 <span style="font-weight:400">왜 이런 일이 일어났을까?</span></h4>' + (key ? '<p class="blank ans" style="display:block;text-align:left;border:0">' + esc(e.why.join(' ')) + '</p>' : lines(d === 1 ? 4 : d === 6 ? 1 : 2)) + '</div>';
      },
      own: function () { return bonus ? '' : '<div class="wsec"><h4>' + num() + '내 말로 설명하기 <span style="font-weight:400">친구에게 말하듯 써 보자</span></h4>' + lines(3) + '</div>'; },
      life: function () { return '<div class="wsec"><h4>' + num() + '생활 속 예 <span style="font-weight:400">같은 원리로 설명되는 예</span></h4>' + (key ? '<p class="blank ans" style="display:block;text-align:left;border:0">예: ' + esc(e.life.join(' / ')) + '</p>' : lines(d === 1 ? 2 : 1)) + '</div>'; },
      chk: function () { return CHECKS[e.std] ? '<div class="wsec"><h4>스스로 점검</h4><div class="wchk">' + CHECKS[e.std].map(function (x) { return '<span>' + x + '</span>'; }).join('') + '</div></div>' : ''; }
    };
    var body;
    if (d === 1) { body = S.pred() + S.obs() + S.draw() + S.talk() + S.own() + S.life() + S.chk(); }
    else if (d === 2) { body = '<div class="cols2"><div class="col">' + S.pred() + S.obs() + S.draw() + '</div><div class="col">' + S.talk() + S.life() + S.chk() + '</div></div>'; }
    else if (d === 3) { body = '<div class="cols3"><div class="col">' + S.pred() + S.obs() + '</div><div class="col">' + S.draw() + '</div><div class="col">' + S.talk() + S.life() + '</div></div>'; }
    else if (d === 4) { body = S.pred() + S.obs() + S.draw() + S.talk(); }
    else { body = S.pred() + S.draw() + S.talk(); }
    return '<article class="ws d' + d + '">' + headHtml + '<div class="wbody">' + body + '</div></article>';
  }
  function renderPrint() {
    stopSim(); document.body.style.overflow = '';
    if (!sel.length) { location.hash = '#home'; setTimeout(function () { toast('먼저 실험을 하나 이상 골라 주세요.'); }, 50); return; }
    var list = sel.map(function (c) { return BY[c]; }), pages = Math.ceil(list.length / layout);
    var h = '<div class="printwrap"><div class="ptools"><a class="btn sm" href="#home">처음으로</a>' +
      '<div class="grp" role="group" aria-label="A4 한 장에 넣을 부스 수">A4 한 장에 ' + [1, 2, 3, 4, 6].map(function (n) { return '<button class="btn sm" data-layout="' + n + '" aria-pressed="' + (n === layout) + '">' + n + '칸</button>'; }).join('') + '</div>' +
      '<label><input type="checkbox" id="key"' + (showKey ? ' checked' : '') + '> 교사용 예시 답 표시</label>' +
      '<button class="btn pri sm" id="doPrint">인쇄하기</button><span class="pinfo">실험 ' + list.length + '개 · A4 ' + pages + '쪽</span></div><div class="sheets">';
    for (var p = 0; p < pages; p++) {
      h += '<section class="sheet l' + layout + '"><div class="shead"><b>기체 실험 부스 활동지' + (showKey ? ' (교사용 예시 답)' : '') + '</b><span>1학년 &nbsp;&nbsp;&nbsp;&nbsp;반 &nbsp;&nbsp;&nbsp;&nbsp;번 &nbsp;이름 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span></div><div class="wgrid">' +
        list.slice(p * layout, (p + 1) * layout).map(function (e) { return wsCard(e, layout, showKey); }).join('') + '</div></section>';
    }
    app.innerHTML = h + '</div></div>';
    app.querySelectorAll('[data-layout]').forEach(function (b) { b.onclick = function () { layout = parseInt(b.getAttribute('data-layout'), 10); renderPrint(); }; });
    document.getElementById('key').onchange = function () { showKey = this.checked; renderPrint(); };
    document.getElementById('doPrint').onclick = function () { window.print(); };
  }

  /* ================= 라우터 ================= */
  function route() {
    closeModal();
    var hsh = location.hash.replace(/^#/, ''), oldToast = document.querySelector('.toast');
    if (oldToast) { oldToast.remove(); }
    if (document.fullscreenElement && hsh.indexOf('slides') !== 0) { document.exitFullscreen(); }
    if (hsh.indexOf('slides') === 0) { renderSlides(hsh.split('/')[1]); }
    else if (hsh === 'print') { renderPrint(); }
    else { renderHome(); }
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);
  var shared = /[?&]s=/.test(location.search);
  if (shared) { saveSel(); }
  route();
  if (shared && sel.length && !location.hash.replace('#', '').replace('home', '')) { toast('공유받은 구성입니다. 실험 ' + sel.length + '개가 선택되어 있습니다.', 6000); }
})();
