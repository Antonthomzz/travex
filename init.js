import { Travex } from './dict/index.js';

var x = new Travex();

if (!('traverse' in Object.prototype)) {
   Object.defineProperty(Object.prototype, 'traverse', {
      value: function (pattern, options = {}) {
         return x.traverse(pattern, this, options);
      },
      writable: false,
      enumerable: false,
      configurable: true
   });
}

if (!('findall' in Object.prototype)) {
   Object.defineProperty(Object.prototype, 'findall', {
      value: function (pattern, options={}) {
         return x.search(pattern, this, options);
      },
      writable: false,
      enumerable: false,
      configurable: true
   });
}

var Meta = async (pattern=null, input=null, opt={}) => await x.meta(pattern, input, opt);
var Findall = async (pattern=null, input=null, opt={}) => await x.search(pattern, input, opt);
var Decode = async (input=null, opt={}) => await x.decode(input, opt);
var Traverse = (pattern=null, input=null, opt={}) => x.traverse(pattern, input, opt);

export default Travex;
export {
   Travex,
   Meta,
   Findall,
   Decode,
   Traverse
};