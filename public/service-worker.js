"use strict";var precacheConfig=[["/index.html","e16acd4160d7f571396f487f99c88c19"],["/static/js/main.aefd6f94.js","5a5b2200c725d9b6ccb20e62be95c27b"],["/static/media/avatar.84dc9adb.svg","84dc9adb95c6acdf4e0f60cc5ed10719"],["/static/media/broken.972e509b.svg","972e509be9a82069b6edfb3ca8cee416"],["/static/media/car.0033ea7f.svg","0033ea7f38b8faab197b4ef393216179"],["/static/media/chevrondn.be763cc4.svg","be763cc4bfcfa03b96aa15a44cf523a8"],["/static/media/chevronup.45ecddea.svg","45ecddea87c9c88043bbcd0d26df6b43"],["/static/media/clap.af58fdf0.svg","af58fdf0baae46a410fa68d4771cd8a9"],["/static/media/curb.8e35deda.jpg","8e35dedac4c998159988b6fcb00fe038"],["/static/media/empty.fa9206b5.svg","fa9206b5cbaa239a48a399ac7cbd9aab"],["/static/media/frown.71e8643b.svg","71e8643b15d968e220bd40a0e4047edc"],["/static/media/i.8321a9f7.svg","8321a9f760f38fc0f1e223d7a1fba68a"],["/static/media/loading.dbd5a0f4.svg","dbd5a0f4e8d9ca85622ce1b46fae7921"],["/static/media/logo-hfla.b2bf88fe.svg","b2bf88fe4c19ef37ab7e5beeea5cc441"],["/static/media/logo.b437ecc6.svg","b437ecc6bca9665d080c7f9f6031254c"],["/static/media/next.af343896.svg","af343896acb02862448135c0814c7d38"],["/static/media/prev.dc8eb02e.svg","dc8eb02e9c7a96ddab22395f3aac9762"],["/static/media/questions.f28cfb7f.svg","f28cfb7f659abe1f4900236908fe2dd2"],["/static/media/sticky.ee186825.svg","ee1868254c7daedb02e2fc510dda1e7a"],["/static/media/temporary.59636e14.svg","59636e14e2750d3685f794acd95f8e4e"],["/static/media/x.2ebd4c0a.svg","2ebd4c0a41d30e583c672dfe5a502db5"]],cacheName="sw-precache-v3-sw-precache-webpack-plugin-"+(self.registration?self.registration.scope:""),ignoreUrlParametersMatching=[/^utm_/],addDirectoryIndex=function(e,a){var t=new URL(e);return"/"===t.pathname.slice(-1)&&(t.pathname+=a),t.toString()},cleanResponse=function(a){return a.redirected?("body"in a?Promise.resolve(a.body):a.blob()).then(function(e){return new Response(e,{headers:a.headers,status:a.status,statusText:a.statusText})}):Promise.resolve(a)},createCacheKey=function(e,a,t,n){var c=new URL(e);return n&&c.pathname.match(n)||(c.search+=(c.search?"&":"")+encodeURIComponent(a)+"="+encodeURIComponent(t)),c.toString()},isPathWhitelisted=function(e,a){if(0===e.length)return!0;var t=new URL(a).pathname;return e.some(function(e){return t.match(e)})},stripIgnoredUrlParameters=function(e,t){var a=new URL(e);return a.hash="",a.search=a.search.slice(1).split("&").map(function(e){return e.split("=")}).filter(function(a){return t.every(function(e){return!e.test(a[0])})}).map(function(e){return e.join("=")}).join("&"),a.toString()},hashParamName="_sw-precache",urlsToCacheKeys=new Map(precacheConfig.map(function(e){var a=e[0],t=e[1],n=new URL(a,self.location),c=createCacheKey(n,hashParamName,t,/\.\w{8}\./);return[n.toString(),c]}));function setOfCachedUrls(e){return e.keys().then(function(e){return e.map(function(e){return e.url})}).then(function(e){return new Set(e)})}self.addEventListener("install",function(e){e.waitUntil(caches.open(cacheName).then(function(n){return setOfCachedUrls(n).then(function(t){return Promise.all(Array.from(urlsToCacheKeys.values()).map(function(a){if(!t.has(a)){var e=new Request(a,{credentials:"same-origin"});return fetch(e).then(function(e){if(!e.ok)throw new Error("Request for "+a+" returned a response with status "+e.status);return cleanResponse(e).then(function(e){return n.put(a,e)})})}}))})}).then(function(){return self.skipWaiting()}))}),self.addEventListener("activate",function(e){var t=new Set(urlsToCacheKeys.values());e.waitUntil(caches.open(cacheName).then(function(a){return a.keys().then(function(e){return Promise.all(e.map(function(e){if(!t.has(e.url))return a.delete(e)}))})}).then(function(){return self.clients.claim()}))}),self.addEventListener("fetch",function(a){if("GET"===a.request.method){var e,t=stripIgnoredUrlParameters(a.request.url,ignoreUrlParametersMatching),n="index.html";(e=urlsToCacheKeys.has(t))||(t=addDirectoryIndex(t,n),e=urlsToCacheKeys.has(t));var c="/index.html";!e&&"navigate"===a.request.mode&&isPathWhitelisted(["^(?!\\/__).*"],a.request.url)&&(t=new URL(c,self.location).toString(),e=urlsToCacheKeys.has(t)),e&&a.respondWith(caches.open(cacheName).then(function(e){return e.match(urlsToCacheKeys.get(t)).then(function(e){if(e)return e;throw Error("The cached response that was expected is missing.")})}).catch(function(e){return console.warn('Couldn\'t serve response for "%s" from cache: %O',a.request.url,e),fetch(a.request)}))}});