(function () {
  var RATIOS = [['Custom', 0], ['1:1', 1], ['4:3', 4 / 3], ['3:4', 3 / 4], ['16:9', 16 / 9], ['9:16', 9 / 16], ['3:2', 3 / 2], ['2:3', 2 / 3], ['5:4', 5 / 4], ['4:5', 4 / 5], ['21:9', 21 / 9]];
  var MIN = 40;
  var q = function (s) { return document.querySelector(s); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

  /* small wording tweak on the file picker box */
  var dropEl = q('#drop');
  if (dropEl && dropEl.lastChild && dropEl.lastChild.nodeType === 3) {
    dropEl.lastChild.nodeValue = 'Tap to choose an audio file';
  }

  /* make the phone's file picker fast: ask for plain "audio" only */
  var fileIn = q('#file');
  if (fileIn) fileIn.setAttribute('accept', 'audio/*');

  /* crop screen */
  var ov = document.createElement('div');
  ov.id = 'cropOv';
  ov.hidden = true;
  var handles = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].map(function (h) {
    return '<i class="hd ' + h + '" data-h="' + h + '"></i>';
  }).join('');
  ov.innerHTML =
    '<div class="cbar"><button id="cropCancel">Cancel</button><b>Crop cover</b><button id="cropOk" class="ok">Apply</button></div>' +
    '<div id="cropArea"><div id="cropStage"><img id="cropImg" alt=""><div id="cropBox" class="free">' + handles + '</div></div></div>' +
    '<div id="cropHint"></div><div id="cropRatios"></div>';
  document.body.appendChild(ov);

  var img = q('#cropImg'), stage = q('#cropStage'), box = q('#cropBox'), hint = q('#cropHint'), rb = q('#cropRatios');
  var url = null, dw = 0, dh = 0, sc = 1, ratio = 0;
  var r = { x: 0, y: 0, w: 0, h: 0 };
  var drag = null;

  RATIOS.forEach(function (x, i) {
    var b = document.createElement('button');
    b.className = 'chip';
    b.textContent = x[0];
    b.onclick = function () { setRatio(x[1], i); };
    rb.appendChild(b);
  });

  function paint() {
    box.style.left = r.x + 'px';
    box.style.top = r.y + 'px';
    box.style.width = r.w + 'px';
    box.style.height = r.h + 'px';
    hint.textContent = 'Crop size: ' + Math.round(r.w * sc) + ' × ' + Math.round(r.h * sc) + ' px';
  }

  function setRatio(v, idx) {
    ratio = v;
    Array.prototype.forEach.call(rb.children, function (b, j) { b.classList.toggle('on', j === idx); });
    box.classList.toggle('free', !v);
    if (v) {
      var w = Math.min(dw, dh * v), h = w / v;
      r = { x: (dw - w) / 2, y: (dh - h) / 2, w: w, h: h };
    } else if (!r.w) {
      r = { x: 0, y: 0, w: dw, h: dh };
    }
    paint();
  }

  function openCrop() {
    var c = curCover();
    if (!c) return;
    ov.hidden = false;
    if (url) URL.revokeObjectURL(url);
    url = URL.createObjectURL(new Blob([c.data], { type: c.mime }));
    img.onload = function () {
      var area = q('#cropArea');
      var aw = area.clientWidth - 40, ah = area.clientHeight - 40;
      var s = Math.min(aw / img.naturalWidth, ah / img.naturalHeight);
      dw = img.naturalWidth * s;
      dh = img.naturalHeight * s;
      sc = img.naturalWidth / dw;
      stage.style.width = dw + 'px';
      stage.style.height = dh + 'px';
      r = { x: 0, y: 0, w: 0, h: 0 };
      setRatio(0, 0);
    };
    img.src = url;
  }

  function closeCrop() {
    ov.hidden = true;
    if (url) { URL.revokeObjectURL(url); url = null; }
  }

  box.addEventListener('pointerdown', function (e) {
    var t = (e.target && e.target.getAttribute && e.target.getAttribute('data-h')) || 'move';
    drag = { t: t, x: e.clientX, y: e.clientY, r: { x: r.x, y: r.y, w: r.w, h: r.h } };
    try { box.setPointerCapture(e.pointerId); } catch (_) {}
    e.preventDefault();
  });

  box.addEventListener('pointermove', function (e) {
    if (!drag) return;
    var dx = e.clientX - drag.x, dy = e.clientY - drag.y, o = drag.r, t = drag.t;
    if (t === 'move') {
      r = { x: clamp(o.x + dx, 0, dw - o.w), y: clamp(o.y + dy, 0, dh - o.h), w: o.w, h: o.h };
    } else if (ratio) {
      var west = t.indexOf('w') > -1, north = t.indexOf('n') > -1;
      var ax = west ? o.x + o.w : o.x, ay = north ? o.y + o.h : o.y;
      var px = (west ? o.x : o.x + o.w) + dx, py = (north ? o.y : o.y + o.h) + dy;
      var w = Math.max(Math.abs(px - ax), Math.abs(py - ay) * ratio);
      var maxW = Math.min(west ? ax : dw - ax, (north ? ay : dh - ay) * ratio);
      w = Math.max(MIN, Math.min(w, maxW));
      var h = w / ratio;
      r = { x: west ? ax - w : ax, y: north ? ay - h : ay, w: w, h: h };
    } else {
      var L = o.x, T = o.y, R = o.x + o.w, B = o.y + o.h;
      if (t.indexOf('w') > -1) L = clamp(o.x + dx, 0, R - MIN);
      if (t.indexOf('e') > -1) R = clamp(R + dx, L + MIN, dw);
      if (t.indexOf('n') > -1) T = clamp(o.y + dy, 0, B - MIN);
      if (t.indexOf('s') > -1) B = clamp(B + dy, T + MIN, dh);
      r = { x: L, y: T, w: R - L, h: B - T };
    }
    paint();
  });

  function endDrag() { drag = null; }
  box.addEventListener('pointerup', endDrag);
  box.addEventListener('pointercancel', endDrag);

  q('#cropCancel').onclick = closeCrop;

  q('#cropOk').onclick = async function () {
    try {
      var c = curCover();
      var bmp = await createImageBitmap(new Blob([c.data], { type: c.mime }));
      var sx = Math.max(0, Math.round(r.x * sc)), sy = Math.max(0, Math.round(r.y * sc));
      var sw = Math.max(1, Math.min(bmp.width - sx, Math.round(r.w * sc)));
      var sh = Math.max(1, Math.min(bmp.height - sy, Math.round(r.h * sc)));
      var cv = document.createElement('canvas');
      cv.width = sw; cv.height = sh;
      var g = cv.getContext('2d');
      g.fillStyle = '#000'; g.fillRect(0, 0, sw, sh);
      g.drawImage(bmp, sx, sy, sw, sh, 0, 0, sw, sh);
      var blob = await new Promise(function (res) { cv.toBlob(res, 'image/jpeg', 0.95); });
      if (!blob) throw new Error('encode failed');
      var data = new Uint8Array(await blob.arrayBuffer());
      var out = await shrinkCover(data, 'image/jpeg');
      S.cover = { state: 'new', orig: S.cover.orig, mime: out.mime, data: out.data };
      closeCrop();
      renderCover();
      msg('Cover cropped to ' + out.w + '×' + out.h + '. The audio is untouched. Tap "Download edited file" to put the new cover into the song.');
    } catch (err) {
      msg('Could not crop that cover.', 'err');
    }
  };

  /* the new "Crop cover" button */
  var btn = document.createElement('button');
  btn.id = 'coverCrop';
  btn.textContent = 'Crop cover';
  btn.disabled = true;
  var saveBtn = q('#coverSave');
  saveBtn.parentNode.insertBefore(btn, saveBtn);
  btn.onclick = openCrop;

  var oldRender = renderCover;
  renderCover = function () {
    oldRender.apply(this, arguments);
    btn.disabled = !curCover();
  };
})();
