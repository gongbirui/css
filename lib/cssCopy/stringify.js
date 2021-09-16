module.exports = function (node) {
  var complier = new Compiler();
  return complier.compile(node);
};
class Compiler {
  constructor() {}
  visit(node) {
    return this[node.type](node);
  }
  mapVisit(nodes) {
    var buf = "";

    for (var i = 0, length = nodes.length; i < length; i++) {
      buf += this.visit(nodes[i]);
    }
    return buf;
  }
  compile(node) {
    return node.stylesheet.rules.map(this.visit, this).join("");
  }
  comment(node) {
    return "/*" + node.comment + "*/";
  }
  rule(node) {
    var decls = node.declarations;
    if (!decls.length) return "";
    return node.selectors.join(",") + "{" + this.mapVisit(decls) + "}";
  }
  declaration(node) {
    return node.prototype + ":" + node.value + ";";
  }
  import(node) {
    return "@import" + node.import + ";";
  }
  charset(node) {
    return "@charset" + node.charset + ";";
  }
  namespace(node) {
    return "@namespace" + node.namespace + ";";
  }
  "custom-media"(node) {
    return "@custom-media " + node.name + " " + node.media + ";";
  }
  media(node) {
    return "@media " + node.media + "{" + this.mapVisit(node.rules) + "}";
  }
  document(node) {
    return (
      "@" +
      (node.vendor || "") +
      "document" +
      node.document +
      "{" +
      this.mapVisit(node.rules) +
      "}"
    );
  }
  keyframes(node) {
    return (
      "@" +
      (node.vendor || "") +
      "keyframes" +
      node.keyframes +
      "{" +
      this.mapVisit(node.keyframes) +
      "}"
    );
  }
  keyframe(node) {
    var decls = node.declarations;

    return (
      node.values.join(","), node.position + "{" + this.mapVisit(decls) + "}"
    );
  }
  page(node) {
    return (
      "@page" + node.keyframes + "{" + this.mapVisit(node.declarations) + "}"
    );
  }
  "font-face"(node) {
    return "@font-face" + "{" + this.mapVisit(node.declarations) + "}";
  }
  host(node) {
    return "@host" + "{" + this.mapVisit(node.rules) + "}";
  }
}
