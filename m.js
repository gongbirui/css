const parse = require("./lib/parse")
let css = `
.a #abl,
.b{
  /* 123 */
  *overflow-x: hidden;
  //max-height: 110px;
  #height: 18px;

}
.c{
  color:red;
}
  `
let tmp = parse(css)
console.log(tmp);
