# module-federation-reference-webpack-plugin

generate module references for webpack module federation

# Getting Started

To begin, you'll need to install module-federation-reference-webpack-plugin:

```console
npm install module-federation-reference-webpack-plugin --save-dev
```

**webpack.config.js**

```js
const MFReferencePlugin = require("module-federation-reference-webpack-plugin");

module.exports = {
  // ...
  plugins: [
    new MFReferencePlugin()
  ]
};
```

**start project and get module invoke data from window**

```js
console.log(window.__MF_Share_Module_Call_Flow__);
```

**Result**

```json
[
  {
    // Module called from which Container / APP.
    from: "@dynamic-remotes/app",
    // Share Module Id required by (original module file).
    importedBy: "/path-to/src/bootstrap.js",
    // Original require / import module id.
    moduleId: "isarray",
    // Transformed Share Module Id.
    sharedModuleId: "webpack/sharing/consume/default/isarray/isarray?d016",
    // Used Share Module info.
    sharedInfo: {
      // status - success: Used Share Module or Fallback without errors or warnings.
      // status - warn: Used Share Module with unmatched version.
      // status - error: Coundn't use shared Module and Fallback correctly.
      status: "success",
      // Original Share Module Id.
      key: "isarray",
      // Share scope name.
      scopeName: "default",
      // Version that we need.
      requiredVersion: "*",
      // If we really used share Module
      useShareModule: true,
      // If we used share module, this is the version we use.
      usedVersion: "2.0.5",
      // Instead of using share module, we use local fallback module.
      fallbackModulePath: "./node_modules/isarray/index.js",
      // Other info for registered share module that we currently used.
      shareModule: {
        from: "@dynamic-remotes/app",
        eager: false,
        // Local module path for registered share moudule.
        fallbackModulePath: "./node_modules/isarray/index.js"
      }
    }
  },
  {
    from: "@dynamic-remotes/app",
    importedBy: "/path-to/node_modules/test-dep-d/index.js",
    moduleId: "isarray",
    sharedModuleId: "webpack/sharing/consume/default/isarray/isarray?e0e3",
    sharedInfo: {
      status: "success",
      key: "isarray",
      scopeName: "default",
      requiredVersion: "^2.0.3",
      useShareModule: true,
      usedVersion: "2.0.5",
      fallbackModulePath: "./node_modules/isarray/index.js",
      shareModule: {
        from: "@dynamic-remotes/app",
        eager: false,
        fallbackModulePath: "./node_modules/isarray/index.js"
      }
    }
  }
]
```
