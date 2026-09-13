(function (global) {
  "use strict";

  global.FocusArchivePlatform = {
    getMiniTool: function () {
      return global.xhs && global.xhs.miniTool ? global.xhs.miniTool : null;
    }
  };
})(window);
