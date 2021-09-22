
// copy from webpack semver and used in runtime

/* eslint-disable eqeqeq */
function rangeToString(range) {
  var fixCount = range[0];
  var str = '';
  if (range.length === 1) {
    return '*';
  }

  if (fixCount + 0.5) {
    str +=
      fixCount == 0
        ? '>='
        : fixCount == -1
          ? '<'
          : fixCount == 1
            ? '^'
            : fixCount == 2
              ? '~'
              : fixCount > 0
                ? '='
                : '!=';
    var needDot = 1;
    // eslint-disable-next-line no-redeclare
    for (var i = 1; i < range.length; i++) {
      var item = range[i];
      var t = (typeof item)[0];
      needDot--;
      str +=
        t == 'u'
          ? // undefined: prerelease marker, add an "-"
          '-'
          : // number or string: add the item, set flag to add an "." between two of them
          (needDot > 0 ? '.' : '') + ((needDot = 2), item);
    }
    return str;
  }

  var stack = [];
  // eslint-disable-next-line no-redeclare
  for (var i = 1; i < range.length; i++) {
    // eslint-disable-next-line no-redeclare
    var item = range[i];
    stack.push(
      item === 0
        ? 'not(' + pop() + ')'
        : item === 1
          ? '(' + pop() + ' || ' + pop() + ')'
          : item === 2
            ? stack.pop() + ' ' + stack.pop()
            : rangeToString(item)
    );
  }
  return pop();

  function pop() {
    return stack.pop().replace(/^\((.+)\)$/, '$1');
  }
}
