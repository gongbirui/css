var commentre = /\/\*[^*]*\*+([^/*][^*]*\*+)*\//g;
module.exports = function (css, options) {
  options = options || {};

  var lineno = 1;
  var column = 1;

  var errorsList = [];

  function stylesheet() {
    var ruleList = rules();
    return {
      type: "stylesheet",
      stylesheet: {
        source: options.source,
        rules: ruleList,
        parsingErrors: errorsList,
      },
    };
  }
  // 获取规则
  function rules() {
    var node;
    var rules = [];
    whitespace();
    comments(rules);
    while (css.length && css.charAt(0) != "}" && (node = atrule() || rule())) {
      if (node != false) {
        rules.push(node);
        comment(rules);
      }
    }
    return rules;
  }
  // 祛除空白格子
  function whitespace() {
    match(/^\s*/);
  }
  // 匹配正则
  function match(re) {
    var m = re.exec(css);
    if (!m) return;
    var str = m[0];
    updatePosition(str);
    css = css.slice(str.length);
    return m;
  }
  // 更新位置
  function updatePosition(str) {
    var lines = str.match(/\n/g);
    if (lines) lineno += lines.length;
    var i = str.lastIndexOf("\n");
    column = ~i ? str.length - i : column + str.length;
  }
  // 获取评论
  function comments(rules) {
    var c;
    rules = rules || [];
    while ((c = comment())) {
      if (c !== false) {
        rules.push(c);
      }
    }
    return rules;
  }
  // 评论
  function comment() {
    var pos = position();
    if ("/" != css.charAt(0) || "*" != css.charAt(1)) return;

    var i = 2;
    while (
      "" != css.charAt(i) &&
      ("*" != css.charAt(i) || "/" != css.charAt(i + 1))
    )
      ++i;
    i += 2;
    if ("" === css.charAt(i - 1)) {
      return error("End of comment missing");
    }

    var str = css.slice(2, i - 2);
    column += 2;
    updatePosition(str);
    css = css.slice(i);
    column += 2;

    return pos({
      type: "comment",
      comment: str,
    });
  }
  // 追加位置
  function position() {
    var start = { line: lineno, column: column };
    return function (node) {
      node.position = new Position(start);
      whitespace();
      return node;
    };
  }
  // 位置对象
  function Position(start) {
    this.start = start;
    this.end = {};
  }
  Position.prototype.content = css;
  // 报错
  function error(msg) {
    var err = new Error(
      options.source + ":" + lineno + ":" + column + ": " + msg
    );
    err.reason = msg;
    err.filename = options.source;
    err.line = lineno;
    err.column = column;
    err.source = css;

    if (options.silent) {
      errorsList.push(err);
    } else {
      throw err;
    }
  }
  function atrule() {
    if (css[0] != "@") return;
    return (
      atkeyframes() ||
      atmedia() ||
      atcustommedia() ||
      atsupports() ||
      atimport() ||
      atcharset() ||
      atnamespace() ||
      atdocument() ||
      atpage() ||
      athost() ||
      atfontface()
    );
  }
  // 解析keyframes
  function atkeyframes() {
    var pos = position();
    var m = match(/^@([-\w]+)?keyframes\s*/);

    if (!m) return;
    var vendor = m[1];

    var m = match(/^([-\w]+)\s*/);
    if (!m) return error("@keyframes missing name");
    var name = m[1];

    if (!open()) return error("@keyframes missing '{'");

    var frame;
    var frames = comments();
    while ((frame = keyframe())) {
      frames.push(frame);
      frames = frames.concat(comments());
    }

    if (!close()) return error("@keyframes missing '}'");

    return pos({
      type: "keyframes",
      name: name,
      vendor: vendor,
      keyframes: frames,
    });
  }
  // 解析keyframes中的块
  function keyframe() {
    var m;
    var vals = [];
    var pos = position();

    while ((m = match(/^((\d+\.\d+|\.\d+|\d+)%?|[a-z]+)\s*/))) {
      vals.push(m[1]);
      match(/^,\s*/);
    }

    if (!vals.length) return;

    return pos({
      type: "keyframes",
      values: vals,
      declarations: declarations(),
    });
  }
  // 媒体查询
  function atmedia() {
    var pos = position();
    var m = match(/^@media *([^{]+)/);

    if (!m) return;
    var media = trim(m[1]);

    if (!open()) return error("@media missing '{'");

    var style = comments().concat(rules);

    if (!close()) return error("@media missing '}'");

    return pos({
      type: "media",
      media: media,
      rules: style,
    });
  }
  // 自定义媒体查询
  function atcustommedia() {
    var pos = position();
    var m = match(/^@custom-media\s+(--[^\s]+)\s*([^{;]+);/);
    if (!m) return;

    return pos({
      type: "custom-media",
      name: trim(m[1]),
      media: trim(m[2]),
    });
  }
  // 特征查询
  function atsupports() {
    var pos = position();
    var m = match(/^@supports *([^{]+)/);

    if (!m) return;
    var supports = trim(m[1]);

    if (!open()) return error("@supports missing '{'");

    var style = comments().concat(rules());

    if (!close()) return error("@supports missing '}'");

    return pos({
      type: "supports",
      supports: supports,
      rules: style,
    });
  }
  var atimport = _compileAtrule("import");
  var atcharset = _compileAtrule("charset");
  var atnamespace = _compileAtrule("namespace");

  function _compileAtrule(name) {
    var re = new RegExp("^@" + name + "\\s*([^;]+);");
    return function () {
      var pos = position();
      var m = match(re);
      if (!m) return;
      var ret = { type: name };
      ret[name] = m[1].trim();
      return pos(ret);
    };
  }
  function atdocument() {
    var pos = position();
    var m = match(/^@([-\w]+)?document *([^{]+)/);
    if (!m) return;

    var vendor = trim(m[1]);
    var doc = trim(m[2]);

    if (!open()) return error("@document missing '{'");

    var style = comments().concat(rules());

    if (!close()) return error("@document missing '{'");

    return pos({
      type: "document",
      document: doc,
      vendor: vendor,
      rules: style,
    });
  }
  // 打印设置
  function atpage() {
    var pos = position();
    var m = match(/^@page */);
    if (!m) return;

    var sel = selector() || [];

    if (!open()) return error("@page missing '{'");
    var decls = comments();

    // declarations
    var decl;
    while ((decl = declaration())) {
      decls.push(decl);
      decls = decls.concat(comments());
    }

    if (!close()) return error("@page missing '}'");

    return pos({
      type: "page",
      selectors: sel,
      declarations: decls,
    });
  }
  function athost() {
    var pos = position();
    var m = match(/^@host\s*/);

    if (!m) return;

    if (!open()) return error("@host missing '{'");

    var style = comments().concat(rules());

    if (!close()) return error("@host missing '}'");

    return pos({
      type: "host",
      rules: style,
    });
  }
  function atfontface() {
    var pos = position();
    var m = match(/^@font-face\s*/);
    if (!m) return;

    if (!open()) return error("@font-face missing '{'");
    var decls = comments();

    // declarations
    var decl;
    while ((decl = declaration())) {
      decls.push(decl);
      decls = decls.concat(comments());
    }

    if (!close()) return error("@font-face missing '}'");

    return pos({
      type: "font-face",
      declarations: decls,
    });
  }
  // 规则解析
  function rule() {
    var pos = position();
    var sel = selector();

    if (!sel) return error("selector missing");
    comments();

    return pos({
      type: "rule",
      selectors: sel,
      declarations: declarations(),
    });
  }
  // 解析选择器
  function selector() {
    var m = match(/^([^{]+)/);
    if (!m) return;

    return trim(m[0])
      .replace(/\/\*([^*]|[\r\n]|(\*+([^*/]|[\r\n])))*\*\/+/g, "")
      .replace(/"(?:\\"|[^"])*"|'(?:\\'|[^'])*'/g, function (m) {
        return m.replace(/,/g, "\u200C");
      })
      .split(/\s*(?![^(]*\)),\s*/)
      .map(function (s) {
        return s.replace(/\u200C/g, ",");
      });
  }
  // 祛除空格
  function trim(str) {
    return str ? str.replace(/^\s+|\s+$/g, "") : "";
  }
  // 遍历css属性设置
  function declarations() {
    var decls = [];

    if (!open()) return error("missing '{'");
    comments(decls);

    var decl;
    while ((decl = declaration())) {
      if (decl != false) {
        decls.push(decl);
        comments(decls);
      }
    }

    if (!close()) return error("missing '}'");
    return decls;
  }
  // { 开始
  function open() {
    return match(/^{\s*/);
  }
  // css属性设置
  function declaration() {
    var pos = position();

    // 属性
    var prop = match(/^(\*?[-#\/\*\\\w]+(\[[0-9a-z_-]+\])?)\s*/);
    if (!prop) return;
    prop = trim(prop[0]);
    // :
    if (!match(/^:\s*/)) return error("property missing ':'");

    // val
    var val = match(/^((?:'(?:\\'|.)*?'|"(?:\\"|.)*?"|\([^\)]*?\)|[^};])+)/);

    var ret = pos({
      type: "declaration",
      prototype: prop.replace(commentre, ""),
      value: val ? trim(val[0]).replace(commentre, "") : "",
    });

    // ;
    match(/^[;\s]*/);

    return ret;
  }
  // } 结束
  function close() {
    return match(/^}/);
  }
  // 子节点添加父节点
  function addParent(obj, parent) {
    var isNode = obj && typeof obj.type === "string";
    var childParent = isNode ? obj : parent;
    for (var k in obj) {
      var value = obj[k];
      if (Array.isArray(value)) {
        value.forEach(function (v) {
          addParent(value, childParent);
        });
      } else if (value && typeof value === "object") {
        addParent(value, childParent);
      }
    }

    if (isNode) {
      Object.defineProperty(obj, "parent", {
        configurable: true,
        writable: true,
        enumerable: false,
        value: parent || null,
      });
    }
    return obj;
  }
  let temp = stylesheet();
  return addParent(temp);
};
