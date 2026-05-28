import{l as w,k as N,u as m,n as y,h as g,j as a}from"./index-Rca75CV1.js";import{a as r,c as _}from"./createLucideIcon-CD5A5BHU.js";/**
 * @license lucide-react v1.16.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const k=[["path",{d:"M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5",key:"mvr1a0"}]],A=r("heart",k);/**
 * @license lucide-react v1.16.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const I=[["path",{d:"M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8",key:"5wwlr5"}],["path",{d:"M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",key:"r6nss1"}]],b=r("house",I);/**
 * @license lucide-react v1.16.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const L=[["path",{d:"m21 21-4.34-4.34",key:"14j7rj"}],["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}]],C=r("search",L);/**
 * @license lucide-react v1.16.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const H=[["circle",{cx:"8",cy:"21",r:"1",key:"jimo8o"}],["circle",{cx:"19",cy:"21",r:"1",key:"13723u"}],["path",{d:"M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12",key:"9zh506"}]],S=r("shopping-cart",H);/**
 * @license lucide-react v1.16.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const T=[["path",{d:"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2",key:"975kel"}],["circle",{cx:"12",cy:"7",r:"4",key:"17ys0d"}]],B=r("user",T),M="_shell_w9336_1",W="_stickyHeaderWrap_w9336_14",P="_main_w9336_22",$="_floatingCart_w9336_32",z="_fcLeft_w9336_56",E="_fcCount_w9336_57",U="_fcLabel_w9336_63",F="_fcTotal_w9336_64",Q="_fcArrow_w9336_65",R="_nav_w9336_68",V="_navItem_w9336_84",q="_navIcon_w9336_96",D="_navActive_w9336_102",G="_navLabel_w9336_104",J="_navBar_w9336_112",K="_cartBadge_w9336_119",O="_page_w9336_131",X="_sectionHeader_w9336_140",Y="_sectionTitle_w9336_144",Z="_sectionAction_w9336_145",s={shell:M,stickyHeaderWrap:W,main:P,floatingCart:$,fcLeft:z,fcCount:E,fcLabel:U,fcTotal:F,fcArrow:Q,nav:R,navItem:V,navIcon:q,navActive:D,navLabel:G,navBar:J,cartBadge:K,page:O,sectionHeader:X,sectionTitle:Y,sectionAction:Z},aa=[{path:"/user",Icon:b,label:"Asosiy"},{path:"/user/search",Icon:C,label:"Qidiruv"},{path:"/user/cart",Icon:S,label:"Savat"},{path:"/user/favs",Icon:A,label:"Sevimli"},{path:"/user/profile",Icon:B,label:"Profil"}];function ca({children:n,showNav:c=!0,stickyHeader:t}){const d=w(),{pathname:i}=N(),o=m(e=>e.totalItems()),h=m(e=>e.total()),{haptic:v}=y(),{fmt:u}=g(),f=i==="/user/cart";return a.jsxs("div",{className:s.shell,children:[t&&a.jsx("div",{className:s.stickyHeaderWrap,children:t}),a.jsx("main",{className:s.main,children:n}),c&&o>0&&!f&&a.jsxs("button",{className:s.floatingCart,onClick:()=>{v.medium(),d("/user/cart")},children:[a.jsxs("div",{className:s.fcLeft,children:[a.jsx("span",{className:s.fcCount,children:o}),a.jsx("span",{className:s.fcLabel,children:"Savat"})]}),a.jsx("span",{className:s.fcTotal,children:u(h)}),a.jsx("span",{className:s.fcArrow,children:"›"})]}),c&&a.jsx("nav",{className:s.nav,children:aa.map(({path:e,Icon:p,label:x})=>{const l=i===e||e!=="/user"&&i.startsWith(e),j=e==="/user/cart";return a.jsxs("button",{className:_(s.navItem,l&&s.navActive),onClick:()=>{v.light(),d(e)},children:[a.jsxs("span",{className:s.navIcon,children:[a.jsx(p,{size:22,strokeWidth:l?2.2:1.8,color:l?"var(--text-primary)":"var(--text-muted)"}),j&&o>0&&a.jsx("span",{className:s.cartBadge,children:o>9?"9+":o})]}),a.jsx("span",{className:s.navLabel,children:x}),l&&a.jsx("span",{className:s.navBar})]},e)})})]})}function ta({children:n,className:c,style:t}){return a.jsx("div",{className:_(s.page,c),style:t,children:n})}function na({title:n,action:c,className:t}){return a.jsxs("div",{className:_(s.sectionHeader,t),children:[a.jsx("h3",{className:s.sectionTitle,children:n}),c&&a.jsx("div",{className:s.sectionAction,children:c})]})}export{ca as A,ta as P,na as S,B as U};
