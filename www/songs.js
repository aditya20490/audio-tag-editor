(function () {
  var cap = window.Capacitor;
  var isNative = cap && cap.isNativePlatform && cap.isNativePlatform();
  var lib = isNative && cap.Plugins && cap.Plugins.AudioLibrary;
  if (!lib) return;

  var q = function (s) { return document.querySelector(s); };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  };
  var MAXROWS = 300;

  /* styles for the song browser */
  var st = document.createElement('style');
  st.textContent =
    '#browseBtn{width:100%;min-height:54px;font-size:17px;font-weight:600;background:#7c9cff;color:#000;border:0;border-radius:14px;margin-bottom:10px}' +
    '#songOv{position:fixed;inset:0;z-index:9998;background:#000;display:flex;flex-direction:column;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)}' +
    '#songOv[hidden]{display:none}' +
    '.sbar{display:flex;gap:8px;padding:10px 12px;align-items:center}' +
    '.sbar button{min-height:46px;padding:8px 16px}' +
    '.sbar input{flex:1;min-width:0;min-height:46px;font-size:16px;border-radius:10px;padding:0 12px}' +
    '#songInfo{color:#888;font-size:13px;padding:2px 16px 8px}' +
    '#songList{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch}' +
    '.srow{padding:12px 16px;border-top:1px solid #1c1c1e}' +
    '.srow:active{background:#1c1c1e}' +
    '.srow b{display:block;font-size:15px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
    '.srow span{display:block;font-size:12px;color:#888;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}';
  document.head.appendChild(st);

  /* the big button on the main screen */
  var drop = q('#drop');
  var btn = document.createElement('button');
  btn.id = 'browseBtn';
  btn.textContent = 'Browse my songs';
  drop.parentNode.insertBefore(btn, drop);
  if (drop.lastChild && drop.lastChild.nodeType === 3) {
    drop.lastChild.nodeValue = "Or pick a file with the phone's Files app";
  }

  /* the song browser screen */
  var ov = document.createElement('div');
  ov.id = 'songOv';
  ov.hidden = true;
  ov.innerHTML =
    '<div class="sbar"><button id="songBack">Back</button><input id="songQ" type="search" placeholder="Search songs…" autocomplete="off"></div>' +
    '<div id="songInfo"></div><div id="songList"></div>';
  document.body.appendChild(ov);

  var info = q('#songInfo'), list = q('#songList'), qin = q('#songQ');
  var items = [], shown = [];

  function draw() {
    var tokens = qin.value.toLowerCase().split(/\s+/).filter(Boolean);
    var found = items.filter(function (it) {
      for (var i = 0; i < tokens.length; i++) {
        if (it.key.indexOf(tokens[i]) === -1) return false;
      }
      return true;
    });
    shown = found.slice(0, MAXROWS);
    var html = '';
    for (var i = 0; i < shown.length; i++) {
      var it = shown[i];
      html += '<div class="srow" data-i="' + i + '"><b>' + esc(it.name) + '</b><span>' + esc(it.artist || 'Unknown artist') + '</span></div>';
    }
    list.innerHTML = html;
    list.scrollTop = 0;
    info.textContent = found.length + ' songs' + (found.length > MAXROWS ? ' · showing the first ' + MAXROWS + ', type to narrow it down' : '');
  }

  async function openBrowse() {
    ov.hidden = false;
    info.textContent = 'Loading your songs…';
    list.innerHTML = '';
    try {
      var res = await lib.list();
      items = (res.items || []).map(function (x) {
        x.key = ((x.name || '') + ' ' + (x.artist || '')).toLowerCase();
        return x;
      });
      items.sort(function (a, b) {
        return (a.name || '').toLowerCase() < (b.name || '').toLowerCase() ? -1 : 1;
      });
      qin.value = '';
      draw();
    } catch (e) {
      info.textContent = 'Could not load songs: ' + (e && e.message ? e.message : e);
    }
  }

  async function pick(it) {
    qin.blur();
    info.textContent = 'Opening ' + it.name + '…';
    try {
      var r = await lib.copy({ id: it.id });
      var resp = await fetch(cap.convertFileSrc('file://' + r.path));
      if (!resp.ok) throw new Error('could not read the copied file');
      var blob = await resp.blob();
      var ext = ((it.name.match(/\.([^.]+)$/) || [])[1] || '').toLowerCase();
      var type = { mp3: 'audio/mpeg', flac: 'audio/flac', m4a: 'audio/mp4', mp4: 'audio/mp4', m4b: 'audio/mp4' }[ext] || blob.type || '';
      var file = new File([blob], it.name, { type: type });
      ov.hidden = true;
      load(file);
    } catch (e) {
      info.textContent = 'Could not open that song: ' + (e && e.message ? e.message : e);
    }
  }

  btn.onclick = openBrowse;
  q('#songBack').onclick = function () { ov.hidden = true; };
  qin.oninput = draw;
  list.onclick = function (e) {
    var row = e.target.closest ? e.target.closest('.srow') : null;
    if (!row) return;
    var it = shown[Number(row.getAttribute('data-i'))];
    if (it) pick(it);
  };
})();
