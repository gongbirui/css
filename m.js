const CSS = require("./lib/cssCopy");
let css = `
@import url("fineprint.css") print;
body {
  colors:red;
  font-size:10px;
  .disabled {
    color: gray;
    @extend .a; /*111*/
  }
  @include link-colors(
    $normal: blue,
    $visited: green,
    $hover: red
  );
  @mixin link-colors($normal, $hover, $visited) {
    color: $normal;
    &:hover { color: $hover; }
    &:visited { color: $visited; }
  }
}

`;
let ast = CSS.parse(css);

let str = CSS.stringify(ast);
console.log(str);
