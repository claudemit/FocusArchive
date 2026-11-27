(function (global) {
  "use strict";

  var root = global.document.documentElement;
  var clientVersion = null;
  var versionRequest;
  var refreshTimer;
  var windowRequestId = 0;

  function getMiniTool() {
    return global.xhs && global.xhs.miniTool ? global.xhs.miniTool : null;
  }

  function readClientVersion(options) {
    var env = options && options.miniToolEnv;
    var value = env && env.buildVersion;
    if ((typeof value !== "number" && typeof value !== "string") || !/^[1-9]\d{6,}$/.test(String(value))) return null;
    var build = Number(value);
    return Number.isSafeInteger(build) ? Math.floor(build / 1000) : null;
  }

  function getClientVersion() {
    return readClientVersion(global.xhs && global.xhs.launchOptions) || clientVersion;
  }

  function requestClientVersion(miniTool) {
    var current = getClientVersion();
    if (current !== null || typeof miniTool.getLaunchOptions !== "function") return Promise.resolve(current);
    if (!versionRequest) {
      versionRequest = Promise.resolve().then(function () { return miniTool.getLaunchOptions(); })
        .then(function (options) { clientVersion = readClientVersion(options); }, function () {})
        .then(function () {
          versionRequest = null;
          if (clientVersion !== null) global.dispatchEvent(new Event("focusarchive:host-capabilities"));
          return clientVersion;
        });
    }
    return versionRequest;
  }

  function isVisibleRect(rect) {
    return rect && Number.isFinite(rect.left) && Number.isFinite(rect.right) &&
      Number.isFinite(rect.top) && Number.isFinite(rect.bottom) &&
      rect.width > 0 && rect.height > 0 && rect.right > rect.left && rect.bottom > rect.top;
  }

  function applyWindowInfo(info, version) {
    if (!info || !Number.isFinite(info.windowWidth) || info.windowWidth <= 0) return;
    var safe = info.safeArea || {};
    var safeTop = Number.isFinite(safe.top) ? Math.max(0, safe.top) : 0;
    var menu = info.menuButtons || {};
    var buttons = version >= 9550 && isVisibleRect(menu.capsule)
      ? [menu.capsule] : [menu.back, menu.me, menu.share].filter(isVisibleRect);
    if (Number.isFinite(safe.top)) root.style.setProperty("--safe-area-inset-top", safeTop + "px");
    if (Number.isFinite(info.windowHeight) && Number.isFinite(safe.bottom) && safe.bottom > 0) {
      root.style.setProperty("--safe-area-inset-bottom", Math.max(0, info.windowHeight - safe.bottom) + "px");
    }
    if (buttons.length) {
      var bottom = buttons.reduce(function (max, rect) { return Math.max(max, rect.bottom); }, safeTop);
      var top = Math.max(safeTop, Math.min.apply(null, buttons.map(function (rect) { return rect.top; })));
      var center = info.windowWidth / 2;
      var side = buttons.reduce(function (max, rect) {
        if (rect.right <= center) return Math.max(max, rect.right + 4);
        if (rect.left >= center) return Math.max(max, info.windowWidth - rect.left + 4);
        return center;
      }, 0);
      root.style.setProperty("--host-top-minimum", bottom + "px");
      root.style.setProperty("--host-navigation-height", Math.max(0, bottom - top) + "px");
      root.style.setProperty("--host-navigation-side-space", Math.min(side, center) + "px");
      root.classList.add("mini-tool-window-measured");
    }
    global.dispatchEvent(new Event("focusarchive:host-layout"));
  }

  async function refreshWindowInfo() {
    var miniTool = getMiniTool();
    if (!miniTool) return;
    var requestId = ++windowRequestId;
    var version = await requestClientVersion(miniTool);
    if (requestId !== windowRequestId || version === null || version < 9490 ||
      typeof miniTool.getWindowInfo !== "function") return;
    try {
      var info = await miniTool.getWindowInfo();
      if (requestId === windowRequestId) applyWindowInfo(info, version);
    } catch (error) {
      // Keep the most recent layout when the host cannot supply a new snapshot.
    }
  }

  function markMiniToolHost() {
    if (!getMiniTool()) return false;
    root.classList.add("mini-tool-host");
    var version = getClientVersion();
    var options = global.xhs.launchOptions;
    if (version >= 9490 && options && options.miniToolEnv) applyWindowInfo(options.miniToolEnv.windowInfo, version);
    refreshWindowInfo();
    return true;
  }

  if (!markMiniToolHost() && global.matchMedia("(pointer: coarse)").matches) {
    // The host can inject its bridge after the page scripts have run.
    var remainingChecks = 20;
    var bridgeCheck = global.setInterval(function () {
      if (markMiniToolHost()) {
        global.clearInterval(bridgeCheck);
        global.dispatchEvent(new Event("focusarchive:host-layout"));
        global.dispatchEvent(new Event("focusarchive:host-capabilities"));
      } else if (--remainingChecks === 0) {
        global.clearInterval(bridgeCheck);
      }
    }, 250);
  }

  global.addEventListener("pageshow", refreshWindowInfo);
  global.addEventListener("resize", function () {
    global.clearTimeout(refreshTimer);
    refreshTimer = global.setTimeout(refreshWindowInfo, 120);
  });

  global.FocusArchivePlatform = { getMiniTool: getMiniTool, getClientVersion: getClientVersion };
})(window);
