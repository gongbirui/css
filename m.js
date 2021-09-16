const parse = require("./lib/cssCopy/parser");
const stringify = require("./lib/cssCopy/stringify");
let css = `
  list-style: none;
  li {
    list-style-image: none;
    list-style-type: none;
    margin-left: 0px;
  }
`;
let ast = parse(css);

let str = stringify(ast);
console.log(str);
