(function () {
  var cap = window.Capacitor;
  if (!cap || !cap.isNativePlatform || !cap.isNativePlatform()) return;

  var FOLDER = 'Download/Audio Tag Editor';
  var originalClick = HTMLAnchorElement.prototype.click;

  HTMLAnchorElement.prototype.click = function () {
    var a = this;
    if (a.download && a.href && a.href.indexOf('blob:') === 0) {
      saveBlob(a.href, a.download);
      return;
    }
    return originalClick.apply(this, arguments);
  };

  function say(text, bad) {
    var m = document.getElementById('msg');
    if (!m) { alert(text); return; }
    var prev = m.textContent || '';
    if (!bad && prev.indexOf('Downloaded') === 0) {
      text = text + '\n' + prev.replace('Downloaded ✓ ', '');
    }
    m.textContent = text;
    m.className = bad ? 'err' : '';
  }

  async function saveBlob(url, name) {
    var base64;
    try {
      var blob = await (await fetch(url)).blob();
      base64 = await new Promise(function (resolve, reject) {
        var r = new FileReader();
        r.onload = function () { resolve(String(r.result).split(',')[1]); };
        r.onerror = reject;
        r.readAsDataURL(blob);
      });
    } catch (e) {
      say('Could not read the file: ' + (e && e.message ? e.message : e), true);
      return;
    }

    var safeName = name.replace(/[\\/:*?"<>|]/g, '_');
    var FS = cap.Plugins.Filesystem;

    try {
      try { await FS.requestPermissions(); } catch (e) {}
      await FS.writeFile({
        path: FOLDER + '/' + safeName,
        data: base64,
        directory: 'EXTERNAL_STORAGE',
        recursive: true
      });
      say('Saved ✓ Open your Files app → Download → Audio Tag Editor\n' + safeName);
    } catch (e) {
      try {
        var written = await FS.writeFile({ path: safeName, data: base64, directory: 'CACHE' });
        say('Could not save straight into Files, so the share sheet opened instead.');
        await cap.Plugins.Share.share({ title: safeName, url: written.uri, dialogTitle: 'Save ' + safeName });
      } catch (e2) {
        say('Could not save: ' + (e2 && e2.message ? e2.message : e2), true);
      }
    }
  }
})();
