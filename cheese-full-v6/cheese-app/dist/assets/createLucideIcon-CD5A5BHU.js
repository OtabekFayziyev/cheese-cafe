import{r as a}from"./index-Rca75CV1.js";function d(t){var e,o,r="";if(typeof t=="string"||typeof t=="number")r+=t;else if(typeof t=="object")if(Array.isArray(t)){var s=t.length;for(e=0;e<s;e++)t[e]&&(o=d(t[e]))&&(r&&(r+=" "),r+=o)}else for(o in t)t[o]&&(r&&(r+=" "),r+=o);return r}function $(){for(var t,e,o=0,r="",s=arguments.length;o<s;o++)(t=arguments[o])&&(e=d(t))&&(r&&(r+=" "),r+=e);return r}/**
 * @license lucide-react v1.16.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const h=(...t)=>t.filter((e,o,r)=>!!e&&e.trim()!==""&&r.indexOf(e)===o).join(" ").trim();/**
 * @license lucide-react v1.16.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const b=t=>t.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase();/**
 * @license lucide-react v1.16.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const y=t=>t.replace(/^([A-Z])|[\s-_]+(\w)/g,(e,o,r)=>r?r.toUpperCase():o.toLowerCase());/**
 * @license lucide-react v1.16.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const f=t=>{const e=y(t);return e.charAt(0).toUpperCase()+e.slice(1)};/**
 * @license lucide-react v1.16.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var i={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};/**
 * @license lucide-react v1.16.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const v=t=>{for(const e in t)if(e.startsWith("aria-")||e==="role"||e==="title")return!0;return!1},L=a.createContext({}),W=()=>a.useContext(L),S=a.forwardRef(({color:t,size:e,strokeWidth:o,absoluteStrokeWidth:r,className:s="",children:n,iconNode:m,...l},p)=>{const{size:c=24,strokeWidth:u=2,absoluteStrokeWidth:C=!1,color:x="currentColor",className:g=""}=W()??{},w=r??C?Number(o??u)*24/Number(e??c):o??u;return a.createElement("svg",{ref:p,...i,width:e??c??i.width,height:e??c??i.height,stroke:t??x,strokeWidth:w,className:h("lucide",g,s),...!n&&!v(l)&&{"aria-hidden":"true"},...l},[...m.map(([k,A])=>a.createElement(k,A)),...Array.isArray(n)?n:[n]])});/**
 * @license lucide-react v1.16.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const j=(t,e)=>{const o=a.forwardRef(({className:r,...s},n)=>a.createElement(S,{ref:n,iconNode:e,className:h(`lucide-${b(f(t))}`,`lucide-${t}`,r),...s}));return o.displayName=f(t),o};export{j as a,$ as c};
