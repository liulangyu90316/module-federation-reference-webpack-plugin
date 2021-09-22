/**
 * @file for rewrite consume runtime
 * @author liulangyu90316
 * @date 2021-09-16
 */

// @see webpack/lib/sharing/ConsumeSharedRuntimeModule.js
const consumeRuntimeTemplate = [
  `
    "use strict";
    window.__MF_Share_Module_Registered__ = __webpack_require__.S;
    window.__MF_Share_Module_Handler_Mapping__ = window.__MF_Share_Module_Handler_Mapping__ || {};
    window.__MF_Share_Module_Handler_Mapping__[__MF_Current_Project__] = window.__MF_Share_Module_Handler_Mapping__[__MF_Current_Project__] || {};
  `,
  `var findShareVersionByEntry = function (scope, key, entry) {
    var versions = scope[key];
    // object compare
    return Object.keys(versions).find(v => versions[v] === entry);
  };`,
  `var getFallbackModulePath = function (fallback) {
    var match = fallback.toString().match(/__webpack_require__\\(.*"(.*)"\\)/);
    return match && match[1];
  };`,
  `
  // save ref to map
  var saveRef = function (ref, options) {
    var defaultRef = {
      status: 'success',
      scopeName: options.scopeName || 'default',
      key: options.key,
      requiredVersion: rangeToString(options.requiredVersion || [0]),
      fallbackModulePath: getFallbackModulePath(options.fallback || '')
    };

    const shareModule = ref.shareModule;
    if (shareModule) {
      ref.shareModule = {
        from: shareModule.from,
        eager: shareModule.eager,
        fallbackModulePath: getFallbackModulePath(shareModule.get.toString())
      };
    }

    window.__MF_Share_Module_Handler_Mapping__[__MF_Current_Project__][options.moduleId] = Object.assign(defaultRef, ref);
  };

  // LoadVersionCheck and LoadVersionCheckFallback
  var dealRefForLoadVersionCheck = function (moduleId, scopeName, key, requiredVersion, fallback) {
    var scope = __webpack_require__.S[scopeName];
    var ref = {};

    // ensureExistence
    if (scope && __webpack_require__.o(scope, key)) {
      var entry = findValidVersion(scope, key, requiredVersion);
      if (!entry) {
        ref.status = 'warn';
        ref.msg = getInvalidVersionMessage(scope, scopeName, key, requiredVersion);
        entry = findVersion(scope, key);
      }

      ref.useShareModule = true;
      ref.shareModule = entry;
      ref.usedVersion = findShareVersionByEntry(scope, key, entry);
    } else {
      if (fallback) {
        ref.useShareModule = false;
      } else {
        ref.status = 'error';
      }
    }

    saveRef(ref, {
      scopeName,
      key,
      requiredVersion,
      fallback,
      moduleId
    });
  };

  // LoadStrictVersionCheck and LoadStrictVersionCheckFallback
  var dealForLoadStrictVersionCheck = function (moduleId, scopeName, key, requiredVersion, fallback) {
    var scope = __webpack_require__.S[scopeName];
    var ref = {};

    var entry = scope && __webpack_require__.o(scope, key) && findValidVersion(scope, key, requiredVersion);
    if (entry) {
      ref.useShareModule = true;
      ref.shareModule = entry;
      ref.usedVersion = findShareVersionByEntry(scope, key, entry);
    } else {
      if (fallback) {
        ref.useShareModule = false;
      } else {
        ref.status = 'error';
      }
    }

    saveRef(ref, {
      scopeName,
      key,
      requiredVersion,
      fallback,
      moduleId
    });
  };

  // LoadStrictSingletonVersionCheck and LoadStrictSingletonVersionCheckFallback
  var dealForLoadStrictSingletonVersionCheck = function (moduleId, scopeName, key, requiredVersion, fallback) {
    var scope = __webpack_require__.S[scopeName];
    var ref = {};

    var version = scope && __webpack_require__.o(scope, key) && findSingletonVersionKey(scope, key);

    if (version) {
      if (satisfy(requiredVersion, version)) {
        ref.useShareModule = true;
        ref.shareModule = scope[key][version];
        ref.usedVersion = version;
      } else {
        // will throw Error
        ref.status = 'error';
      }
    } else {
      if (fallback) {
        ref.useShareModule = false;
      } else {
        ref.status = 'error';
      }
    }

    saveRef(ref, {
      scopeName,
      key,
      requiredVersion,
      fallback,
      moduleId
    });
  };

  // LoadStrictSingletonVersionCheck and LoadStrictSingletonVersionCheckFallback
  var dealForLoadSingletonVersionCheck = function (moduleId, scopeName, key, requiredVersion, fallback) {
    var scope = __webpack_require__.S[scopeName];
    var ref = {};

    var version = scope && __webpack_require__.o(scope, key) && findSingletonVersionKey(scope, key);

    if (version) {
      ref.useShareModule = true;
      ref.shareModule = scope[key][version];
      ref.usedVersion = version;

      if (!satisfy(requiredVersion, version)) {
        ref.status = 'warn';
        ref.msg = getInvalidSingletonVersionMessage(key, version, requiredVersion);
      }
    } else {
      if (fallback) {
        // use fallback
        ref.useShareModule = false;
      }
      else {
        ref.status = 'error';
      }
    }

    saveRef(ref, {
      scopeName,
      key,
      requiredVersion,
      fallback,
      moduleId
    });
  };

  // Load and LoadFallback
  var dealForLoad = function (moduleId, scopeName, key, fallback) {
    var scope = __webpack_require__.S[scopeName];
    var ref = {};

    var entry = scope && __webpack_require__.o(scope, key) && findVersion(scope, key);

    if (entry) {
      ref.useShareModule = true;
      ref.shareModule = entry;
      ref.usedVersion = findShareVersionByEntry(scope, key, entry);
    }
    else {
      if (fallback) {
        // use fallback
        ref.useShareModule = false;
      } else {
        ref.status = 'error';
      }
    }

    saveRef(ref, {
      scopeName,
      key,
      fallback,
      moduleId
    });
  };
  `,

  `
  // rewrite loadStrictVersionCheckFallback
  var oldLoadStrictVersionCheckFallback = loadStrictVersionCheckFallback;
  loadStrictVersionCheckFallback = function (moduleId, scopeName, key, requiredVersion, fallback) {
    var oldRet = oldLoadStrictVersionCheckFallback.apply(this, Array.from(arguments).slice(1));

    dealForLoadStrictVersionCheck.apply(this, arguments);

    return oldRet;
  };

  // rewrite loadStrictVersionCheck
  var oldLoadStrictVersionCheck = loadStrictVersionCheck;
  loadStrictVersionCheck = function (moduleId, scopeName, key, requiredVersion) {
    var oldRet = oldLoadStrictVersionCheck.apply(this, Array.from(arguments).slice(1));

    dealForLoadStrictVersionCheck.apply(this, arguments);

    return oldRet;
  };

  // rewrite loadStrictSingletonVersionCheckFallback
  var oldLoadStrictSingletonVersionCheckFallback = loadStrictSingletonVersionCheckFallback;
  loadStrictSingletonVersionCheckFallback = function (moduleId, scopeName, key, requiredVersion, fallback) {
    var oldRet = oldLoadStrictSingletonVersionCheckFallback.apply(this, Array.from(arguments).slice(1));

    dealForLoadStrictSingletonVersionCheck.apply(this, arguments);

    return oldRet;
  };


  // rewrite loadStrictSingletonVersionCheck
  var oldLoadStrictSingletonVersionCheck = loadStrictSingletonVersionCheck;
  loadStrictSingletonVersionCheck = function (moduleId, scopeName, key, requiredVersion) {
    var oldRet = oldLoadStrictSingletonVersionCheck.apply(this, Array.from(arguments).slice(1));

    dealForLoadStrictSingletonVersionCheck.apply(this, arguments);

    return oldRet;
  };

  // rewrite loadSingletonVersionCheckFallback
  var oldLoadSingletonVersionCheckFallback = loadSingletonVersionCheckFallback;
  loadSingletonVersionCheckFallback = function (moduleId, scopeName, key, requiredVersion, fallback) {
    var oldRet = oldLoadSingletonVersionCheckFallback.apply(this, Array.from(arguments).slice(1));

    dealForLoadSingletonVersionCheck.apply(this, arguments);

    return oldRet;
  };

  // rewrite loadSingletonVersionCheck
  var oldLoadSingletonVersionCheck = loadSingletonVersionCheck;
  loadSingletonVersionCheck = function (moduleId, scopeName, key, requiredVersion) {
    var oldRet = oldLoadSingletonVersionCheck.apply(this, Array.from(arguments).slice(1));

    dealForLoadSingletonVersionCheck.apply(this, arguments);

    return oldRet;
  };

  // rewrite loadVersionCheckFallback
  var oldLoadVersionCheckFallback = loadVersionCheckFallback;
  loadVersionCheckFallback = function (moduleId, scopeName, key, requiredVersion, fallback) {
    var oldRet = oldLoadVersionCheckFallback.apply(this, Array.from(arguments).slice(1));

    dealRefForLoadVersionCheck.apply(this, arguments);

    return oldRet;
  };

  // rewrite loadVersionCheck
  var oldLoadVersionCheck = loadVersionCheck;
  loadVersionCheck = function (moduleId, scopeName, key, requiredVersion) {
    var oldRet = oldLoadVersionCheck.apply(this, Array.from(arguments).slice(1));

    dealRefForLoadVersionCheck.apply(this, arguments);

    return oldRet;
  };

  // rewrite loadFallback
  var oldLoadFallback = loadFallback;
  loadFallback = function (moduleId, scopeName, key, fallback) {
    var oldRet = oldLoadFallback.apply(this, Array.from(arguments).slice(1));

    dealForLoad.apply(this, arguments);

    return oldRet;
  };

  // rewrite load
  var oldLoad = load;
  load = function (moduleId, scopeName, key) {
    var oldRet = oldLoad.apply(this, Array.from(arguments).slice(1));

    dealForLoad.apply(this, arguments);

    return oldRet;
  };
  `
];

module.exports = { consumeRuntimeTemplate };
