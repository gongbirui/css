var css = '';
var commentre = /\/\*[^*]*\*+([^/*][^*]*\*+)*\//g;
/**
 * Positional.
 */
var lineno = 1;
var column = 1;

function stylesheet() {
  var ruleList = rules();
}
// 获取规则
function rules() {
  var node;
  var rules = [];
  whitespace();
  comments(rules);
  while（css.length && css.charAt(0) != "}" && (node = atrule() || rule()))
}
// 祛除空白格子
function whitespace() {
  match(/^\s*/);
}
// 匹配正则
function match(re) {
  var m = re.exec(re);
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
    if( c !== false){
      rules.push(c)
    }
  }
  return rules;
}
// 评论
function comment() {
  var pos = position();
  if("/" != css.charAt(0) || "*" != css.charAt(1)) return;

  var i = 2;
  while(
    "" != css.charAt(i) && 
    ( "*" != css.charAt(i) || "/" != css.charAt( i + 1))
  )
    ++i;
  i += 2;
  if("" === css.charAt( i - 1)){
    return error("End of comment missing")
  }

  var str = css.slice(2, i - 2);
  column += 2;
  return pos({
    type:"comment",
    comment: str
  })
}
// 追加位置
function position() {
  var start = { line: lineno, column: column };
  return function (node) {
    node.position = new Position(start);
    whitespace();
    return node
  };
}
// 位置对象
function Position(start) {
  this.start = start;
  this.end = { }
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
// 
function atrule() {
  if(css[0] != "@") return;
  // todo 各种模式下的解析
  return true
}
// 规则解析
function rule() {
  var pos = position();
  var sel = selector();

  if(!sel) return error("selector missing");
  comments();

  return pos({
    type: "rule",
    selectors: sel,
    declarations: declarations()
  })
}
// 解析选择器
function selector() {
  var m = match(/^([^{]+)/);
  if(!m) return;

  return trim(m[0])
  .replace(/\/\*([^*]|[\r\n]|(\*+([^*/]|[\r\n])))*\*\/+/g,"")
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
  return str?str.replace(/^\s+|\s+$/g,"") : "";
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
  return decls
}
// { 开始
function open() {
  return match(/^{\s*/)
}
// css属性设置
function declaration() {
  var pos = position();

  // 属性
  var prop = match(/^(\*?[-#\/\*\\\w]+(\[[0-9a-z_-]+\])?)\s*/);
  if (!prop) return;

  // :
  if (!match(/^:\s*/)) return error("property missing ':'")
  
  // val
  var val = match(/^((?:'(?:\\'|.)*?'|"(?:\\"|.)*?"|\([^\)]*?\)|[^};])+)/);

  var ret = pos({
    type: "declaration",
    prototype: prop.replace(commentre, ""),
    value: val ? trim(val[0]).replace(commentre, "") : ""
  });

  // ;
  match(/^[;\s]*/)

  return ret;
}
// } 结束
function close() {
  return match(/^}/);
}
