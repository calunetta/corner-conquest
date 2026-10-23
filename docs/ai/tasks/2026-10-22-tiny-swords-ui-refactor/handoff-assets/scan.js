const fs=require('fs'),path=require('path');
const files=[];(function w(d){for(const f of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,f.name);if(f.isDirectory()){if(/src\/(testbed|components\/ui)$/.test(p)||f.name==='__tests__')continue;w(p)}else if(p.endsWith('.tsx')&&!/\.(test|spec)\.tsx$/.test(p))files.push(p)}})('src');
const re=/bg-|border|rounded|\bh-\d|\bh-\[|shadow/;
const out=[];let total=0;
for(const f of files){const s=fs.readFileSync(f,'utf8');
 const dir=path.dirname(f);const styleTxt=fs.readdirSync(dir).filter(n=>n.endsWith('.styles.ts')).map(n=>fs.readFileSync(path.join(dir,n),'utf8')).join('\n');
 const tr=/<(Button|AlertDialogAction|AlertDialogCancel)(?=[\s>\/])/g;let m;
 while((m=tr.exec(s))){let i=m.index+m[0].length,depth=0,q=null;
  for(;i<s.length;i++){const c=s[i];if(q){if(c===q&&s[i-1]!=='\\')q=null;continue}
   if(depth>0&&(c==='"'||c==="'"||c==='`')){q=c;continue}
   if(c==='{')depth++;else if(c==='}')depth--;else if(c==='>'&&depth===0)break;
   else if(depth===0&&c==='"'){q='"'}}
  const tag=s.slice(m.index,i);const line=s.slice(0,m.index).split('\n').length;
  total++;
  const g=(n)=>{let r=tag.match(new RegExp('\\b'+n+'=(?:"([^"]*)"|\\{\\s*"([^"]*)"\\s*\\})'));return r?(r[1]||r[2]):null};
  const variant=g('variant')||'default',size=g('size')||'default',asChild=/\basChild\b/.test(tag),dyn=/variant=\{[^"]/.test(tag)||/size=\{[^"]/.test(tag);
  let cn='';const cm=tag.match(/className=(?:"([^"]*)"|\{([\s\S]*)\}\s*$)/);
  if(cm){cn=cm[1]||cm[2]||'';}
  // also className={...} not at end
  const ci=tag.indexOf('className=');if(ci>=0&&!cm?.[1]){let j=ci+10,d=0,q2=null,st=j;if(tag[j]==='{'){for(;j<tag.length;j++){const c=tag[j];if(q2){if(c===q2)q2=null;continue}if(c==='"'||c==="'"||c==='`')q2=c;else if(c==='{')d++;else if(c==='}'){d--;if(d===0)break}}cn=tag.slice(st,j+1)}}
  let resolved=cn;
  for(const k of [...cn.matchAll(/styles\.(\w+)/g)].map(x=>x[1])){const km=styleTxt.match(new RegExp('\\b'+k+'\\s*:\\s*(?:"([^"]*)"|\'([^\']*)\'|`([^`]*)`|([\\s\\S]{0,300}?)(?:,\\n))'));if(km)resolved+=' '+(km[1]||km[2]||km[3]||km[4]||'');else resolved+=' [UNRESOLVED '+k+']'}
  out.push({f,line,comp:m[1],variant,size,asChild,dyn,cn:resolved.replace(/\s+/g,' ').trim(),hit:re.test(resolved)})}}
const tier=o=>o.comp!=='Button'?'aldlg':(o.asChild?'plain':(['default','destructive','outline','secondary'].includes(o.variant)&&['default','lg'].includes(o.size)?'sprite':'plate'));
out.forEach(o=>o.tier=tier(o));
console.log('TOTAL',total);
const cnt={};out.forEach(o=>{const k=o.comp+':'+o.tier;cnt[k]=(cnt[k]||0)+1});console.log(cnt);
console.log('HITS',out.filter(o=>o.hit).length);
for(const o of out.filter(o=>o.hit))console.log(`${o.f}:${o.line} ${o.comp} ${o.tier} v=${o.variant} s=${o.size}${o.asChild?' asChild':''}${o.dyn?' DYN':''} | ${o.cn.slice(0,140)}`);
console.log('---UNRESOLVED/DYN non-hit');
for(const o of out.filter(o=>!o.hit&&(o.dyn||/UNRESOLVED/.test(o.cn))))console.log(`${o.f}:${o.line} ${o.comp} ${o.variant}/${o.size} ${o.cn.slice(0,100)}`);
console.log('---ALDLG with className');
for(const o of out.filter(o=>o.comp!=='Button'&&o.cn))console.log(`${o.f}:${o.line} ${o.comp} ${o.cn.slice(0,100)}`);
