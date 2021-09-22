/**
 * @file generate mf refs
 * @author liulangyu90316
 * @date 2021-09-15
 */

const RuntimeGlobals = require('webpack/lib/RuntimeGlobals');
const { consumeRuntimeTemplate } = require('./lib/template');
const { ConcatSource } = require("webpack-sources");

class MFReferencePlugin {
  apply(compiler) {
    compiler.hooks.thisCompilation.tap('MFReferencePlugin', (compilation) => {
      const uniqueName = compilation.outputOptions.uniqueName;

      const jsHooks = compiler.webpack.javascript.JavascriptModulesPlugin.getCompilationHooks(compilation);
      jsHooks.renderRequire.tap('MFReferencePlugin', code => {

        return `
          window.__MF_Share_Module_Call_Flow__ = window.__MF_Share_Module_Call_Flow__ || [];
          // record call stack
          if (/webpack\\/sharing\\/consume/i.test(arguments[0]) && arguments.length >= 2) {
            // Tricky.
            // During a time loop, shared module invoke ref will not change.
            Promise.resolve().then(() => {
              window.__MF_Share_Module_Call_Flow__.push({
                from: "${uniqueName}",
                moduleId: moduleId.split('/').pop().split('?')[0],
                sharedModuleId: moduleId,
                importedBy: arguments[1],
                sharedInfo: window.__MF_Share_Module_Handler_Mapping__["${uniqueName}"][moduleId]
              });
            });
          }
          ${code}\n
        `;
      });

      jsHooks.renderModuleContent.tap('MFReferencePlugin', (source, module) => {
        const hasUsedSharedModule = Array.from(compilation.moduleGraph.getOutgoingConnections(module))
          .find(e => e.module.constructor.name === 'ConsumeSharedModule');

        if (!hasUsedSharedModule || !source._source) {
          return source;
        }

        // require commonjs
        if (source._source.constructor.name === 'ReplaceSource') {
          source._source._replacements = source._source._replacements.map(e => {
            if (e.content && /webpack\/sharing\/consume/.test(e.content)) {
              e.content = e.content + ', ' + '"' + module.userRequest + '"';
            }

            return e;
          });
        }

        // esm import
        if (source._source.constructor.name === 'ConcatSource') {
          const firstChild = source._source._children[0];
          if (!(firstChild
            && firstChild.constructor.name === 'ConcatSource'
            && firstChild.source()
            && firstChild.source().indexOf('oldWebpackRequire')
          )) {
            source._source._children.unshift(new ConcatSource(`
              var oldWebpackRequire = __webpack_require__;
              __webpack_require__ = function (moduleId) {
                return oldWebpackRequire.call(this, moduleId, "${module.userRequest}");
              };

              for (var k in oldWebpackRequire) {
                if (oldWebpackRequire.hasOwnProperty(k)) {
                  __webpack_require__[k] = oldWebpackRequire[k];
                }
              }
            `));
          }
        }

        return source;
      });

      // Add rewrite code
      compilation.hooks.runtimeModule.tap('MFReferencePlugin', (module, chunk) => {
        const moduleType = module.constructor.name;

        // Any other cases？
        // It will rewrite __webpack_require__, so we will add second argument to it again.
        if (moduleType === 'HotModuleReplacementRuntimeModule') {
          let generatedCode = module.getGeneratedCode();

          if (!generatedCode) {
            return module;
          }

          if (/function createRequire\(require, moduleId\)/i.test(generatedCode)) {
            module._cachedGeneratedCode = generatedCode.replace(
              'return require(request)',
              'return require(request, arguments[1])'
            );
          }

          return module;
        }


        if (moduleType === 'ConsumeSharedRuntimeModule') {
          const hasAsyncChunks = chunk.hasAsyncChunks();
          if (hasAsyncChunks) {
            module._runtimeRequirements.add(RuntimeGlobals.ensureChunkHandlers);
          }

          let generatedCode = module.getGeneratedCode();

          if (!generatedCode) {
            return module;
          }

          // Very tricky!
          // Do some replace，pass moduleId to handle function.
          // Avoid using caller / callee.
          generatedCode = generatedCode.replace(/("webpack\/sharing\/consume.*")(:.*load[^()]*\()/ig, '$1$2$1, ');

          module._cachedGeneratedCode = `
            const __MF_Current_Project__ = "${uniqueName}";\n

            ${generatedCode} \n
            ${consumeRuntimeTemplate.join('\n')}\n
          `;

          return module;
        }
      });
    });
  }
}

module.exports = MFReferencePlugin;
