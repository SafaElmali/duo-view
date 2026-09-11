function sourceMatches(source,page,ancestor){
 if(source==="'self'")return page.origin===ancestor.origin||(page.protocol==='http:'&&ancestor.protocol==='https:'&&page.hostname===ancestor.hostname&&!page.port&&!ancestor.port);
 if(source==="'none'")return false;
 if(source==='*')return true;
 if(/^[a-z][a-z\d+.-]*:$/i.test(source))return source===ancestor.protocol||(source==='http:'&&ancestor.protocol==='https:');
 const match=source.match(/^(?:(https?):\/\/)?(\*\.)?([a-z\d.-]+|\*)(?::(\d+|\*))?(\/.*)?$/i);
 if(!match||match[5]&&match[5]!=='/')return null;
 const [,scheme,wildcard,host,port]=match;
 const protocol=scheme?scheme.toLowerCase()+':':page.protocol;
 if(ancestor.protocol!==protocol&&!(protocol==='http:'&&ancestor.protocol==='https:'))return false;
 const hostname=ancestor.hostname.toLowerCase(),expected=host.toLowerCase();
 if(host!=='*'&&(wildcard?!hostname.endsWith('.'+expected):hostname!==expected))return false;
 if(port==='*')return true;
 const actualPort=ancestor.port||(ancestor.protocol==='https:'?'443':'80');
 return port?actualPort===port||(port==='80'&&actualPort==='443'&&protocol==='http:'&&ancestor.protocol==='https:'):!ancestor.port;
}

// Return unknown for policy syntax we cannot confidently interpret.
export function embeddingPolicy(headers,pageUrl,ancestorUrl){
 const page=new URL(pageUrl),ancestor=new URL(ancestorUrl);
 const csp=[headers['content-security-policy']||''].flat().join(',');
 const directives=csp.split(',').map(policy=>policy.split(';').map(value=>value.trim().split(/\s+/)).find(parts=>parts[0]?.toLowerCase()==='frame-ancestors')).filter(Boolean);
 if(directives.length){
  let uncertain=false;
  for(const [, ...sources]of directives){
   const matches=sources.map(source=>sourceMatches(source,page,ancestor));
   if(matches.includes(true))continue;
   if(matches.includes(null))uncertain=true;
   else return {status:'blocked',reason:'frame-ancestors'};
  }
  return {status:uncertain?'unknown':'allowed',reason:'frame-ancestors'};
 }
 const xfo=[headers['x-frame-options']||''].flat().join(',').split(',').map(value=>value.trim().toUpperCase()).filter(Boolean);
 if(xfo.includes('DENY')||xfo.includes('SAMEORIGIN')&&page.origin!==ancestor.origin)return {status:'blocked',reason:'x-frame-options'};
 if(xfo.some(value=>value!=='SAMEORIGIN'))return {status:'unknown',reason:'x-frame-options'};
 return {status:'allowed',reason:'no-blocking-policy'};
}
