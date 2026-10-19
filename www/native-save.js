(function () {
  var cap = window.Capacitor;
  if (!cap || !cap.isNativePlatform || !cap.isNativePlatform()) return;

  var originalClick = HTMLAnchorElement.prototype.click;

  HTMLAnchorElement.prototype.click = function () {
    var a = this;
    if (a.download && a.href && a.href.indexOf('blob:') === 0) {
      saveBlob(a.href, a.download);
      return;
    }
    return originalClick.apply(this, arguments);
  };

  async function saveBlob(url, name) {
    try {
      var blob = await (await fetch(url)).blob();
      var base64 = await new Promise(function (resolve, reject) {
        var r = new FileReader();
        r.onload = function () { resolve(String(r.result).split(',')[1]); };
        r.onerror = reject;
        r.readAsDataURL(blob);
      });
      var written = await cap.Plugins.Filesystem.writeFile({
        path: name,
        data: base64,
        directory: 'CACHE'
      });
      await cap.Plugins.Share.share({
        title: name,
        url: written.uri,
        dialogTitle: 'Save ' + name
      });
    } catch (e) {
      alert('Could not save: ' + (e && e.message ? e.message : e));
    }
  }
})();
