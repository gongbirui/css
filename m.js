const parse = require("./lib/cssCopy/parser");
const stringify = require("./lib/cssCopy/stringify");
let css = `
body {
  color: #333; // 这种注释内容不会出现在生成的css文件中
  padding: 0; /* 这种注释内容会出现在生成的css文件中 */
}
`;
let ast = parse(css);

let str = stringify(ast);
console.log(str);
