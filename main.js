(function(){
"use strict";

/* =========================================================
   1. 資料模型
   ========================================================= */
const TYPES = {
  heading:{label:'標題',   icon:'type-h3',        make:()=>({lv:0,text:'請輸入標題'})},
  paragraph:{label:'段落', icon:'text-paragraph', make:()=>({html:'請輸入內文文字。'})},
  list:{label:'清單',      icon:'list-ul',        make:()=>({ordered:false,items:['第一點','第二點']})},
  image:{label:'圖片',     icon:'image',          make:()=>({src:'',alt:'',decorative:false,caption:''})},
  imageText:{label:'圖文並排',icon:'layout-text-window-reverse',make:()=>({src:'',alt:'',decorative:false,pos:'left',ratio:'1-2',heading:'小標題',html:'請輸入說明文字。',linkText:'',linkUrl:'',linkNew:true})},
  table:{label:'表格',     icon:'table',          make:()=>({caption:'表格說明',headers:['項目','內容'],rows:[['報名時間','即日起至 8 月 31 日']],scope:'col'})},
  link:{label:'按鈕連結',  icon:'link-45deg',     make:()=>({align:'left',items:[{text:'線上報名',url:'',newWindow:true,style:'button',title:'',srOnly:false,isFile:false,fileType:'PDF',fileSize:''}]})},
  files:{label:'檔案下載', icon:'download',       make:()=>({title:'相關附件下載',items:[{name:'活動簡章',url:'',type:'PDF',size:'1.2 MB'}]})},
  note:{label:'提示方塊',  icon:'info-circle',    make:()=>({tone:'info',title:'注意事項',html:'請留意報名截止日期。'})},
  faq:{label:'常見問答',   icon:'patch-question', make:()=>({mode:'details',items:[{q:'如何報名？',a:'請填寫線上表單。'}]})},
  quote:{label:'引言',     icon:'quote',          make:()=>({text:'',source:''})},
  video:{label:'影音',     icon:'play-btn',       make:()=>({url:'',title:'',transcript:''})},
  divider:{label:'分隔線', icon:'dash-lg',        make:()=>({})}
};

const state = { blocks:[], sel:null, level:'AA', theme:'#0E6E63', mode:'clean', tplCat:'通用', baseLevel:3, styleText:true, my:[] };
let uid = 0;
const nid = () => 'b' + (++uid) + Date.now().toString(36).slice(-3);
const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

/* =========================================================
   2. 小工具
   ========================================================= */
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function toast(msg){
  const t=document.createElement('div'); t.className='toastie'; t.textContent=msg;
  $('#toasts').appendChild(t); setTimeout(()=>t.remove(),3200);
}
function getBlock(id){return state.blocks.find(b=>b.id===id);}
function sel(){return getBlock(state.sel);}
function plain(html){const d=document.createElement('div');d.innerHTML=html||'';return (d.textContent||'').trim();}

/* 對比度 */
function lum(hex){
  const c=hex.replace('#',''); const n=c.length===3?c.split('').map(x=>x+x).join(''):c;
  const v=[0,2,4].map(i=>{const s=parseInt(n.substr(i,2),16)/255;return s<=.03928?s/12.92:Math.pow((s+.055)/1.055,2.4);});
  return .2126*v[0]+.7152*v[1]+.0722*v[2];
}
function ratio(a,b){const x=lum(a),y=lum(b);return ((Math.max(x,y)+.05)/(Math.min(x,y)+.05));}

/* 只保留安全的行內標籤 */
const INLINE_OK = {B:'strong',STRONG:'strong',I:'em',EM:'em',A:'a',BR:'br',SUP:'sup',SUB:'sub'};
function sanitizeInline(html){
  const src=document.createElement('div'); src.innerHTML=html||'';
  function walk(node){
    let out='';
    node.childNodes.forEach(n=>{
      if(n.nodeType===3){ out+=esc(n.nodeValue); return; }
      if(n.nodeType!==1) return;
      const tag=INLINE_OK[n.tagName];
      if(!tag){ out+=walk(n); return; }
      if(tag==='br'){ out+='<br>'; return; }
      if(tag==='a'){
        const href=n.getAttribute('href')||'';
        if(!/^(https?:|mailto:|tel:|\/|#)/i.test(href)){ out+=walk(n); return; }
        const nw=n.getAttribute('target')==='_blank';
        out+='<a href="'+esc(href)+'"'+(nw?' target="_blank" rel="noopener noreferrer"':'')+'>'+walk(n)+'</a>';
        return;
      }
      const inner=walk(n);
      out += inner ? '<'+tag+'>'+inner+'</'+tag+'>' : '';
    });
    return out;
  }
  return walk(src).replace(/\s+/g,' ').trim();
}

/* =========================================================
   3. 輸出樣式表（class / inline 兩種模式共用同一份定義）
   ========================================================= */
const PFX = 'ac' + Math.random().toString(36).slice(2,6);
function styleMap(){
  const c = state.theme, cd = shade(c,-18);
  return {
    'hA':'font-size:1.5em;line-height:1.4;font-weight:bold;margin:1.6em 0 .6em;padding-left:.5em;border-left:5px solid '+c+';',
    'hB':'font-size:1.2em;line-height:1.45;font-weight:bold;margin:1.4em 0 .5em;color:'+cd+';',
    'hC':'font-size:1.05em;line-height:1.5;font-weight:bold;margin:1.2em 0 .4em;',
    'p':'margin:0 0 1em;line-height:1.8;',
    'pEnd':'margin:0;line-height:1.8;',
    'list':'margin:0 0 1.2em;padding-left:1.6em;line-height:1.8;',
    'li':'margin-bottom:.35em;',
    'fig':'margin:0 0 1.2em;',
    'img':'max-width:100%;height:auto;',
    'figcap':'margin-top:.5em;font-size:.9em;color:#444;',
    'tbl':'width:100%;border-collapse:collapse;margin:0 0 1.2em;',
    'cap':'caption-side:top;text-align:left;font-weight:bold;padding:.4em 0;',
    'th':'border:1px solid #c9d1d0;padding:.6em .7em;background:#eef2f1;text-align:left;',
    'td':'border:1px solid #c9d1d0;padding:.6em .7em;text-align:left;',
    'btn':'display:inline-block;padding:.6em 1.4em;background:'+c+';color:#ffffff;text-decoration:underline;border-radius:6px;line-height:1.5;',
    'btnRow':'display:flex;flex-wrap:wrap;gap:.7em;align-items:center;margin:0 0 1.2em;',
    'btnRowC':'display:flex;flex-wrap:wrap;gap:.7em;align-items:center;justify-content:center;margin:0 0 1.2em;',
    'note':'border:1px solid #c9d1d0;border-left:6px solid '+cd+';background:#f6f8f8;padding:.9em 1.1em;margin:0 0 1.2em;border-radius:4px;',
    'noteHd':'margin:0 0 .4em;font-size:1em;font-weight:bold;',
    'files':'list-style:none;padding:0;margin:0 0 1.2em;',
    'fileLi':'border-bottom:1px solid #dfe5e4;padding:.55em 0;',
    'quote':'margin:0 0 1.2em;border-left:4px solid #c9d1d0;padding:.2em 0 .2em 1em;',
    'itRow':'display:flex;flex-wrap:wrap;gap:1.2em;align-items:flex-start;margin:0 0 1.4em;',
    'itRowR':'display:flex;flex-wrap:wrap;flex-direction:row-reverse;gap:1.2em;align-items:flex-start;margin:0 0 1.4em;',
    'itImgA':'flex:1 1 200px;min-width:0;',
    'itTxtA':'flex:2 1 280px;min-width:0;',
    'itImgB':'flex:1 1 260px;min-width:0;',
    'itTxtB':'flex:1 1 260px;min-width:0;',
    'itImgC':'flex:2 1 300px;min-width:0;',
    'itTxtC':'flex:1 1 200px;min-width:0;',
    'vid':'position:relative;padding-top:56.25%;margin:0 0 .6em;',
    'vidFrame':'position:absolute;top:0;left:0;width:100%;height:100%;border:0;'
  };
}
function shade(hex,pct){
  const c=hex.replace('#',''); const n=c.length===3?c.split('').map(x=>x+x).join(''):c;
  const f=(i)=>{let v=parseInt(n.substr(i,2),16)+Math.round(255*pct/100);return Math.max(0,Math.min(255,v)).toString(16).padStart(2,'0');};
  return '#'+f(0)+f(2)+f(4);
}
let USED = new Set();
/* 標題與內文的樣式可整組關閉，讓後台既有的文章樣式接手 */
const TEXT_KEYS = new Set(['hA','hB','hC','p','pEnd','list','li']);
function at(key){
  if(state.mode==='clean') return '';
  if(TEXT_KEYS.has(key) && !state.styleText) return '';
  const m=styleMap();
  if(state.mode==='class'){ USED.add(key); return ' class="'+PFX+'-'+key+'"'; }
  return ' style="'+m[key]+'"';
}
function buildCSS(){
  const m=styleMap(); let out='<style>\n';
  USED.forEach(k=>{ out += '.'+PFX+'-'+k+'{'+m[k]+'}\n'; });
  return out+'</style>';
}

/* =========================================================
   4. 產生 HTML（單一來源：預覽與輸出都走這裡）
   ========================================================= */
function newWinSuffix(on){ return on ? '（另開新視窗）' : ''; }
/* 螢幕閱讀器專用的隱藏文字。屬功能性樣式，即使「純語義」模式也必須輸出，否則文字會直接顯示出來 */
const SR_STYLE='position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;';
/* 相對層級 → 實際 h 標籤。0 = 內文起始層級（預設 H3） */
function HL(off){ return Math.min(6, (state.baseLevel||3) + (off||0)); }

/* 表格合併記號 → 每格 {text, cs, rs}；被合併掉的位置為 null。
   「<」併入左格、「^」併入上格；thead 與 tbody 不能跨區合併 */
function tableSpans(g,hasHead){
  const own=g.map(r=>r.map(()=>null));
  const cells=g.map(r=>r.map(()=>null));
  g.forEach((r,y)=>r.forEach((v,x)=>{
    const canUp = y>0 && !(hasHead && y===1);
    const o = v==='<' && x>0 ? own[y][x-1] : v==='^' && canUp ? own[y-1][x] : null;
    if(o){ own[y][x]=o; o.cs=Math.max(o.cs,x-o.x+1); o.rs=Math.max(o.rs,y-o.y+1); return; }
    own[y][x]=cells[y][x]={x,y,cs:1,rs:1,text:(v==='<'||v==='^')?'':v};
  }));
  return cells;
}

function blockHTML(b){
  const d=b.data;
  switch(b.type){

    case 'heading':{
      const lv=HL(d.lv);
      const key=['hA','hB','hC'][Math.min(2,d.lv||0)];
      return '<h'+lv+at(key)+'>'+esc(d.text||'')+'</h'+lv+'>';
    }

    case 'paragraph':
      return '<p'+at('p')+'>'+(d.html||'')+'</p>';

    case 'list':{
      const t=d.ordered?'ol':'ul';
      const li=(d.items||[]).filter(x=>String(x).trim()).map(x=>'  <li'+at('li')+'>'+esc(x)+'</li>').join('\n');
      return '<'+t+at('list')+'>\n'+li+'\n</'+t+'>';
    }

    case 'image':{
      const alt = d.decorative ? '' : esc(d.alt||'');
      const img = '<img src="'+esc(d.src||'')+'" alt="'+alt+'"'+at('img')+'>';
      if(!d.caption) return img;
      return '<figure'+at('fig')+'>\n  '+img+'\n  <figcaption'+at('figcap')+'>'+esc(d.caption)+'</figcaption>\n</figure>';
    }

    case 'imageText':{
      const sfx={'1-2':'A','1-1':'B','2-1':'C'}[d.ratio]||'A';
      const alt = d.decorative ? '' : esc(d.alt||'');
      const img = '<img src="'+esc(d.src||'')+'" alt="'+alt+'"'+at('img')+'>';
      let txt='';
      if(d.heading) txt += '    <h'+HL(1)+at('hB')+'>'+esc(d.heading)+'</h'+HL(1)+'>\n';
      txt += '    <p'+at('p')+'>'+(d.html||'')+'</p>\n';
      if(d.linkText && d.linkUrl){
        const lbl = esc(d.linkText) + (d.linkNew?'（另開新視窗）':'');
        txt += '    <p'+at('p')+'><a href="'+esc(d.linkUrl)+'"'+(d.linkNew?' target="_blank" rel="noopener noreferrer"':'')+at('btn')+'>'+lbl+'</a></p>\n';
      }
      // 純語義模式沒有樣式可用，改採「圖在前、文在後」的直式排列，閱讀順序才正確
      if(state.mode==='clean'){
        return img+'\n'+txt.replace(/^ {4}/gm,'').trim();
      }
      return '<div'+at(d.pos==='right'?'itRowR':'itRow')+'>\n'
        +'  <div'+at('itImg'+sfx)+'>\n    '+img+'\n  </div>\n'
        +'  <div'+at('itTxt'+sfx)+'>\n'+txt+'  </div>\n'
        +'</div>';
    }

    case 'table':{
      const clean=r=>(r||[]).map(c=>String(c??'').trim());
      const head=clean(d.headers);
      // 空白表頭格要保留，否則整列往左錯位；只有整列都沒字才不輸出 thead
      const hasHead=(d.scope==='col'||d.scope==='both') && head.some(c=>c && c!=='<' && c!=='^');
      const body=(d.rows||[]).map(clean).filter(r=>r.some(Boolean));
      const grid=hasHead ? [head].concat(body) : body;
      const W=Math.max(0,...grid.map(r=>r.length));
      const cells=tableSpans(grid.map(r=>r.concat(Array(W-r.length).fill(''))), hasHead);
      const tr=(r,inHead)=>{
        let s='    <tr>\n';
        r.forEach((c,x)=>{
          if(!c) return; // 被合併掉的格子
          const sp=(c.cs>1?' colspan="'+c.cs+'"':'')+(c.rs>1?' rowspan="'+c.rs+'"':'');
          if(inHead){
            // 沒有文字的表頭（如左上角空格）輸出 td，避免產生空的 th
            s += c.text
              ? '      <th scope="'+(c.cs>1?'colgroup':'col')+'"'+sp+at('th')+'>'+esc(c.text)+'</th>\n'
              : '      <td'+sp+at('th')+'></td>\n';
          }else if(x===0 && (d.scope==='row'||d.scope==='both')){
            s += '      <th scope="'+(c.rs>1?'rowgroup':'row')+'"'+sp+at('th')+'>'+esc(c.text)+'</th>\n';
          }else{
            s += '      <td'+sp+at('td')+'>'+esc(c.text)+'</td>\n';
          }
        });
        return s+'    </tr>\n';
      };
      let out='<table'+at('tbl')+'>\n';
      if(d.caption) out+='  <caption'+at('cap')+'>'+esc(d.caption)+'</caption>\n';
      if(hasHead) out+='  <thead>\n'+tr(cells[0],true)+'  </thead>\n';
      out+='  <tbody>\n'+cells.slice(hasHead?1:0).map(r=>tr(r,false)).join('');
      return out+'  </tbody>\n</table>';
    }

    case 'link':{
      const items=(d.items||[]).filter(i=>(i.text||'').trim()||(i.url||'').trim());
      if(!items.length) return '';
      const as=items.map(i=>{
        let label=esc(i.text||'');
        if(i.isFile){
          const bits=[i.fileType,i.fileSize].filter(Boolean).join('，');
          if(bits) label += '（'+esc(bits)+'）';
        }
        const extra=(i.title||'').trim();
        if(i.srOnly && extra) label += '<span style="'+SR_STYLE+'">　'+esc(extra)+'</span>';
        label += newWinSuffix(i.newWindow);
        const tgt = i.newWindow ? ' target="_blank" rel="noopener noreferrer"' : '';
        const ti = extra ? ' title="'+esc(extra)+'"' : '';
        return '<a href="'+esc(i.url||'')+'"'+tgt+ti+(i.style==='button'?at('btn'):'')+'>'+label+'</a>';
      });
      // 純語義模式沒有樣式可用，改用段落＋空白分隔，按鈕之間仍會有間距
      if(state.mode==='clean') return '<p>\n  '+as.join('\n  ')+'\n</p>';
      if(!state.styleText && d.align!=='center') return '<p'+at('p')+'>\n  '+as.join('\n  ')+'\n</p>';
      return '<div'+at(d.align==='center'?'btnRowC':'btnRow')+'>\n  '+as.join('\n  ')+'\n</div>';
    }

    case 'files':{
      let out = d.title ? '<h'+HL(1)+at('hB')+'>'+esc(d.title)+'</h'+HL(1)+'>\n' : '';
      out += '<ul'+at('files')+'>\n';
      (d.items||[]).filter(i=>i.name).forEach(i=>{
        const bits=[i.type,i.size].filter(Boolean).join('，');
        out += '  <li'+at('fileLi')+'><a href="'+esc(i.url||'')+'" target="_blank" rel="noopener noreferrer">'
             + esc(i.name)+(bits?'（'+esc(bits)+'）':'')+'（另開新視窗）</a></li>\n';
      });
      return out+'</ul>';
    }

    case 'note':{
      const tag = {info:'提醒',warn:'注意',ok:'完成'}[d.tone]||'提醒';
      let out='<div'+at('note')+'>\n';
      out+='  <p'+at('noteHd')+'>'+esc(tag)+'：'+esc(d.title||'')+'</p>\n';
      out+='  <p'+at('pEnd')+'>'+(d.html||'')+'</p>\n</div>';
      return out;
    }

    case 'faq':{
      const items=(d.items||[]).filter(i=>i.q);
      if(d.mode==='heading'){
        return items.map(i=>'<h'+HL(1)+at('hB')+'>'+esc(i.q)+'</h'+HL(1)+'>\n<p'+at('p')+'>'+esc(i.a||'')+'</p>').join('\n');
      }
      return items.map(i=>'<details>\n  <summary>'+esc(i.q)+'</summary>\n  <p'+at('pEnd')+'>'+esc(i.a||'')+'</p>\n</details>').join('\n');
    }

    case 'quote':{
      let out='<blockquote'+at('quote')+'>\n  <p'+at('p')+'>'+esc(d.text||'')+'</p>\n';
      if(d.source) out+='  <footer>資料來源：'+esc(d.source)+'</footer>\n';
      return out+'</blockquote>';
    }

    case 'video':{
      const src=embedURL(d.url||'');
      let out='<figure'+at('fig')+'>\n  <div'+at('vid')+'>\n';
      out+='    <iframe src="'+esc(src)+'" title="影片：'+esc(d.title||'')+'" loading="lazy" allowfullscreen'+at('vidFrame')+'></iframe>\n  </div>\n';
      out+='  <figcaption'+at('figcap')+'>影片：'+esc(d.title||'')+'</figcaption>\n</figure>';
      if(d.transcript) out+='\n<details>\n  <summary>展開影片文字稿</summary>\n  <p'+at('pEnd')+'>'+esc(d.transcript)+'</p>\n</details>';
      return out;
    }

    case 'divider': return '<hr>';
  }
  return '';
}
function embedURL(u){
  const yt=u.match(/(?:youtu\.be\/|v=|embed\/)([\w-]{6,})/);
  if(yt) return 'https://www.youtube.com/embed/'+yt[1];
  const vm=u.match(/vimeo\.com\/(\d+)/);
  if(vm) return 'https://player.vimeo.com/video/'+vm[1];
  return u;
}

/* 預覽用示意圖。只在畫布顯示，輸出的原始碼永遠保留使用者填入的網址（空的就是空的） */
/* 預覽用示意圖：直接輸出 inline <svg>，不走 data: URI，避免被內容安全政策擋掉。
   只在畫布顯示，輸出的原始碼永遠是使用者填的網址（空的就是空的）。 */
function PHSVG(w,h){
  const fs=Math.round(w/26);
  return '<svg class="phimg" viewBox="0 0 '+w+' '+h+'" role="img" aria-label="示意圖，尚未填入實際圖片" xmlns="http://www.w3.org/2000/svg">'
    +'<rect width="'+w+'" height="'+h+'" rx="6" fill="#E9EFEE"/>'
    +'<rect x="10" y="10" width="'+(w-20)+'" height="'+(h-20)+'" rx="10" fill="none" stroke="#B4C8C4" stroke-width="3" stroke-dasharray="14 10"/>'
    +'<g transform="translate('+(w/2)+','+(h/2-14)+')" fill="#A7BDB8">'
    +'<circle cx="26" cy="-24" r="11"/>'
    +'<path d="M-58 30 L-18 -18 L8 12 L28 -8 L58 30 Z"/></g>'
    +'<text x="'+(w/2)+'" y="'+(h/2+58)+'" text-anchor="middle" font-family="sans-serif" font-size="'+fs+'" fill="#6B8480">示意圖，請填入實際圖片網址</text>'
    +'</svg>';
}

/* 畫布用的預覽（永遠帶樣式，方便看，但不影響輸出） */
function previewHTML(b){
  const old=state.mode; state.mode='inline';
  let h;
  if((b.type==='image'||b.type==='imageText') && !b.data.src){
    const c=JSON.parse(JSON.stringify(b)); c.data.src='#';
    const svg = b.type==='image' ? PHSVG(960,540) : PHSVG(640,480);
    h=blockHTML(c).replace(/<img[^>]*>/, ()=>svg);
  }else if(b.type==='video' && !b.data.url){
    h='<div class="ph ph-video"><i class="bi bi-play-btn-fill" aria-hidden="true"></i><span>示意影片，請填入實際影片網址</span></div>';
  }else{
    h=blockHTML(b);
  }
  state.mode=old;
  return h;
}

/* =========================================================
   5. 無障礙檢測
   ========================================================= */
/* 一個區塊實際會輸出哪些標題（含區塊內建的小標） */
function emittedHeadings(b){
  const d=b.data;
  if(b.type==='heading' && d.text.trim()) return [{lv:HL(d.lv),text:d.text}];
  if(b.type==='files' && d.title) return [{lv:HL(1),text:d.title}];
  if(b.type==='imageText' && d.heading) return [{lv:HL(1),text:d.heading}];
  if(b.type==='faq' && d.mode==='heading') return (d.items||[]).filter(i=>i.q.trim()).map(i=>({lv:HL(1),text:i.q}));
  return [];
}
const VAGUE = ['這裡','點這裡','點我','按這裡','更多','詳全文','閱讀更多','click here','more','詳細內容','連結','link','按此'];
function audit(){
  const out=[]; const AAA = state.level==='AAA';
  const add=(lv,id,msg,fix)=>out.push({lv,id,msg,fix});
  let prev=0, hasHeading=false;

  if(!state.blocks.length) add('i',null,'還沒有任何內容。加入區塊或匯入 Word 之後，這裡會即時列出需要修正的項目。');

  const B=state.baseLevel||3;
  state.blocks.forEach(b=>{
    emittedHeadings(b).forEach(h=>{
      hasHeading=true;
      if(prev===0){
        if(h.lv>B) add('w',b.id,'第一個標題是 H'+h.lv+'，建議先放一個 H'+B+' 當段落主標，才不會一開始就跳階。');
      }else if(h.lv>prev+1){
        add('e',b.id,'標題階層從 H'+prev+' 跳到 H'+h.lv+'，中間不可跳階。');
      }
      prev=h.lv;
    });
  });

  state.blocks.forEach(b=>{
    const d=b.data, L=TYPES[b.type].label;

    if(b.type==='heading'){
      if(!d.text.trim()) add('e',b.id,'標題文字是空的。');
      if(d.text.length>40) add('w',b.id,'標題偏長（'+d.text.length+' 字），建議精簡到 40 字內。');
    }

    if(b.type==='paragraph'){
      const t=plain(d.html);
      if(!t) add('w',b.id,'段落沒有文字，空段落請直接刪除，不要拿來排版空白。');
      if((d.html.match(/<br>/g)||[]).length>=3) add('w',b.id,'段落用了多個換行排版，建議改拆成數個段落或清單。');
      if(/^[\u2022\u30fb\u00b7\-\*]\s*/.test(t)) add('w',b.id,'看起來是條列內容，請改用「清單」區塊，螢幕閱讀器才能報讀項目數。');
      const links=Array.from(new DOMParser().parseFromString('<div>'+d.html+'</div>','text/html').querySelectorAll('a'));
      links.forEach(a=>{
        const txt=(a.textContent||'').trim();
        if(VAGUE.includes(txt.toLowerCase())) add('e',b.id,'連結文字「'+txt+'」看不出目的地，請改成具體名稱。');
        if(AAA && txt.length<4) add('w',b.id,'AAA 要求連結文字單獨看也能判斷目的，「'+txt+'」太短。');
        if(a.target==='_blank' && !/另開新視窗/.test(txt)) add('w',b.id,'另開新視窗的連結請在文字中加註「（另開新視窗）」。');
      });
    }

    if(b.type==='list' && !(d.items||[]).filter(x=>String(x).trim()).length) add('w',b.id,'清單裡沒有任何項目。');

    if(b.type==='image'){
      if(!d.src) add('e',b.id,'圖片還沒有網址。');
      if(!d.decorative){
        if(!d.alt.trim()) add('e',b.id,'圖片缺少替代文字（alt），這是無障礙必檢項目。');
        else{
          if(/\.(jpe?g|png|gif|webp)$/i.test(d.alt)) add('e',b.id,'替代文字不能直接用檔名，請描述圖片內容。');
          if(/^(圖片?|照片|image|img)[:：\s]?/i.test(d.alt)) add('w',b.id,'替代文字開頭不需要「圖片」兩字，直接描述內容即可。');
          if(d.alt.length>100) add('w',b.id,'替代文字過長（'+d.alt.length+' 字），複雜圖表建議另寫說明文字。');
        }
      }else{
        add('i',b.id,'已標記為裝飾性圖片，會輸出 alt=""，輔具會略過。');
      }
    }

    if(b.type==='imageText'){
      if(!d.src) add('e',b.id,'圖片還沒有網址。');
      if(!d.decorative){
        if(!d.alt.trim()) add('e',b.id,'圖片缺少替代文字（alt）。若這張圖只是搭配用、旁邊文字已說明完整，可勾選「純裝飾」。');
        else if(/\.(jpe?g|png|gif|webp)$/i.test(d.alt)) add('e',b.id,'替代文字不能直接用檔名，請描述圖片內容。');
      }else{
        add('i',b.id,'已標記為裝飾性圖片，輔具會略過圖片、只讀右側文字。');
      }
      if(!plain(d.html)) add('w',b.id,'說明文字是空的。');
      if(d.linkUrl && !d.linkText.trim()) add('e',b.id,'有填連結網址但沒有連結文字。');
      if(d.linkText.trim() && !d.linkUrl.trim()) add('w',b.id,'有連結文字但還沒填網址。');
      if(d.linkText.trim() && VAGUE.includes(d.linkText.trim().toLowerCase())) add('e',b.id,'連結文字「'+d.linkText+'」看不出目的地，請改成具體動作。');
      if(d.linkText && d.linkUrl){
        const r=ratio(state.theme,'#FFFFFF');
        if(r < (AAA?7:4.5)) add('e',b.id,'按鈕底色與白字對比只有 '+r.toFixed(2)+':1，未達 '+(AAA?'7':'4.5')+':1，請到「樣式」調整主題色。');
      }
      add('i',b.id,'輸出時若選「純語義」模式，會改成圖片在上、文字在下的直式排列（無樣式可用）。需要左右並排請選內嵌樣式或類別模式。');
    }

    if(b.type==='table'){
      if(!d.caption.trim()) add('e',b.id,'表格缺少標題（caption），請說明這張表在講什麼。');
      if(!(d.headers||[]).filter(h=>String(h).trim()).length && d.scope!=='row') add('e',b.id,'表格沒有標題列，資料表必須有 th。');
      const hd=(d.headers||[]).map(h=>String(h).trim());
      if(d.scope!=='row' && hd.some(Boolean) && hd.some(h=>!h)) add('w',b.id,'標題列有空白欄位（常見於 Word 表格左上角），建議補上欄名，例如「序號」，讓報讀軟體能唸出這一欄的意義。');
      const w=(d.headers||[]).length;
      if(w && (d.rows||[]).some(r=>r.length!==w)) add('w',b.id,'各列的欄位數不一致，可能會導致報讀錯位。');
      if(AAA && d.scope==='col' && (d.rows||[]).length>6) add('w',b.id,'AAA：資料列較多時，建議把第一欄也設為列標題（兩者皆是）。');
    }

    if(b.type==='link'){
      const items=d.items||[];
      if(!items.length) add('w',b.id,'這個區塊還沒有任何按鈕。');
      const seen={};
      items.forEach((i,n)=>{
        const tag='第 '+(n+1)+' 顆按鈕';
        const t=(i.text||'').trim();
        if(!(i.url||'').trim()) add('e',b.id,tag+'還沒有網址。');
        if(!t) add('e',b.id,tag+'沒有文字。');
        else{
          if(VAGUE.includes(t.toLowerCase())) add('e',b.id,tag+'「'+t+'」看不出目的地，請改成具體動作，例如「下載報名簡章」。');
          else if(AAA && t.length<4) add('w',b.id,'AAA 要求連結文字單獨看也能判斷目的，'+tag+'「'+t+'」太短。');
          if(seen[t]!==undefined && (items[seen[t]].url||'')!==(i.url||''))
            add('e',b.id,'第 '+(seen[t]+1)+' 顆與'+tag+'文字都是「'+t+'」但連到不同網址，相同文字的連結必須指向相同目的。');
          else if(seen[t]===undefined) seen[t]=n;
        }
        const ti=(i.title||'').trim();
        if(ti){
          if(ti===t) add('w',b.id,tag+'的補充說明與按鈕文字完全相同，部分報讀軟體會唸兩次，建議留空或改寫成補充資訊。');
          if(ti.length>60) add('w',b.id,tag+'的補充說明過長（'+ti.length+' 字），報讀時會很冗長，建議精簡。');
          if(t && ti.indexOf(t)===-1 && !i.srOnly)
            add('w',b.id,tag+'的補充說明未包含按鈕文字。title 對報讀軟體支援不一致，若這段資訊是必要的，建議勾選「同時輸出為隱藏文字」。');
        }
        if(i.srOnly && !ti) add('w',b.id,tag+'勾選了隱藏文字，但補充說明是空的，不會產生任何效果。');
        if(i.isFile && !i.fileSize) add('w',b.id,tag+'建議標示檔案大小，讓使用者可預期下載時間。');
      });
      if(items.some(i=>i.style==='button')){
        const r=ratio(state.theme,'#FFFFFF');
        if(r < (AAA?7:4.5)) add('e',b.id,'按鈕底色與白字對比只有 '+r.toFixed(2)+':1，未達 '+(AAA?'7':'4.5')+':1，請到「樣式」調整主題色。');
      }
    }

    if(b.type==='files'){
      (d.items||[]).forEach((i,n)=>{
        if(!i.url) add('e',b.id,'第 '+(n+1)+' 個檔案缺少網址。');
        if(!i.type||!i.size) add('w',b.id,'第 '+(n+1)+' 個檔案建議補上格式與大小（例如 PDF、1.2 MB）。');
      });
    }

    if(b.type==='note'){
      if(!plain(d.html)) add('w',b.id,'提示方塊沒有內容。');
      add('i',b.id,'已在文字開頭加上「'+({info:'提醒',warn:'注意',ok:'完成'}[d.tone])+'：」，避免只靠顏色傳達訊息。');
    }

    if(b.type==='faq'){
      (d.items||[]).forEach((i,n)=>{
        if(!i.q.trim()) add('e',b.id,'第 '+(n+1)+' 題沒有問題文字。');
        if(!i.a.trim()) add('w',b.id,'第 '+(n+1)+' 題還沒有答案。');
      });
    }

    if(b.type==='video'){
      if(!d.url.trim()) add('e',b.id,'影片還沒有網址。');
      if(!d.title.trim()) add('e',b.id,'影片缺少標題，iframe 必須有 title 才能被輔具辨識。');
      if(!d.transcript.trim()){
        if(AAA) add('e',b.id,'AAA 要求影音提供文字稿（逐字稿），請補上。');
        else add('w',b.id,'建議補上文字稿或內容摘要，並確認影片本身有字幕。');
      }
    }
  });

  if(state.blocks.length && !hasHeading) add('w',null,'整篇沒有任何標題，長內容建議用 H'+(state.baseLevel||3)+'／H'+((state.baseLevel||3)+1)+' 分段，方便輔具跳讀。');
  return out;
}

/* =========================================================
   6. 畫面渲染
   ========================================================= */
function renderPalette(){
  $('#palette').innerHTML = Object.entries(TYPES).map(([k,v])=>
    '<button type="button" data-add="'+k+'"><i class="bi bi-'+v.icon+'" aria-hidden="true"></i>'+v.label+'</button>'
  ).join('');
}

const TEMPLATES = {
  '通用':{
    '最新消息公告':[
      ['heading',{lv:0,text:'114 年度活動報名開始'}],
      ['paragraph',{html:'本次活動開放線上報名，名額有限，額滿為止。'}],
      ['table',{caption:'活動資訊一覽',headers:['項目','內容'],rows:[['活動日期','114 年 9 月 15 日（星期日）'],['活動地點','本校大禮堂'],['報名期限','即日起至 8 月 31 日止']],scope:'row'}],
      ['link',{align:'left',items:[
        {text:'前往線上報名系統',url:'',newWindow:true,style:'button'},
        {text:'下載活動簡章',url:'',newWindow:true,style:'button',isFile:true,fileType:'PDF',fileSize:'1.2 MB'}
      ]}]
    ],
    '圖文並排區':[
      ['heading',{lv:0,text:'服務項目'}],
      ['imageText',{pos:'left',ratio:'1-2',heading:'線上申辦服務',html:'民眾可透過線上系統完成申辦，免除臨櫃排隊等候。',linkText:'前往線上申辦系統',linkUrl:'',linkNew:true}],
      ['imageText',{pos:'right',ratio:'1-2',heading:'臨櫃服務時間',html:'週一至週五 08:30 至 17:30，中午不休息。'}]
    ],
    '常見問答 FAQ':[
      ['heading',{lv:0,text:'常見問答'}],
      ['faq',{mode:'details',items:[{q:'報名要準備什麼資料？',a:'請準備身分證明文件與近三個月內證件照。'},{q:'可以現場報名嗎？',a:'本次僅開放線上報名。'}]}]
    ],
    '檔案下載專區':[
      ['heading',{lv:0,text:'表單下載'}],
      ['note',{tone:'info',title:'檔案格式說明',html:'PDF 檔請使用瀏覽器或 Adobe Reader 開啟；ODT 為開放文件格式，可用 LibreOffice 或 Word 開啟。'}],
      ['files',{title:'相關附件下載',items:[{name:'報名表',url:'',type:'ODT',size:'80 KB'},{name:'活動簡章',url:'',type:'PDF',size:'1.2 MB'}]}]
    ],
    '聯絡資訊':[
      ['heading',{lv:0,text:'聯絡我們'}],
      ['list',{ordered:false,items:['承辦單位：秘書室','電話：(02) 1234-5678 分機 100','電子信箱：service@example.gov.tw','服務時間：週一至週五 08:30–17:30']}]
    ]
  },

  '學校':{
    '招生／甄選公告':[
      ['heading',{lv:0,text:'114 學年度新生入學招生公告'}],
      ['note',{tone:'warn',title:'報名截止日',html:'網路報名系統將於 114 年 4 月 30 日下午 5 時準時關閉，逾時系統不再受理。'}],
      ['paragraph',{html:'依據本校 114 學年度招生委員會決議辦理，招生名額與報名方式詳如下表。'}],
      ['heading',{lv:1,text:'重要時程'}],
      ['table',{caption:'114 學年度招生重要時程',headers:['階段','日期','說明'],rows:[['網路報名','114 年 4 月 1 日至 4 月 30 日','逾期不受理'],['資料審查','114 年 5 月 10 日至 5 月 20 日',''],['放榜公告','114 年 5 月 30 日','公告於本校網站']],scope:'col'}],
      ['heading',{lv:1,text:'應繳交資料'}],
      ['list',{ordered:true,items:['報名表（於系統填寫後列印並簽名）','歷年成績單正本','國民身分證影本（正反面）','其他有利審查之證明文件']}],
      ['files',{title:'簡章與表件下載',items:[{name:'114 學年度招生簡章',url:'',type:'PDF',size:'2.4 MB'},{name:'報名表',url:'',type:'ODT',size:'96 KB'},{name:'家長同意書',url:'',type:'ODT',size:'52 KB'}]}],
      ['link',{align:'left',items:[{text:'前往網路報名系統',url:'',newWindow:true,style:'button'}]}],
      ['heading',{lv:1,text:'招生諮詢窗口'}],
      ['list',{ordered:false,items:['教務處註冊組','電話：(02) 1234-5678 分機 210','電子信箱：admission@example.edu.tw']}]
    ],
    '課程／研習報名':[
      ['heading',{lv:0,text:'教師專業成長研習報名'}],
      ['paragraph',{html:'本研習全程參與者核發 6 小時教師研習時數，敬請踴躍報名。'}],
      ['table',{caption:'研習課程資訊',headers:['項目','內容'],rows:[['課程名稱','數位教學工具實作工作坊'],['辦理日期','114 年 7 月 12 日（星期六）09:00–16:00'],['辦理地點','本校圖書館 3 樓研習教室'],['參加對象','本校及鄰近學校在職教師'],['錄取名額','40 名，依報名先後錄取'],['報名費用','免費，午餐由本校提供']],scope:'row'}],
      ['heading',{lv:1,text:'報名注意事項'}],
      ['list',{ordered:true,items:['請自備筆記型電腦，現場提供無線網路。','報名後如需取消，請於研習前 3 日來電告知，以利遞補。','有特殊飲食或無障礙需求者，請於報名表備註欄填寫。']}],
      ['link',{align:'left',items:[{text:'填寫研習報名表',url:'',newWindow:true,style:'button'}]}]
    ],
    '活動花絮':[
      ['heading',{lv:0,text:'114 年校慶運動會活動花絮'}],
      ['paragraph',{html:'本校於 114 年 3 月 15 日舉辦校慶運動會，全校師生與家長共襄盛舉。'}],
      ['imageText',{pos:'left',ratio:'1-1',heading:'開幕進場',html:'各年級以自製隊旗進場，展現班級特色。'}],
      ['imageText',{pos:'right',ratio:'1-1',heading:'大隊接力決賽',html:'六年級大隊接力於最後一棒完成逆轉，全場歡聲雷動。'}],
      ['image',{src:'',alt:'',decorative:false,caption:'圖說：全校師生於操場合影留念'}]
    ],
    '獎助學金申請':[
      ['heading',{lv:0,text:'114 學年度第 1 學期清寒獎助學金申請'}],
      ['paragraph',{html:'為協助經濟弱勢學生安心就學，本學期開放清寒獎助學金申請，請符合資格者於期限內備齊文件送交學務處。'}],
      ['heading',{lv:1,text:'申請資格'}],
      ['list',{ordered:true,items:['本校在學學生，前一學期學業成績及格。','家庭年所得總額低於新臺幣 70 萬元。','未同時領取其他政府核發之同性質補助。']}],
      ['heading',{lv:1,text:'應備文件'}],
      ['table',{caption:'應繳交文件一覽',headers:['文件名稱','份數','備註'],rows:[['申請表','1 份','請用正楷填寫並簽名'],['全戶戶籍謄本','1 份','三個月內申請'],['最近年度所得清單','1 份','國稅局申請'],['前學期成績單','1 份','向教務處申請']],scope:'col'}],
      ['note',{tone:'warn',title:'收件期限',html:'請於 114 年 9 月 30 日前送達學務處生活輔導組，逾期恕不受理。'}],
      ['files',{title:'表件下載',items:[{name:'獎助學金申請表',url:'',type:'ODT',size:'72 KB'},{name:'切結書',url:'',type:'PDF',size:'48 KB'}]}]
    ]
  },

  '政府機關':{
    '政令宣導公告':[
      ['heading',{lv:0,text:'○○補助計畫申請作業開始受理'}],
      ['note',{tone:'info',title:'法令依據',html:'依「○○○○管理辦法」第 12 條規定辦理。'}],
      ['paragraph',{html:'為推動相關政策，本府自即日起受理民眾申請，相關規定說明如下。'}],
      ['heading',{lv:1,text:'重點說明'}],
      ['list',{ordered:true,items:['受理期間：即日起至 114 年 12 月 31 日止。','申請方式：親送、掛號郵寄或線上申辦擇一辦理。','審查期程：受理後 30 個工作日內完成審查並書面通知。']}],
      ['files',{title:'相關法規與表單',items:[{name:'管理辦法全文',url:'',type:'PDF',size:'320 KB'},{name:'申請書',url:'',type:'ODT',size:'64 KB'}]}],
      ['heading',{lv:1,text:'洽詢窗口'}],
      ['list',{ordered:false,items:['承辦單位：○○局○○科','電話：(02) 1234-5678 分機 300','傳真：(02) 1234-5679','地址：○○市○○區○○路 100 號 5 樓']}]
    ],
    '招標公告':[
      ['heading',{lv:0,text:'○○工程採購案招標公告'}],
      ['table',{caption:'招標案基本資料',headers:['項目','內容'],rows:[['案號','114-A-001'],['標案名稱','○○區公園設施改善工程'],['採購金額級距','公告金額以上未達查核金額'],['招標方式','公開招標'],['決標方式','最低標'],['截止投標','114 年 8 月 20 日 17:00 前'],['開標時間','114 年 8 月 21 日 10:00']],scope:'row'}],
      ['heading',{lv:1,text:'投標須知重點'}],
      ['list',{ordered:true,items:['投標廠商應具備營造業登記證書。','押標金新臺幣 10 萬元整，得以現金或金融機構本票繳納。','投標文件應密封並於截止時間前送達本府採購科。']}],
      ['note',{tone:'warn',title:'公告以政府電子採購網為準',html:'本頁資訊僅供參考，如與政府電子採購網公告內容不一致，以電子採購網為準。'}],
      ['files',{title:'招標文件下載',items:[{name:'招標公告',url:'',type:'PDF',size:'180 KB'},{name:'投標須知',url:'',type:'PDF',size:'420 KB'},{name:'契約草案',url:'',type:'PDF',size:'560 KB'}]}]
    ],
    '補助申請須知':[
      ['heading',{lv:0,text:'114 年度○○補助申請須知'}],
      ['heading',{lv:1,text:'申請資格'}],
      ['list',{ordered:true,items:['設籍本市滿一年之市民。','家庭總收入未超過當年度中低收入戶標準。','同一年度未重複申請本府其他同性質補助。']}],
      ['heading',{lv:1,text:'補助額度'}],
      ['table',{caption:'補助項目與額度',headers:['補助項目','補助額度','備註'],rows:[['設備費','最高 3 萬元','需檢附估價單'],['修繕費','最高 5 萬元','需檢附照片'],['其他必要費用','最高 1 萬元','由審查小組認定']],scope:'col'}],
      ['heading',{lv:1,text:'應備文件'}],
      ['list',{ordered:true,items:['申請書一份','國民身分證影本','戶籍謄本（三個月內）','郵局或銀行存摺封面影本']}],
      ['faq',{mode:'details',items:[{q:'可以委託他人代辦嗎？',a:'可以，須另附委託書及受託人身分證影本。'},{q:'審查結果多久會通知？',a:'受理後 30 個工作日內以書面通知，並同步於本府網站公告。'}]}],
      ['files',{title:'表單下載',items:[{name:'補助申請書',url:'',type:'ODT',size:'88 KB'},{name:'委託書',url:'',type:'ODT',size:'40 KB'}]}]
    ],
    '新聞稿':[
      ['heading',{lv:0,text:'○○市推動友善城市計畫　首站啟用'}],
      ['paragraph',{html:'○○市政府今日於○○區舉行啟用典禮，市長親自出席並與民眾互動，宣示推動無障礙友善環境的決心。'}],
      ['image',{src:'',alt:'',decorative:false,caption:'圖說：市長於啟用典禮與現場民眾合影'}],
      ['paragraph',{html:'本計畫預計於 114 年底前完成全市 20 處據點改善，包含人行道整平、無障礙坡道增設與語音號誌建置。'}],
      ['quote',{text:'friendly city 不只是硬體改善，而是讓每一位市民都能安心走出家門。',source:'○○市市長'}],
      ['heading',{lv:1,text:'新聞聯絡人'}],
      ['list',{ordered:false,items:['新聞聯絡人：○○○','電話：(02) 1234-5678 分機 500','電子信箱：pr@example.gov.tw']}]
    ]
  },

  '法人／協會':{
    '活動報名':[
      ['heading',{lv:0,text:'2026 年度公益講座報名開始'}],
      ['imageText',{pos:'left',ratio:'1-2',heading:'活動主題',html:'邀請長期投入社區服務的講者，分享第一線的觀察與實務經驗。',linkText:'',linkUrl:''}],
      ['table',{caption:'活動資訊',headers:['項目','內容'],rows:[['活動日期','115 年 3 月 8 日（星期日）14:00–16:30'],['活動地點','○○文化中心 2 樓演講廳'],['參加對象','對社區服務有興趣之民眾'],['名額','120 名'],['費用','免費，需事先報名']],scope:'row'}],
      ['heading',{lv:1,text:'報名須知'}],
      ['list',{ordered:true,items:['報名成功後將以電子郵件寄送確認信。','活動當日請提前 15 分鐘完成報到。','會場設有無障礙席位，有需求者請於報名時勾選。']}],
      ['note',{tone:'info',title:'交通與停車',html:'建議搭乘大眾運輸前往，會場周邊停車位有限。'}],
      ['link',{align:'left',items:[{text:'填寫線上報名表',url:'',newWindow:true,style:'button'}]}]
    ],
    '志工招募':[
      ['heading',{lv:0,text:'115 年度志工夥伴招募'}],
      ['paragraph',{html:'我們正在尋找願意投入社區服務的夥伴，一起讓改變發生。'}],
      ['heading',{lv:1,text:'服務內容'}],
      ['list',{ordered:false,items:['活動現場協助（報到、引導、器材整理）','行政文書與資料建檔','社群媒體圖文編輯']}],
      ['table',{caption:'招募資訊',headers:['項目','內容'],rows:[['招募人數','20 名'],['服務時段','每月至少 8 小時，時段可協調'],['服務地點','本會辦公室及活動現場'],['報名期限','115 年 1 月 31 日止']],scope:'row'}],
      ['heading',{lv:1,text:'我們提供'}],
      ['list',{ordered:false,items:['志願服務紀錄冊登錄時數','完整職前訓練與督導支持','志工保險與交通費補助']}],
      ['link',{align:'left',items:[{text:'填寫志工報名表',url:'',newWindow:true,style:'button'}]}]
    ],
    '捐款資訊':[
      ['heading',{lv:0,text:'捐款支持我們'}],
      ['paragraph',{html:'您的每一筆捐款，都會轉化為第一線的服務能量。本會為經主管機關立案之非營利組織，捐款可依法列舉扣除。'}],
      ['heading',{lv:1,text:'捐款方式'}],
      ['table',{caption:'各種捐款方式說明',headers:['方式','資訊','備註'],rows:[['銀行轉帳','○○銀行 ○○分行　帳號 000-000-000000','戶名：社團法人○○協會'],['郵政劃撥','帳號 00000000','戶名：社團法人○○協會'],['線上信用卡','請點下方按鈕前往捐款頁面','可設定定期定額']],scope:'col'}],
      ['note',{tone:'info',title:'捐款收據',html:'收據將於次月月底前寄出。如需電子收據或有其他需求，請來電告知。'}],
      ['files',{title:'財務公開資訊',items:[{name:'114 年度財務報表',url:'',type:'PDF',size:'1.1 MB'},{name:'114 年度勸募成果報告',url:'',type:'PDF',size:'2.3 MB'}]}],
      ['link',{align:'left',items:[{text:'前往線上捐款頁面',url:'',newWindow:true,style:'button'}]}]
    ],
    '年度成果報告':[
      ['heading',{lv:0,text:'114 年度服務成果報告'}],
      ['paragraph',{html:'感謝一整年來每一位捐款人、志工與合作夥伴的支持，以下為本會 114 年度的服務成果。'}],
      ['heading',{lv:1,text:'年度重點成果'}],
      ['list',{ordered:false,items:['服務個案累計 1,280 人次，較前一年成長 18%。','培訓志工 96 名，累計服務時數達 12,400 小時。','與 8 所學校建立長期合作關係。']}],
      ['table',{caption:'114 年度各項服務統計',headers:['服務項目','服務人次','較前一年增減'],rows:[['社區關懷訪視','520','增加 62 人次'],['課後陪伴','430','增加 85 人次'],['家庭支持服務','330','增加 48 人次']],scope:'col'}],
      ['files',{title:'完整報告下載',items:[{name:'114 年度成果報告書',url:'',type:'PDF',size:'4.2 MB'},{name:'114 年度財務報表',url:'',type:'PDF',size:'1.1 MB'}]}]
    ]
  }
};
const TPL_INDEX = {};
Object.values(TEMPLATES).forEach(g=>Object.assign(TPL_INDEX,g));

/* =========================================================
   範本庫資料：左側常用版型＋擴充範本，依「單位類型 × 內容主題」分類
   ========================================================= */
const LIB_TOPICS = ['公告','招生報名','報導','介紹','表格','其他'];
/* 左側常用版型沿用原資料，只補上內容主題 */
const TPL_TOPIC = {
  '最新消息公告':'公告','圖文並排區':'介紹','常見問答 FAQ':'其他','檔案下載專區':'其他','聯絡資訊':'其他',
  '招生／甄選公告':'招生報名','課程／研習報名':'招生報名','活動花絮':'報導','獎助學金申請':'招生報名',
  '政令宣導公告':'公告','招標公告':'公告','補助申請須知':'公告','新聞稿':'報導',
  '活動報名':'招生報名','志工招募':'招生報名','捐款資訊':'其他','年度成果報告':'報導'
};
const LIB_EXTRA = [
  /* ---------- 通用 ---------- */
  {name:'系統維護公告',unit:'通用',topic:'公告',blocks:[
    ['heading',{lv:0,text:'網站系統維護暫停服務公告'}],
    ['note',{tone:'warn',title:'維護期間',html:'115 年 10 月 3 日（星期六）22:00 至 10 月 4 日（星期日）06:00。'}],
    ['paragraph',{html:'為提升系統效能與資訊安全，本網站將進行主機升級作業，維護期間暫停下列服務，造成不便敬請見諒。'}],
    ['table',{caption:'維護期間服務影響範圍',headers:['服務項目','維護期間狀態'],rows:[['線上申辦','暫停'],['會員登入','暫停'],['網站瀏覽','正常'],['檔案下載','正常']],scope:'both'}],
    ['paragraph',{html:'若提前完成維護將立即恢復服務，不另行通知。'}]
  ]},
  {name:'休館公告',unit:'通用',topic:'公告',blocks:[
    ['heading',{lv:0,text:'館舍設備更新休館公告'}],
    ['paragraph',{html:'為進行空調與消防設備更新工程，本館將暫停開放，工程期間造成不便，敬請見諒。'}],
    ['table',{caption:'休館期間與服務調整',headers:['項目','說明'],rows:[['休館期間','115 年 11 月 2 日至 11 月 30 日'],['還書方式','請利用館外 24 小時還書箱'],['借閱期限','休館期間到期者一律順延至 12 月 7 日'],['線上服務','電子書與線上資料庫正常開放']],scope:'row'}],
    ['note',{tone:'info',title:'預約取書',html:'已到館的預約書，保留期限順延至重新開館後 7 日。'}]
  ]},
  {name:'活動延期公告',unit:'通用',topic:'公告',blocks:[
    ['heading',{lv:0,text:'秋季健走活動延期辦理公告'}],
    ['note',{tone:'warn',title:'活動延期',html:'因颱風來襲，原訂 10 月 17 日舉辦之秋季健走活動延期至 11 月 7 日（星期六）。'}],
    ['paragraph',{html:'已完成報名者免重新報名，報名資格自動保留。若新日期無法參加，請於 10 月 31 日前來電辦理取消，報名費將全額退還。'}],
    ['table',{caption:'活動日期調整對照',headers:['項目','原訂','調整後'],rows:[['活動日期','10 月 17 日（星期六）','11 月 7 日（星期六）'],['報到時間','07:30','07:30（不變）'],['集合地點','河濱公園入口廣場','河濱公園入口廣場（不變）']],scope:'both'}],
    ['list',{ordered:false,items:['洽詢電話：(02) 1234-5678 分機 220','服務時間：週一至週五 09:00–17:00']}]
  ]},
  {name:'競賽徵件',unit:'通用',topic:'招生報名',blocks:[
    ['heading',{lv:0,text:'第 5 屆城市攝影競賽徵件'}],
    ['paragraph',{html:'以「日常中的城市風景」為主題，邀請大眾用鏡頭記錄生活周遭的美好瞬間。'}],
    ['table',{caption:'徵件資訊',headers:['項目','內容'],rows:[['參賽資格','不限年齡與國籍，業餘與專業皆可'],['作品規格','JPG 格式，長邊 3000 像素以上'],['收件期間','115 年 9 月 1 日至 10 月 31 日'],['得獎公布','115 年 12 月 15 日']],scope:'row'}],
    ['heading',{lv:1,text:'獎項'}],
    ['table',{caption:'各組獎項與獎金',headers:['獎項','名額','獎金'],rows:[['首獎','1 名','新臺幣 3 萬元'],['優選','3 名','新臺幣 1 萬元'],['佳作','10 名','新臺幣 2 千元']],scope:'both'}],
    ['files',{title:'簡章與表件',items:[{name:'徵件簡章',url:'',type:'PDF',size:'860 KB'},{name:'著作權授權同意書',url:'',type:'ODT',size:'45 KB'}]}],
    ['link',{align:'left',items:[{text:'前往線上投稿系統',url:'',newWindow:true,style:'button'}]}]
  ]},
  {name:'徵稿啟事',unit:'通用',topic:'招生報名',blocks:[
    ['heading',{lv:0,text:'116 年春季號刊物徵稿啟事'}],
    ['paragraph',{html:'本刊以「在地生活與人文」為主軸，歡迎各界投稿，分享您的觀察與故事。'}],
    ['heading',{lv:1,text:'徵稿類別'}],
    ['list',{ordered:false,items:['散文：1,500 至 3,000 字','人物側寫：2,000 至 4,000 字，需附受訪者同意書','攝影專題：8 至 12 張照片，每張附 50 字說明']}],
    ['heading',{lv:1,text:'投稿方式'}],
    ['list',{ordered:true,items:['將稿件存成 Word 或 ODT 檔，檔名註明類別與篇名。','寄至 editor@example.org，信件主旨註明「春季號投稿」。','截稿日期：116 年 1 月 15 日。']}],
    ['note',{tone:'info',title:'稿酬',html:'錄用稿件每千字新臺幣 1,000 元，攝影作品每張 500 元。'}]
  ]},
  {name:'線上課程',unit:'通用',topic:'招生報名',blocks:[
    ['heading',{lv:0,text:'數位素養線上課程開放選讀'}],
    ['paragraph',{html:'課程全程線上進行，可依自己的時間彈性學習，完成全部單元並通過測驗即可取得結業證明。'}],
    ['video',{url:'',title:'數位素養線上課程介紹',transcript:'本課程共分為四個單元，從網路資訊判讀、個人資料保護，到雲端文件協作與線上會議工具，每個單元約 20 分鐘，並附練習測驗。'}],
    ['table',{caption:'課程單元一覽',headers:['單元','主題','時長'],rows:[['1','網路資訊判讀','20 分鐘'],['2','個人資料保護','25 分鐘'],['3','雲端文件協作','20 分鐘'],['4','線上會議工具','15 分鐘']],scope:'col'}],
    ['link',{align:'left',items:[{text:'登入線上學習平台',url:'',newWindow:true,style:'button'}]}]
  ]},
  {name:'人物專訪',unit:'通用',topic:'報導',blocks:[
    ['heading',{lv:0,text:'把熱情化為行動：專訪社區營造推手'}],
    ['image',{src:'',alt:'',decorative:false,caption:'圖說：受訪者於社區共學教室分享經驗'}],
    ['paragraph',{html:'十年前回到家鄉，她發現老街上的店家一間間拉下鐵門。從一場市集開始，她號召居民一起找回街區的活力。'}],
    ['heading',{lv:1,text:'從一場市集開始'}],
    ['paragraph',{html:'第一次辦市集只有 12 個攤位，靠著口耳相傳，如今每月固定吸引上千人次參與。'}],
    ['quote',{text:'社區營造不是一個人的事，而是讓每個人都願意多做一點點。',source:'受訪者'}],
    ['heading',{lv:1,text:'下一步的計畫'}],
    ['paragraph',{html:'未來將與在地學校合作，把老街的故事整理成教材，讓孩子從小認識自己生長的地方。'}]
  ]},
  {name:'講座紀實',unit:'通用',topic:'報導',blocks:[
    ['heading',{lv:0,text:'「AI 時代的閱讀力」講座紀實'}],
    ['paragraph',{html:'本場講座於 115 年 8 月 23 日舉行，吸引近兩百位民眾到場聆聽，以下整理講座重點與完整影音。'}],
    ['heading',{lv:1,text:'講座重點'}],
    ['list',{ordered:false,items:['資訊量爆炸的時代，比讀得多更重要的是讀得懂。','善用 AI 摘要工具，但仍要回到原文查證。','每天 15 分鐘的深度閱讀，就能累積專注力。']}],
    ['video',{url:'',title:'AI 時代的閱讀力講座完整錄影',transcript:'主持人開場介紹講者後，講者從自身的閱讀習慣談起，說明如何在大量資訊中篩選值得細讀的內容，並示範如何比對 AI 摘要與原文的差異。'}],
    ['files',{title:'講座簡報下載',items:[{name:'講座簡報',url:'',type:'PDF',size:'3.6 MB'}]}]
  ]},
  {name:'服務流程說明',unit:'通用',topic:'介紹',blocks:[
    ['heading',{lv:0,text:'服務申請流程'}],
    ['paragraph',{html:'從提出申請到完成服務，大約需要 10 個工作天，流程說明如下。'}],
    ['list',{ordered:true,items:['線上填寫申請表，或至服務台索取紙本。','專人於 3 個工作天內來電確認需求。','安排服務時間並寄送確認通知。','完成服務後填寫滿意度問卷。']}],
    ['note',{tone:'info',title:'需要協助填表？',html:'如填寫申請表有困難，歡迎來電 (02) 1234-5678，由專人協助代填。'}],
    ['link',{align:'left',items:[{text:'填寫線上申請表',url:'',newWindow:true,style:'button'}]}]
  ]},
  {name:'收費標準',unit:'通用',topic:'表格',blocks:[
    ['heading',{lv:0,text:'場地租借收費標準'}],
    ['paragraph',{html:'以下費用皆含稅，租借時段以每 4 小時為一單位計算。'}],
    ['table',{caption:'各場地租借費用（每 4 小時）',headers:['場地','容納人數','平日','假日'],rows:[['演講廳','200 人','8,000 元','10,000 元'],['多功能教室','60 人','3,000 元','3,600 元'],['會議室','20 人','1,200 元','1,500 元']],scope:'both'}],
    ['heading',{lv:1,text:'優惠方案'}],
    ['list',{ordered:false,items:['立案之非營利組織享 8 折優惠。','同一場地連續租借 3 日以上享 9 折優惠。','優惠不得合併使用。']}],
    ['files',{title:'申請表件',items:[{name:'場地租借申請表',url:'',type:'ODT',size:'68 KB'},{name:'場地使用管理規則',url:'',type:'PDF',size:'240 KB'}]}]
  ]},
  {name:'開放時間',unit:'通用',topic:'表格',blocks:[
    ['heading',{lv:0,text:'開放時間'}],
    ['table',{caption:'各區域開放時間',headers:['區域','星期二至星期五','星期六、日','星期一'],rows:[['一般閱覽區','08:30–21:00','08:30–17:00','休館'],['兒童閱覽區','09:00–17:00','09:00–17:00','休館'],['自修室','08:00–22:00','08:00–22:00','08:00–22:00']],scope:'both'}],
    ['note',{tone:'info',title:'國定假日',html:'國定假日休館，如遇補假依本館公告為準。'}]
  ]},
  {name:'研討會議程',unit:'通用',topic:'表格',blocks:[
    ['heading',{lv:0,text:'115 年度學術研討會議程'}],
    ['paragraph',{html:'研討會於 115 年 11 月 21 日（星期六）假本校國際會議廳舉行。'}],
    ['table',{caption:'研討會議程（11 月 21 日）',headers:['時間','議程','主持人／講者'],rows:[['08:30–09:00','報到','<'],['09:00–09:20','開幕致詞','校長'],['09:20–10:30','專題演講：永續城市的未來','○○○ 教授'],['10:30–10:50','茶敘','<'],['10:50–12:00','論文發表（一）','○○○ 副教授'],['12:00–13:00','午餐','<']],scope:'both'}],
    ['link',{align:'left',items:[{text:'填寫研討會報名表',url:'',newWindow:true,style:'button'}]}]
  ]},
  {name:'交通資訊',unit:'通用',topic:'其他',blocks:[
    ['heading',{lv:0,text:'交通資訊'}],
    ['paragraph',{html:'地址：○○市○○區○○路 100 號。建議搭乘大眾運輸前往，周邊停車位有限。'}],
    ['table',{caption:'各種交通方式',headers:['交通方式','搭乘資訊','步行時間'],rows:[['捷運','○○線○○站 2 號出口','約 5 分鐘'],['公車','搭乘 212、307 至○○路口站','約 3 分鐘'],['自行開車','國道 1 號○○交流道下，往○○方向','—']],scope:'both'}],
    ['heading',{lv:1,text:'無障礙設施'}],
    ['list',{ordered:false,items:['正門設有無障礙坡道與自動門。','地下停車場 B1 設有 4 格無障礙停車位。','各樓層皆有無障礙廁所與電梯。']}]
  ]},
  {name:'無障礙聲明',unit:'通用',topic:'其他',blocks:[
    ['heading',{lv:0,text:'無障礙聲明'}],
    ['paragraph',{html:'本網站依據數位發展部「網站無障礙規範」設計，致力讓所有使用者都能順利取得網站資訊。'}],
    ['heading',{lv:1,text:'我們的做法'}],
    ['list',{ordered:false,items:['所有圖片皆提供替代文字。','網站可完全使用鍵盤操作。','影音內容提供字幕或文字稿。','文字與背景色彩對比符合 AA 等級。']}],
    ['heading',{lv:1,text:'意見回饋'}],
    ['paragraph',{html:'若您在瀏覽本網站時遇到任何障礙，請來信 a11y@example.gov.tw 或來電 (02) 1234-5678，我們將於 7 個工作天內回覆。'}]
  ]},
  {name:'隱私權政策',unit:'通用',topic:'其他',blocks:[
    ['heading',{lv:0,text:'隱私權保護政策'}],
    ['paragraph',{html:'為保障您的權益，請詳閱下列本網站如何蒐集、使用及保護您個人資料的說明。'}],
    ['heading',{lv:1,text:'個人資料的蒐集與使用'}],
    ['paragraph',{html:'當您使用線上申辦、報名或意見信箱等服務時，我們會請您提供姓名、電話、電子郵件等必要資料，僅用於該項服務之聯繫與處理。'}],
    ['heading',{lv:1,text:'資料保護'}],
    ['paragraph',{html:'本網站主機設有防火牆與防毒系統，個人資料僅限經授權人員存取，並定期檢視安全措施。'}],
    ['heading',{lv:1,text:'政策修訂'}],
    ['paragraph',{html:'本政策將因應法令與技術發展適時修訂，修訂後將公告於本網站。'}]
  ]},
  {name:'網站導覽',unit:'通用',topic:'其他',blocks:[
    ['heading',{lv:0,text:'網站導覽'}],
    ['paragraph',{html:'本網站依無障礙原則設置快速鍵（Accesskey），方便使用鍵盤瀏覽。'}],
    ['table',{caption:'快速鍵說明',headers:['快速鍵','位置','說明'],rows:[['Alt+U','上方功能區','主選單與網站功能連結'],['Alt+C','中央內容區','本頁主要內容'],['Alt+Z','下方資訊區','聯絡資訊與網站相關聲明']],scope:'both'}],
    ['note',{tone:'info',title:'各瀏覽器的快速鍵用法',html:'Chrome、Edge 請按 Alt＋快速鍵；Firefox 請按 Alt＋Shift＋快速鍵；Mac 的 Safari 請按 Control＋Option＋快速鍵。'}],
    ['paragraph',{html:'如需調整字級，可按 Ctrl＋加號放大、Ctrl＋減號縮小（Mac 請改按 Command 鍵）。'}]
  ]},

  /* ---------- 學校 ---------- */
  {name:'停課公告',unit:'學校',topic:'公告',blocks:[
    ['heading',{lv:0,text:'颱風停課公告'}],
    ['note',{tone:'warn',title:'全校停課',html:'依○○市政府公告，本校 115 年 9 月 28 日（星期一）全日停止上班上課。'}],
    ['paragraph',{html:'停課期間請同學留在家中注意安全，勿前往海邊、山區等危險地區。原訂當日舉行之活動與考試另行公告補辦日期。'}],
    ['heading',{lv:1,text:'停課期間注意事項'}],
    ['list',{ordered:true,items:['線上課程照常開放，請依各科教師指示自主學習。','宿舍學生請配合舍監指示，勿任意外出。','如遇緊急狀況，請撥打校安專線 (02) 1234-5000。']}]
  ]},
  {name:'失物招領',unit:'學校',topic:'公告',blocks:[
    ['heading',{lv:0,text:'115 學年度第 1 學期失物招領'}],
    ['paragraph',{html:'以下物品於校內拾獲，請失主於 115 年 10 月 30 日前攜帶學生證至學務處認領，逾期將依規定處理。'}],
    ['table',{caption:'待認領物品清單',headers:['編號','物品','拾獲地點','拾獲日期'],rows:[['1','藍色水壺','體育館','9 月 15 日'],['2','黑色外套','圖書館 2 樓','9 月 18 日'],['3','計算機','理化實驗室','9 月 22 日']],scope:'col'}],
    ['note',{tone:'info',title:'認領時間',html:'週一至週五 08:00–16:30，地點為行政大樓 1 樓學務處。'}]
  ]},
  {name:'夏令營報名',unit:'學校',topic:'招生報名',blocks:[
    ['heading',{lv:0,text:'116 年兒童科學夏令營開始報名'}],
    ['imageText',{pos:'left',ratio:'1-2',heading:'動手做，玩出科學力',html:'透過實驗、闖關與團隊合作，讓孩子在遊戲中認識物理、化學與生物的奧妙。'}],
    ['table',{caption:'營隊梯次',headers:['梯次','日期','對象','名額'],rows:[['第一梯','7 月 5 日至 7 月 9 日','國小三、四年級','40 名'],['第二梯','7 月 12 日至 7 月 16 日','國小五、六年級','40 名']],scope:'both'}],
    ['heading',{lv:1,text:'費用與報名'}],
    ['list',{ordered:false,items:['費用：每人新臺幣 4,500 元，含材料、午餐與保險。','低收入戶與中低收入戶子女免費，每梯次名額 4 名。','報名期間：116 年 4 月 1 日至 5 月 15 日。']}],
    ['link',{align:'left',items:[{text:'前往夏令營報名系統',url:'',newWindow:true,style:'button'}]}]
  ]},
  {name:'招生說明會',unit:'學校',topic:'招生報名',blocks:[
    ['heading',{lv:0,text:'116 學年度招生說明會'}],
    ['paragraph',{html:'歡迎國中應屆畢業生與家長參加，由各科主任說明課程特色、升學進路與入學管道。'}],
    ['table',{caption:'說明會場次',headers:['場次','日期時間','地點'],rows:[['第一場','115 年 12 月 5 日（星期六）09:30','本校演藝廳'],['第二場','115 年 12 月 19 日（星期六）14:00','本校演藝廳'],['線上場','116 年 1 月 9 日（星期六）19:30','線上直播']],scope:'both'}],
    ['note',{tone:'info',title:'無障礙服務',html:'現場提供手語翻譯與無障礙座位，有需求者請於報名時註明。'}],
    ['link',{align:'left',items:[{text:'報名招生說明會',url:'',newWindow:true,style:'button'}]}]
  ]},
  {name:'錄取名單公告',unit:'學校',topic:'招生報名',blocks:[
    ['heading',{lv:0,text:'116 學年度甄選入學錄取名單公告'}],
    ['paragraph',{html:'本次甄選入學錄取名單如下，錄取生請於期限內完成報到，逾期視同放棄錄取資格。'}],
    ['table',{caption:'錄取名單（依准考證號碼排序）',headers:['准考證號碼','科別','錄取結果'],rows:[['A1160001','資訊科','正取'],['A1160015','資訊科','正取'],['A1160023','資訊科','備取 1'],['B1160004','商業經營科','正取']],scope:'both'}],
    ['note',{tone:'warn',title:'報到期限',html:'正取生請於 116 年 3 月 19 日 17:00 前完成線上報到。備取生遞補將以電話及電子郵件通知。'}],
    ['paragraph',{html:'依個人資料保護法規定，名單僅公布准考證號碼。'}]
  ]},
  {name:'退費標準',unit:'學校',topic:'表格',blocks:[
    ['heading',{lv:0,text:'學分班退費標準'}],
    ['paragraph',{html:'學員因故申請退費，依申請日期按下表比例退還學分費，雜費一經繳納恕不退還。'}],
    ['table',{caption:'學分費退費比例',headers:['申請退費時間','退還比例'],rows:[['開課日前','全額退還'],['開課日起未逾全期三分之一','退還二分之一'],['開課日起逾全期三分之一','不予退還']],scope:'both'}],
    ['files',{title:'退費申請表下載',items:[{name:'學分班退費申請表',url:'',type:'ODT',size:'54 KB'}]}]
  ]},
  {name:'班級課表',unit:'學校',topic:'表格',blocks:[
    ['heading',{lv:0,text:'115 學年度第 1 學期課表'}],
    ['table',{caption:'三年一班課表',headers:['節次','星期一','星期二','星期三','星期四','星期五'],rows:[['第 1 節','國語','數學','英語','國語','自然'],['第 2 節','數學','國語','數學','社會','國語'],['第 3 節','自然','體育','國語','數學','美勞'],['第 4 節','社會','英語','彈性課程','自然','體育']],scope:'both'}],
    ['note',{tone:'info',title:'星期三下午',html:'星期三下午不排課，學生於 12:20 放學。'}]
  ]},
  {name:'營養午餐菜單',unit:'學校',topic:'表格',blocks:[
    ['heading',{lv:0,text:'115 年 10 月第 1 週營養午餐菜單'}],
    ['table',{caption:'10 月 5 日至 10 月 9 日午餐菜單',headers:['日期','主食','主菜','副菜','湯品'],rows:[['10 月 5 日（一）','糙米飯','三杯雞','炒高麗菜','味噌湯'],['10 月 6 日（二）','燕麥飯','紅燒豆腐','涼拌小黃瓜','玉米濃湯'],['10 月 7 日（三）','炒麵','滷雞腿','燙青菜','紫菜蛋花湯'],['10 月 8 日（四）','白米飯','糖醋魚丁','蒜炒豆芽','冬瓜湯'],['10 月 9 日（五）','地瓜飯','咖哩豬肉','炒花椰菜','綠豆湯']],scope:'both'}],
    ['note',{tone:'info',title:'過敏原標示',html:'10 月 6 日玉米濃湯含乳製品，10 月 8 日糖醋魚丁含魚類，有過敏體質的學生請留意。'}],
    ['files',{title:'完整菜單與營養分析',items:[{name:'10 月份營養午餐菜單',url:'',type:'PDF',size:'420 KB'}]}]
  ]},
  {name:'師資介紹',unit:'學校',topic:'介紹',blocks:[
    ['heading',{lv:0,text:'師資介紹'}],
    ['imageText',{pos:'left',ratio:'1-2',heading:'王○○ 老師｜資訊科主任',html:'國立○○大學資訊工程碩士，專長程式設計與資訊安全，指導學生參加全國技能競賽屢獲佳績。'}],
    ['imageText',{pos:'left',ratio:'1-2',heading:'林○○ 老師｜英語教師',html:'英國○○大學英語教學碩士，擅長以戲劇與專題引導學生開口說英語。'}],
    ['imageText',{pos:'left',ratio:'1-2',heading:'陳○○ 老師｜數學教師',html:'國立○○師範大學數學系畢業，致力於推動差異化教學與數學閱讀。'}]
  ]},
  {name:'社團介紹',unit:'學校',topic:'介紹',blocks:[
    ['heading',{lv:0,text:'學生社團介紹'}],
    ['paragraph',{html:'本校共有 32 個學生社團，涵蓋學藝、康樂、服務與體育四大類，每學期初開放加入。'}],
    ['imageText',{pos:'left',ratio:'1-1',heading:'機器人研究社',html:'從組裝到程式控制，每年參加國際機器人競賽，培養動手實作與團隊合作能力。'}],
    ['imageText',{pos:'right',ratio:'1-1',heading:'國樂社',html:'擁有完整的吹、拉、彈、打編制，每學期舉辦成果發表音樂會。'}],
    ['faq',{mode:'details',items:[{q:'一個人可以參加幾個社團？',a:'每位同學可參加 1 個必修社團，另可自由加入 1 個課後社團。'},{q:'社團要繳費嗎？',a:'部分社團需自備材料或樂器，詳情請洽各社團指導老師。'}]}]
  ]},
  {name:'校友專訪',unit:'學校',topic:'報導',blocks:[
    ['heading',{lv:0,text:'傑出校友專訪：從偏鄉走向國際舞台'}],
    ['image',{src:'',alt:'',decorative:false,caption:'圖說：校友返校與學弟妹分享求學經驗'}],
    ['paragraph',{html:'畢業於本校 98 級的校友，目前在國際非營利組織擔任專案經理，負責東南亞地區的教育計畫。'}],
    ['heading',{lv:1,text:'在校時期的轉捩點'}],
    ['paragraph',{html:'高二參加英語辯論社，第一次站上全國比賽的舞台，讓她發現自己對公共議題的熱情。'}],
    ['quote',{text:'母校給我的不只是知識，而是勇敢嘗試的底氣。',source:'98 級校友'}],
    ['heading',{lv:1,text:'給學弟妹的話'}],
    ['paragraph',{html:'不要害怕和別人不一樣，找到自己真正在乎的事，就能走得很遠。'}]
  ]},
  {name:'研究成果發表',unit:'學校',topic:'報導',blocks:[
    ['heading',{lv:0,text:'本校團隊研發校園節能監測系統'}],
    ['paragraph',{html:'本校電機系研究團隊開發即時用電監測系統，試行一學期後，校園整體用電量較去年同期下降 12%。'}],
    ['heading',{lv:1,text:'研究成果摘要'}],
    ['table',{caption:'導入監測系統前後用電比較',headers:['建築','導入前（度）','導入後（度）','節省比例'],rows:[['行政大樓','42,000','37,380','11%'],['圖書館','58,000','49,880','14%'],['教學大樓','65,000','57,850','11%']],scope:'both'}],
    ['paragraph',{html:'研究團隊表示，未來將開放系統原始碼，供其他學校導入使用。'}],
    ['files',{title:'研究報告下載',items:[{name:'校園節能監測系統研究報告',url:'',type:'PDF',size:'2.8 MB'}]}]
  ]},

  /* ---------- 政府機關 ---------- */
  {name:'停水通知',unit:'政府機關',topic:'公告',blocks:[
    ['heading',{lv:0,text:'○○區計畫性停水通知'}],
    ['note',{tone:'warn',title:'停水時間',html:'115 年 10 月 14 日（星期三）22:00 至翌日 06:00，共 8 小時。'}],
    ['paragraph',{html:'為辦理自來水管線汰換工程，下列地區將暫停供水，請民眾提前儲水備用。'}],
    ['table',{caption:'停水影響範圍',headers:['行政區','影響路段'],rows:[['○○區','○○路一段 1 號至 200 號'],['○○區','○○街全段'],['△△區','△△路 50 巷至 120 巷']],scope:'col'}],
    ['heading',{lv:1,text:'停水期間注意事項'}],
    ['list',{ordered:true,items:['請關閉抽水馬達電源，以免空轉損壞。','恢復供水初期水質可能混濁，請先放流片刻再使用。','如有緊急用水需求，請撥打 1999 市民專線。']}]
  ]},
  {name:'施工交通管制',unit:'政府機關',topic:'公告',blocks:[
    ['heading',{lv:0,text:'○○路人行道改善工程交通管制公告'}],
    ['paragraph',{html:'為打造安全友善的步行環境，本府將進行○○路人行道拓寬與無障礙坡道改善工程。'}],
    ['table',{caption:'施工資訊',headers:['項目','內容'],rows:[['施工期間','115 年 10 月 5 日至 12 月 18 日'],['施工時段','每日 09:00–16:00，夜間與假日不施工'],['管制範圍','○○路（○○街至△△街）南側車道'],['替代道路','請改道△△路或□□路']],scope:'row'}],
    ['note',{tone:'warn',title:'行人通行',html:'施工路段設有臨時人行通道，視障朋友請留意現場引導人員指示。'}],
    ['list',{ordered:false,items:['施工單位：○○營造股份有限公司','陳情專線：(02) 1234-5678 分機 612']}]
  ]},
  {name:'約用人員甄選',unit:'政府機關',topic:'公告',blocks:[
    ['heading',{lv:0,text:'○○局約用人員甄選公告'}],
    ['table',{caption:'甄選職缺',headers:['職稱','名額','工作內容','薪資'],rows:[['行政助理','2 名','公文收發與檔案管理','月薪 34,000 元'],['資訊助理','1 名','網站維護與電腦設備管理','月薪 38,000 元']],scope:'both'}],
    ['heading',{lv:1,text:'應徵資格'}],
    ['list',{ordered:true,items:['具中華民國國籍。','大學以上畢業，資訊助理需具資訊相關科系學歷。','無公務人員任用法第 28 條所定情事。']}],
    ['heading',{lv:1,text:'報名方式'}],
    ['paragraph',{html:'請於 115 年 10 月 20 日前將履歷表、學歷證件影本寄至本局人事室，信封註明「應徵○○職缺」。身心障礙者及原住民同等條件下優先進用。'}],
    ['files',{title:'表件下載',items:[{name:'履歷表格式',url:'',type:'ODT',size:'58 KB'}]}]
  ]},
  {name:'樂齡課程招生',unit:'政府機關',topic:'招生報名',blocks:[
    ['heading',{lv:0,text:'樂齡學習中心秋季課程招生'}],
    ['paragraph',{html:'課程專為 55 歲以上長輩設計，全程免費，歡迎邀請親友一起來學習、交朋友。'}],
    ['table',{caption:'秋季課程一覽',headers:['課程','時間','地點'],rows:[['手機拍照與修圖','每週二 09:30–11:30','社區活動中心 2 樓'],['健康律動操','每週三 14:00–15:30','社區活動中心 1 樓'],['歌唱班','每週五 09:30–11:30','里民會堂']],scope:'both'}],
    ['heading',{lv:1,text:'報名方式'}],
    ['list',{ordered:false,items:['現場報名：週一至週五 09:00–17:00 至社區活動中心服務台。','電話報名：(02) 1234-5678 分機 21。']}],
    ['note',{tone:'info',title:'大字版簡章',html:'服務台備有大字版課程簡章，歡迎索取。'}]
  ]},
  {name:'組織與業務職掌',unit:'政府機關',topic:'介紹',blocks:[
    ['heading',{lv:0,text:'組織與業務職掌'}],
    ['paragraph',{html:'本局下設四科一室，負責本市文化資產保存、藝文推廣與場館營運等業務。'}],
    ['table',{caption:'各科室業務職掌與聯絡電話',headers:['科室','主要業務','聯絡電話'],rows:[['文化資產科','古蹟與歷史建築保存、文化資產審議','(02) 1234-5601'],['藝文推廣科','藝文活動規劃、藝文團體輔導','(02) 1234-5602'],['場館管理科','藝文場館營運與租借','(02) 1234-5603'],['影視產業科','影視拍攝協助、產業補助','(02) 1234-5604'],['秘書室','文書、總務、採購','(02) 1234-5605']],scope:'both'}]
  ]},
  {name:'計畫介紹',unit:'政府機關',topic:'介紹',blocks:[
    ['heading',{lv:0,text:'公共自行車友善城市計畫'}],
    ['imageText',{pos:'left',ratio:'1-1',heading:'計畫目標',html:'於 117 年前完成全市 300 處公共自行車站點，串聯捷運站、學校與公園，打造低碳通勤環境。'}],
    ['heading',{lv:1,text:'計畫期程'}],
    ['table',{caption:'計畫分期目標',headers:['期程','年度','累計完成站點數'],rows:[['第一期','115 年','100 處'],['第二期','116 年','200 處'],['第三期','117 年','300 處']],scope:'both'}],
    ['heading',{lv:1,text:'執行進度'}],
    ['paragraph',{html:'截至 115 年 8 月底，已完成 86 處站點建置，累計使用人次突破 120 萬。'}],
    ['faq',{mode:'details',items:[{q:'站點位置如何決定？',a:'依交通流量調查與市民提案綜合評估，並召開地方說明會後定案。'},{q:'我可以建議設站地點嗎？',a:'可以，請透過市民意見信箱提出，本局將納入評估。'}]}]
  ]},
  {name:'景點導覽',unit:'政府機關',topic:'介紹',blocks:[
    ['heading',{lv:0,text:'○○老街散步地圖'}],
    ['paragraph',{html:'全長約 1.2 公里的老街，保留日治時期的紅磚街屋，建議安排半天慢慢散步。'}],
    ['imageText',{pos:'left',ratio:'1-2',heading:'第一站：百年媽祖廟',html:'建於清朝道光年間，廟內木雕與石雕為縣定古蹟，每年農曆三月舉辦遶境活動。'}],
    ['imageText',{pos:'left',ratio:'1-2',heading:'第二站：紅磚街屋群',html:'立面保留巴洛克式山牆裝飾，目前多作為文創商店與咖啡館使用。'}],
    ['imageText',{pos:'left',ratio:'1-2',heading:'第三站：河岸觀景台',html:'傍晚可欣賞夕陽映照河面，是在地人最推薦的拍照地點。'}],
    ['note',{tone:'info',title:'無障礙資訊',html:'老街部分路段為石板路面，輪椅使用者建議由河岸步道進入，沿線設有無障礙廁所 2 處。'}]
  ]},
  {name:'特展介紹',unit:'政府機關',topic:'介紹',blocks:[
    ['heading',{lv:0,text:'「島嶼的色彩」特展'}],
    ['image',{src:'',alt:'',decorative:false,caption:'圖說：特展主視覺'}],
    ['table',{caption:'展覽資訊',headers:['項目','內容'],rows:[['展期','115 年 10 月 1 日至 116 年 1 月 3 日'],['地點','本館 3 樓特展室'],['開放時間','星期二至星期日 09:00–17:00'],['票價','免費參觀']],scope:'row'}],
    ['paragraph',{html:'本展精選 80 件館藏畫作，從日治時期到當代，呈現藝術家眼中的臺灣山海與城市色彩。'}],
    ['heading',{lv:1,text:'導覽服務'}],
    ['list',{ordered:false,items:['定時導覽：每週六、日 10:30、14:30，免預約。','口述影像導覽：每月第一個星期六，需事先預約。','手語導覽：團體 10 人以上可預約。']}]
  ]},
  {name:'法規修正對照表',unit:'政府機關',topic:'表格',blocks:[
    ['heading',{lv:0,text:'○○自治條例部分條文修正對照表'}],
    ['paragraph',{html:'本次修正第 5 條及第 12 條，業經市議會審議通過，自 116 年 1 月 1 日起施行。'}],
    ['table',{caption:'修正條文對照表',headers:['條次','修正條文','現行條文','說明'],rows:[['第 5 條','申請人應於活動日 30 日前提出申請。','申請人應於活動日 60 日前提出申請。','縮短申請期限，便利民眾。'],['第 12 條','違反第 5 條規定者，處新臺幣 3 千元以上 1 萬元以下罰鍰。','違反第 5 條規定者，處新臺幣 1 萬元罰鍰。','改採級距罰鍰，依情節輕重裁處。']],scope:'both'}],
    ['files',{title:'相關文件',items:[{name:'自治條例全文',url:'',type:'PDF',size:'210 KB'},{name:'修正草案總說明',url:'',type:'PDF',size:'150 KB'}]}]
  ]},
  {name:'假日值班表',unit:'政府機關',topic:'表格',blocks:[
    ['heading',{lv:0,text:'115 年 10 月假日值班表'}],
    ['paragraph',{html:'假日期間如有緊急事項，請撥打值班電話 (02) 1234-5999，由當日值班人員處理。'}],
    ['table',{caption:'10 月假日值班人員',headers:['日期','值班人員','代理人'],rows:[['10 月 3 日（星期六）','行政科 李○○','行政科 張○○'],['10 月 4 日（星期日）','行政科 張○○','行政科 李○○'],['10 月 10 日（國慶日）','秘書室 黃○○','秘書室 吳○○'],['10 月 11 日（星期日）','會計室 周○○','會計室 鄭○○']],scope:'both'}]
  ]},
  {name:'常用服務連結',unit:'政府機關',topic:'其他',blocks:[
    ['heading',{lv:0,text:'常用服務連結'}],
    ['paragraph',{html:'以下整理民眾最常使用的線上服務，點選後會開啟新視窗前往各服務網站。'}],
    ['heading',{lv:1,text:'線上申辦'}],
    ['link',{align:'left',items:[{text:'戶政線上申辦系統',url:'',newWindow:true,style:'text'},{text:'地政電子謄本申請',url:'',newWindow:true,style:'text'},{text:'稅務線上申報系統',url:'',newWindow:true,style:'text'}]}],
    ['heading',{lv:1,text:'生活資訊'}],
    ['link',{align:'left',items:[{text:'即時路況與停車資訊',url:'',newWindow:true,style:'text'},{text:'垃圾車即時動態查詢',url:'',newWindow:true,style:'text'}]}]
  ]},
  {name:'市民意見信箱',unit:'政府機關',topic:'其他',blocks:[
    ['heading',{lv:0,text:'市民意見信箱'}],
    ['paragraph',{html:'歡迎提供您對市政的建議，我們會在收到後 6 個工作天內回覆。'}],
    ['heading',{lv:1,text:'使用前請注意'}],
    ['list',{ordered:true,items:['請填寫真實姓名與聯絡方式，匿名或資料不全者恕不處理。','涉及個案陳情請附上相關資料，以利承辦單位查處。','同一事項重複來信，將不另行回覆。']}],
    ['note',{tone:'info',title:'緊急事件',html:'如遇緊急危難事件，請直接撥打 110 或 119，勿使用意見信箱。'}],
    ['link',{align:'left',items:[{text:'填寫市民意見信箱表單',url:'',newWindow:true,style:'button'}]}]
  ]},

  /* ---------- 法人／協會 ---------- */
  {name:'捐款徵信',unit:'法人／協會',topic:'公告',blocks:[
    ['heading',{lv:0,text:'115 年 9 月捐款徵信'}],
    ['paragraph',{html:'感謝每一位捐款人的支持，本月捐款明細如下。為保護捐款人隱私，姓名僅顯示姓氏。'}],
    ['table',{caption:'115 年 9 月捐款明細',headers:['日期','捐款人','金額','指定用途'],rows:[['9 月 3 日','王○○','1,000 元','不指定'],['9 月 10 日','李○○','5,000 元','兒童課輔'],['9 月 18 日','善心人士','2,000 元','不指定'],['9 月 25 日','○○股份有限公司','50,000 元','獨居長者送餐']],scope:'col'}],
    ['note',{tone:'info',title:'資料有誤？',html:'如發現徵信資料有誤，請於次月 15 日前來電 (02) 1234-5678 更正。'}]
  ]},
  {name:'會員招募',unit:'法人／協會',topic:'招生報名',blocks:[
    ['heading',{lv:0,text:'116 年度會員招募'}],
    ['paragraph',{html:'加入本會成為會員，與我們一起推動友善環境，並享有各項會員專屬權益。'}],
    ['table',{caption:'會員類別與年費',headers:['會員類別','資格','年費'],rows:[['個人會員','年滿 20 歲，認同本會宗旨者','1,000 元'],['學生會員','在學學生','300 元'],['團體會員','立案之法人或團體','5,000 元']],scope:'both'}],
    ['heading',{lv:1,text:'會員權益'}],
    ['list',{ordered:false,items:['免費參加本會年度講座與工作坊。','每季寄送會員電子報。','參與會員大會並享有表決權。']}],
    ['link',{align:'left',items:[{text:'填寫入會申請表',url:'',newWindow:true,style:'button'}]}]
  ]},
  {name:'暑期實習招募',unit:'法人／協會',topic:'招生報名',blocks:[
    ['heading',{lv:0,text:'116 年暑期實習生招募'}],
    ['paragraph',{html:'想了解非營利組織如何運作嗎？歡迎大專院校在學學生加入暑期實習計畫。'}],
    ['table',{caption:'實習職缺',headers:['實習組別','工作內容','名額'],rows:[['活動企劃組','協助規劃與執行社區活動','2 名'],['社群行銷組','撰寫社群貼文與製作圖卡','2 名'],['研究調查組','協助問卷調查與資料分析','1 名']],scope:'both'}],
    ['heading',{lv:1,text:'實習條件'}],
    ['list',{ordered:false,items:['實習期間：116 年 7 月 1 日至 8 月 31 日，每週 4 天。','提供實習津貼每月新臺幣 12,000 元。','可配合學校開立實習證明。']}],
    ['files',{title:'報名表件',items:[{name:'實習申請表',url:'',type:'ODT',size:'62 KB'}]}]
  ]},
  {name:'工作坊報名',unit:'法人／協會',topic:'招生報名',blocks:[
    ['heading',{lv:0,text:'非營利組織募款實務工作坊'}],
    ['paragraph',{html:'由資深募款顧問帶領，透過案例討論與實作演練，學會規劃一場成功的募款活動。'}],
    ['table',{caption:'工作坊資訊',headers:['項目','內容'],rows:[['日期','116 年 3 月 13 日（星期六）09:30–16:30'],['地點','本會 3 樓教室'],['對象','非營利組織工作者'],['費用','會員 800 元、非會員 1,200 元，含午餐'],['名額','30 名']],scope:'row'}],
    ['heading',{lv:1,text:'課程大綱'}],
    ['list',{ordered:true,items:['募款策略與年度規劃','捐款人關係經營','募款活動企劃實作','成果分享與講師回饋']}],
    ['link',{align:'left',items:[{text:'報名募款實務工作坊',url:'',newWindow:true,style:'button'}]}]
  ]},
  {name:'志工故事',unit:'法人／協會',topic:'報導',blocks:[
    ['heading',{lv:0,text:'志工故事：陪伴，是最溫柔的力量'}],
    ['imageText',{pos:'left',ratio:'1-1',heading:'從受助者到助人者',html:'十年前接受本會課輔服務的小女孩，如今成為大學生，每週回到據點陪伴學弟妹寫功課。'}],
    ['paragraph',{html:'她說，當年老師的一句鼓勵，讓她相信自己也能把書念好。現在，她想把這份相信傳下去。'}],
    ['quote',{text:'我記得被陪伴的感覺，所以我想成為那個陪伴別人的人。',source:'課輔志工'}],
    ['paragraph',{html:'本會目前有 96 位志工投入課輔、送餐與關懷訪視服務，歡迎您一起加入。'}]
  ]},
  {name:'媒體報導彙整',unit:'法人／協會',topic:'報導',blocks:[
    ['heading',{lv:0,text:'媒體報導'}],
    ['paragraph',{html:'以下為近期媒體對本會服務的相關報導。'}],
    ['heading',{lv:1,text:'115 年'}],
    ['list',{ordered:false,items:['9 月 12 日｜○○日報｜偏鄉課輔十年　陪伴孩子走出自己的路','7 月 3 日｜○○電視台｜獨居長者送餐　志工風雨無阻','5 月 20 日｜○○新聞網｜社區共餐凝聚鄰里情感']}],
    ['link',{align:'left',items:[{text:'查看歷年媒體報導清單',url:'',newWindow:true,style:'text'}]}]
  ]},
  {name:'關於我們',unit:'法人／協會',topic:'介紹',blocks:[
    ['heading',{lv:0,text:'關於我們'}],
    ['paragraph',{html:'社團法人○○協會成立於 95 年，長期關注弱勢兒童教育與獨居長者照顧，服務足跡遍及全市 12 個行政區。'}],
    ['imageText',{pos:'left',ratio:'1-2',heading:'我們的使命',html:'讓每個孩子都有公平的學習機會，讓每位長者都能安心在地老化。'}],
    ['heading',{lv:1,text:'服務項目'}],
    ['list',{ordered:false,items:['兒童課後陪伴與課業輔導','獨居長者送餐與關懷訪視','社區共餐與健康促進活動']}],
    ['heading',{lv:1,text:'組織沿革'}],
    ['table',{caption:'本會重要紀事',headers:['年份','紀事'],rows:[['95 年','經主管機關核准立案成立'],['101 年','成立第一個兒童課輔據點'],['108 年','開辦獨居長者送餐服務'],['114 年','服務據點擴展至 12 處']],scope:'row'}]
  ]},
  {name:'企業合作方案',unit:'法人／協會',topic:'介紹',blocks:[
    ['heading',{lv:0,text:'企業合作方案'}],
    ['paragraph',{html:'邀請企業透過員工志工日、專案贊助或物資捐贈，與我們一起投入社區服務。'}],
    ['table',{caption:'合作方案比較',headers:['方案','合作內容','適合對象'],rows:[['員工志工日','安排員工參與送餐或課輔服務一日','重視員工參與的企業'],['專案贊助','贊助特定服務專案並定期收到成果報告','希望長期投入的企業'],['物資捐贈','提供文具、食材或設備等物資','有閒置資源的企業']],scope:'both'}],
    ['faq',{mode:'details',items:[{q:'贊助金額可以開立收據嗎？',a:'可以，本會將開立捐款收據，可依法列舉扣除。'},{q:'可以指定服務區域嗎？',a:'可以，我們會依企業需求規劃合適的服務據點。'}]}],
    ['link',{align:'left',items:[{text:'聯繫企業合作窗口',url:'',newWindow:true,style:'button'}]}]
  ]},
  {name:'季刊電子報',unit:'法人／協會',topic:'其他',blocks:[
    ['heading',{lv:0,text:'115 年秋季電子報'}],
    ['paragraph',{html:'親愛的朋友您好，感謝您持續關注我們。以下是這一季的服務近況與活動預告。'}],
    ['heading',{lv:1,text:'本季服務成果'}],
    ['list',{ordered:false,items:['課輔據點新增 2 處，服務兒童 180 人。','送餐服務累計 8,600 份。','舉辦社區共餐 24 場。']}],
    ['heading',{lv:1,text:'活動預告'}],
    ['table',{caption:'秋季活動預告',headers:['日期','活動','地點'],rows:[['10 月 17 日','親子手作市集','本會一樓廣場'],['11 月 14 日','志工感恩餐會','○○餐廳'],['12 月 5 日','歲末送暖義賣','○○公園']],scope:'both'}],
    ['link',{align:'left',items:[{text:'訂閱本會電子報',url:'',newWindow:true,style:'button'}]}]
  ]},
  {name:'服務據點',unit:'法人／協會',topic:'其他',blocks:[
    ['heading',{lv:0,text:'服務據點'}],
    ['paragraph',{html:'本會於全市設有 4 處服務據點，歡迎就近洽詢。'}],
    ['table',{caption:'各服務據點地址與電話',headers:['據點','地址','電話','服務時間'],rows:[['總會','○○市○○區○○路 100 號','(02) 1234-5678','週一至週五 09:00–18:00'],['東區據點','○○市○○區△△街 25 號','(02) 2345-6789','週一至週五 13:00–20:00'],['南區據點','○○市○○區□□路 88 號','(02) 3456-7890','週一至週六 13:00–20:00'],['北區據點','○○市○○區◇◇路 12 號','(02) 4567-8901','週二至週六 10:00–18:00']],scope:'both'}],
    ['note',{tone:'info',title:'無障礙設施',html:'總會與東區據點設有無障礙坡道與廁所，其他據點如需協助請事先來電。'}]
  ]}
];
const LIBRARY = Object.entries(TEMPLATES)
  .flatMap(([unit,g])=>Object.entries(g).map(([name,blocks])=>({name,unit,topic:TPL_TOPIC[name],blocks})))
  .concat(LIB_EXTRA);

function renderTemplates(){
  const cats=Object.keys(TEMPLATES);
  const cur=state.tplCat||cats[0];
  $('#templates').innerHTML =
    '<button type="button" class="tpl-open" data-bs-toggle="modal" data-bs-target="#libModal">瀏覽範本庫'
    +'<span>'+LIBRARY.length+' 套現成版型＋'+Object.keys(TYPES).length+' 種元素</span></button>'
    +'<label class="fl" for="tplCat">單位類型</label>'
    +'<select class="form-select form-select-sm mb-2" id="tplCat">'
    + cats.map(c=>'<option value="'+c+'"'+(c===cur?' selected':'')+'>'+c+'</option>').join('')
    +'</select>'
    + Object.keys(TEMPLATES[cur]).map(k=>
      '<button type="button" data-tpl="'+k+'"><i class="bi bi-file-earmark-plus" aria-hidden="true"></i> '+k+'</button>'
    ).join('');
}

function blockStatus(id,issues){
  const mine=issues.filter(i=>i.id===id);
  if(mine.some(i=>i.lv==='e')) return 'err';
  if(mine.some(i=>i.lv==='w')) return 'warn';
  return 'ok';
}

function renderCanvas(){
  const list=$('#canvasList'), issues=audit();
  if(!state.blocks.length){
    list.innerHTML=
      '<div class="empty">'
      +'<div class="empty-ico" aria-hidden="true"><i class="bi bi-file-earmark-plus"></i></div>'
      +'<h2>還沒有任何內容</h2>'
      +'<p class="lead-sm">這裡會即時顯示編輯結果。完成後產生的原始碼，可直接貼到後台文章編輯器的「原始碼」檢視。</p>'
      +'<div class="steps">'
      +  '<div class="step"><span class="step-n" aria-hidden="true">1</span><div><b>放入內容</b>'
      +    '<span>從左側挑一組版型、單獨加入區塊，或把現成的 Word 文件整份匯入。</span></div></div>'
      +  '<div class="step"><span class="step-n" aria-hidden="true">2</span><div><b>填寫並修正</b>'
      +    '<span>點畫布上的區塊，右側就會出現設定欄位。每個區塊左上角的燈號會即時顯示是否合規，紅燈代表一定要修。</span></div></div>'
      +  '<div class="step"><span class="step-n" aria-hidden="true">3</span><div><b>複製原始碼</b>'
      +    '<span>右上角「產生原始碼」→ 複製 → 貼進後台的原始碼檢視 → 存檔，就完成了。</span></div></div>'
      +'</div>'
      +'<div class="quick">'
      +  '<button type="button" class="btn btn-accent btn-sm" data-quick="tpl"><i class="bi bi-collection" aria-hidden="true"></i> 從版型開始</button>'
      +  '<button type="button" class="btn btn-outline-dark btn-sm" data-quick="import"><i class="bi bi-file-earmark-word" aria-hidden="true"></i> 匯入 Word 文件</button>'
      +  '<button type="button" class="btn btn-outline-dark btn-sm" data-quick="block"><i class="bi bi-plus-lg" aria-hidden="true"></i> 加入單一區塊</button>'
      +  '<button type="button" class="btn btn-link btn-sm" data-quick="demo">載入範例看看效果</button>'
      +'</div>'
      +'<p class="empty-foot">圖片與檔案請先上傳到後台媒體庫，再把網址填回本工具。未填網址時，畫布會先用示意圖排版。</p>'
      +'</div>';
    return;
  }
  list.innerHTML = state.blocks.map((b,i)=>{
    const st=blockStatus(b.id,issues);
    return '<article class="blk'+(b.id===state.sel?' is-active':'')+'" data-id="'+b.id+'" draggable="true" aria-label="'+TYPES[b.type].label+'區塊，第 '+(i+1)+' 個">'
      + '<div class="blk-bar">'
      +   '<span class="dot '+st+'" aria-hidden="true"></span>'
      +   '<span class="blk-tag handle"><i class="bi bi-grip-vertical" aria-hidden="true"></i>'+TYPES[b.type].label+'</span>'
      +   '<span class="visually-hidden">'+({ok:'檢測通過',warn:'有建議事項',err:'有必須修正的問題'}[st])+'</span>'
      +   '<span class="tools">'
      +     '<button type="button" data-act="up" data-id="'+b.id+'" title="上移" aria-label="把第 '+(i+1)+' 個區塊上移"'+(i===0?' disabled':'')+'><i class="bi bi-arrow-up" aria-hidden="true"></i></button>'
      +     '<button type="button" data-act="down" data-id="'+b.id+'" title="下移" aria-label="把第 '+(i+1)+' 個區塊下移"'+(i===state.blocks.length-1?' disabled':'')+'><i class="bi bi-arrow-down" aria-hidden="true"></i></button>'
      +     '<button type="button" data-act="copy" data-id="'+b.id+'" title="複製" aria-label="複製第 '+(i+1)+' 個區塊"><i class="bi bi-files" aria-hidden="true"></i></button>'
      +     '<button type="button" class="del" data-act="del" data-id="'+b.id+'" title="刪除" aria-label="刪除第 '+(i+1)+' 個區塊"><i class="bi bi-trash3" aria-hidden="true"></i></button>'
      +   '</span>'
      + '</div>'
      + '<div class="blk-body doc" data-open="'+b.id+'">'+previewHTML(b)+'</div>'
      + '</article>';
  }).join('');
}

function renderAudit(){
  const issues=audit(), box=$('#audit');
  const e=issues.filter(i=>i.lv==='e').length, w=issues.filter(i=>i.lv==='w').length;
  const score=Math.max(0,100-e*12-w*4);
  const pass = e===0;
  $('#issueCount').textContent = e+w;
  $('#issueCount').className = 'badge ' + (e ? 'text-bg-danger' : (w?'text-bg-warning':'text-bg-success'));

  const blank = !state.blocks.length;
  let html='<div class="gauge '+(blank?'':(pass?'pass':(e?'fail':'')))+'">'
    +'<div><div class="score">'+(blank?'—':score)+'</div><div class="lbl">分數</div></div>'
    +'<div><div class="verdict">'+(blank?'尚未開始':(pass?'符合 WCAG 2.1 '+state.level:'尚有 '+e+' 項必須修正'))+'</div>'
    +'<div class="lbl">'+(blank?'加入內容後開始檢測':e+' 項錯誤 ・ '+w+' 項建議')+'</div></div></div>';

  html+='<p class="hint mt-2 mb-2">點任一項目可跳到對應區塊。錯誤（紅）會影響標章檢測，建議（黃）為加分項。</p>';
  if(!issues.length) html+='<p class="hint">目前沒有偵測到問題。</p>';
  issues.forEach(i=>{
    const ic={e:'x-circle-fill',w:'exclamation-triangle-fill',i:'info-circle-fill'}[i.lv];
    const where=i.id?('在「'+TYPES[getBlock(i.id).type].label+'」區塊'):'整篇內容';
    html+='<button type="button" class="issue '+i.lv+'" data-goto="'+(i.id||'')+'">'
      +'<i class="bi bi-'+ic+'" aria-hidden="true"></i><span>'+esc(i.msg)+'<span class="where">'+where+'</span></span></button>';
  });
  box.innerHTML=html;
}

function renderStyle(){
  const r=ratio(state.theme,'#FFFFFF');
  const aa=r>=4.5, aaa=r>=7;
  $('#styleTab').innerHTML =
    '<div class="field"><label for="baseLevel">內文起始標題層級</label>'
    +'<select class="form-select" id="baseLevel">'
    + [2,3,4].map(n=>'<option value="'+n+'"'+(state.baseLevel===n?' selected':'')+'>H'+n+' 起（區塊小標為 H'+(n+1)+'）</option>').join('')
    +'</select>'
    +'<p class="hint">後台頁面標題通常已是 H1、單元名稱是 H2，內文從 H3 起才不會跳階。改這裡，所有標題區塊與區塊內建小標會一起換算。</p></div>'
    +'<hr>'
    +'<div class="form-check mb-3"><input class="form-check-input" type="checkbox" id="styleText"'+(state.styleText?' checked':'')+'>'
    +'<label class="form-check-label" for="styleText">同時輸出標題與內文樣式</label>'
    +'<p class="hint">勾選後，標題會帶字級、行高、色塊等樣式（不含字型設定），貼到後台就有層次。若後台文章區已有自己的標題樣式，取消勾選可避免打架。此設定不影響「純語義」輸出模式。</p></div>'
    +'<div class="field"><label for="themeColor">主題色（按鈕與提示方塊）</label>'
    +'<div class="d-flex gap-2 align-items-center">'
    +'<input type="color" class="swatch" id="themeColor" value="'+state.theme+'">'
    +'<input type="text" class="form-control" id="themeHex" value="'+state.theme+'" aria-label="色碼">'
    +'</div>'
    +'<p class="hint">白字在此底色上的對比為 <strong>'+r.toFixed(2)+':1</strong>　'
    +'AA（4.5:1）'+(aa?'✅ 通過':'❌ 未通過')+'　AAA（7:1）'+(aaa?'✅ 通過':'❌ 未通過')+'</p></div>'
    +'<hr><div class="field"><span class="fl">輸出不含字型設定</span>'
    +'<p class="hint">產生的原始碼不會寫入 font-family 與文字顏色，會沿用網站後台原本的樣式，避免和網站設計打架。</p></div>'
    +'<div class="field"><span class="fl">類別前綴</span><p class="hint">類別模式會使用專屬前綴 <code>'+PFX+'-</code>，不會覆蓋到網站既有樣式。</p></div>';
}

function refreshAll(){
  renderCanvas(); renderAudit();
  const cb=$('#btnClear'); if(cb) cb.disabled=!state.blocks.length;
}

/* =========================================================
   7. 屬性面板
   ========================================================= */
function f(label,field,val,type,hint,attrs){
  type=type||'text';
  return '<div class="field"><label for="fld-'+field+'">'+label+'</label>'
    +'<input class="form-control" type="'+type+'" id="fld-'+field+'" data-field="'+field+'" value="'+esc(val)+'" '+(attrs||'')+'>'
    +(hint?'<p class="hint">'+hint+'</p>':'')+'</div>';
}
function ta(label,field,val,hint,transform,rows){
  return '<div class="field"><label for="fld-'+field+'">'+label+'</label>'
    +'<textarea class="form-control" rows="'+(rows||4)+'" id="fld-'+field+'" data-field="'+field+'"'+(transform?' data-transform="'+transform+'"':'')+'>'+esc(val)+'</textarea>'
    +(hint?'<p class="hint">'+hint+'</p>':'')+'</div>';
}
function chk(label,field,val,hint){
  return '<div class="form-check mb-2"><input class="form-check-input" type="checkbox" id="fld-'+field+'" data-field="'+field+'"'+(val?' checked':'')+'>'
    +'<label class="form-check-label" for="fld-'+field+'">'+label+'</label>'
    +(hint?'<p class="hint">'+hint+'</p>':'')+'</div>';
}
function sel2(label,field,val,opts,hint){
  return '<div class="field"><label for="fld-'+field+'">'+label+'</label><select class="form-select" id="fld-'+field+'" data-field="'+field+'">'
    +opts.map(o=>'<option value="'+o[0]+'"'+(String(val)===String(o[0])?' selected':'')+'>'+o[1]+'</option>').join('')
    +'</select>'+(hint?'<p class="hint">'+hint+'</p>':'')+'</div>';
}
function rich(label,field,val,hint){
  return '<div class="field"><span class="fl" id="lb-'+field+'">'+label+'</span>'
    +'<div class="rt-tools">'
    +'<button type="button" data-rt="bold" title="粗體" aria-label="粗體"><strong>B</strong></button>'
    +'<button type="button" data-rt="italic" title="斜體" aria-label="斜體"><em>I</em></button>'
    +'<button type="button" data-rt="link" title="插入連結" aria-label="插入連結"><i class="bi bi-link-45deg" aria-hidden="true"></i></button>'
    +'<button type="button" data-rt="clear" title="清除格式" aria-label="清除格式"><i class="bi bi-eraser" aria-hidden="true"></i></button>'
    +'</div>'
    +'<div class="rt" contenteditable="true" role="textbox" aria-multiline="true" aria-labelledby="lb-'+field+'" data-rich="'+field+'">'+(val||'')+'</div>'
    +(hint?'<p class="hint">'+hint+'</p>':'')+'</div>';
}

function renderInspector(){
  const box=$('#inspector'), b=sel();
  if(!b){ box.innerHTML='<p class="hint">先點中間畫布裡的任一個區塊，這裡就會出現它的設定欄位。</p>'; return; }
  const d=b.data; let h='<h3 class="h6 mb-3"><i class="bi bi-'+TYPES[b.type].icon+'" aria-hidden="true"></i> '+TYPES[b.type].label+'設定</h3>';

  switch(b.type){
    case 'heading':
      h+=sel2('層級','lv',d.lv,[[0,'H'+HL(0)+'　段落大標'],[1,'H'+HL(1)+'　中標'],[2,'H'+HL(2)+'　小標']],'內文起始層級目前是 H'+HL(0)+'，可在「樣式」分頁調整。層級不可跳階。');
      h+=f('標題文字','text',d.text);
      break;
    case 'paragraph':
      h+=rich('內文','html',d.html,'可設定粗體、斜體與連結。避免用空白鍵或換行排版。');
      break;
    case 'list':
      h+=chk('改為有順序的清單（1. 2. 3.）','ordered',d.ordered);
      h+=ta('清單項目','items',(d.items||[]).join('\n'),'一行一個項目。','lines',6);
      break;
    case 'image':
      h+=f('圖片網址','src',d.src,'url','請先把圖片上傳到後台媒體庫，再把網址貼過來。');
      h+=chk('這是純裝飾用圖片','decorative',d.decorative,'裝飾圖會輸出 alt=""，讓螢幕閱讀器略過。');
      if(!d.decorative) h+=ta('替代文字 alt','alt',d.alt,'描述圖片「傳達了什麼」，例如「校長頒獎給三位得獎學生」。不要寫「圖片」或檔名。',null,3);
      h+=f('圖說（選填）','caption',d.caption,'text','會顯示在圖片下方，看得見的說明文字。');
      break;
    case 'imageText':
      h+=sel2('圖片位置','pos',d.pos,[['left','圖左文右'],['right','圖右文左']],'手機上會自動改成上下堆疊。');
      h+=sel2('圖文比例','ratio',d.ratio,[['1-2','圖小文大（1:2）'],['1-1','各半（1:1）'],['2-1','圖大文小（2:1）']]);
      h+=f('圖片網址','src',d.src,'url','請先把圖片上傳到後台媒體庫，再把網址貼過來。');
      h+=chk('這是純裝飾用圖片','decorative',d.decorative,'旁邊文字已完整說明時可勾選，輔具會略過圖片。');
      if(!d.decorative) h+=ta('替代文字 alt','alt',d.alt,'描述圖片傳達了什麼，不要寫「圖片」或檔名。',null,3);
      h+='<hr>';
      h+=f('小標題（選填）','heading',d.heading,'text','會輸出成 H3，注意不要跳階。留空則不產生標題。');
      h+=rich('說明文字','html',d.html);
      h+=f('按鈕文字（選填）','linkText',d.linkText,'text','例如「查看完整活動辦法」。');
      h+=f('按鈕網址','linkUrl',d.linkUrl,'url');
      h+=chk('另開新視窗','linkNew',d.linkNew);
      break;
    case 'table':
      h+=f('表格標題 caption','caption',d.caption,'text','必填，說明整張表在講什麼。');
      h+=sel2('標題方向','scope',d.scope,[['col','第一列是標題'],['row','第一欄是標題'],['both','兩者皆是']],'決定 th 的 scope 屬性。');
      h+=ta('標題欄位','headers',(d.headers||[]).join(' | '),'用「|」分隔，例如：項目 | 內容。要合併儲存格時，在被併入的格子填「<」（併入左格）。','cells',2);
      h+=ta('表格內容','rows',(d.rows||[]).map(r=>r.join(' | ')).join('\n'),'一行一列，欄位用「|」分隔。合併儲存格：填「<」併入左格、填「^」併入上格。','rows',6);
      break;
    case 'link':
      h+=sel2('排列方式','align',d.align,[['left','靠左'],['center','置中']],'置中效果需選用「內嵌樣式」或「類別」輸出模式。');
      (d.items||[]).forEach((it,i)=>{
        h+='<div class="rep"><div class="d-flex justify-content-between align-items-center mb-2">'
          +'<strong class="small">按鈕 '+(i+1)+'</strong>'
          +'<span class="btn-group">'
          +'<button type="button" class="btn btn-sm btn-outline-secondary" data-mv="'+i+'" data-dir="-1" aria-label="把按鈕 '+(i+1)+' 往前移"'+(i===0?' disabled':'')+'><i class="bi bi-arrow-left" aria-hidden="true"></i></button>'
          +'<button type="button" class="btn btn-sm btn-outline-secondary" data-mv="'+i+'" data-dir="1" aria-label="把按鈕 '+(i+1)+' 往後移"'+(i===d.items.length-1?' disabled':'')+'><i class="bi bi-arrow-right" aria-hidden="true"></i></button>'
          +'<button type="button" class="btn btn-sm btn-outline-danger" data-rm="'+i+'" aria-label="刪除按鈕 '+(i+1)+'"><i class="bi bi-trash3" aria-hidden="true"></i></button>'
          +'</span></div>'
          +f('按鈕文字','items.'+i+'.text',it.text,'text','要寫得出目的地，例如「下載 114 年招生簡章」。')
          +f('網址','items.'+i+'.url',it.url,'url')
          +f('報讀補充說明（title）','items.'+i+'.title',it.title||'','text','會輸出成 title 屬性。用來補充按鈕文字沒說完的資訊，例如「報名系統將於 8 月 31 日關閉」。按鈕文字本身仍要寫清楚，不要靠這裡補救。')
          +chk('同時輸出為隱藏文字（報讀相容性較佳）','items.'+i+'.srOnly',!!it.srOnly,'title 在各家報讀軟體的支援不一致。勾選後會在連結內加一段視覺上看不見、但一定會被唸出來的文字。')
          +sel2('外觀','items.'+i+'.style',it.style,[['button','按鈕樣式'],['text','一般文字連結']])
          +chk('另開新視窗','items.'+i+'.newWindow',it.newWindow,'會自動在文字加上「（另開新視窗）」並補上 rel="noopener"。')
          +chk('這是檔案下載連結','items.'+i+'.isFile',it.isFile);
        if(it.isFile){
          h+='<div class="row g-2"><div class="col-6">'+f('檔案格式','items.'+i+'.fileType',it.fileType)+'</div>'
            +'<div class="col-6">'+f('檔案大小','items.'+i+'.fileSize',it.fileSize)+'</div></div>';
        }
        h+='</div>';
      });
      h+='<button type="button" class="btn btn-sm btn-outline-dark w-100" data-addrep="link"><i class="bi bi-plus-lg" aria-hidden="true"></i> 新增一顆按鈕</button>';
      break;
    case 'files':
      h+=f('區塊標題','title',d.title);
      (d.items||[]).forEach((it,i)=>{
        h+='<div class="rep"><div class="d-flex justify-content-between align-items-center mb-2">'
          +'<strong class="small">檔案 '+(i+1)+'</strong>'
          +'<button type="button" class="btn btn-sm btn-outline-danger" data-rm="'+i+'" aria-label="刪除檔案 '+(i+1)+'"><i class="bi bi-trash3" aria-hidden="true"></i></button></div>'
          +f('檔案名稱','items.'+i+'.name',it.name)
          +f('網址','items.'+i+'.url',it.url,'url')
          +'<div class="row g-2"><div class="col-6">'+f('格式','items.'+i+'.type',it.type)+'</div>'
          +'<div class="col-6">'+f('大小','items.'+i+'.size',it.size)+'</div></div></div>';
      });
      h+='<button type="button" class="btn btn-sm btn-outline-dark w-100" data-addrep="files"><i class="bi bi-plus-lg" aria-hidden="true"></i> 新增一個檔案</button>';
      break;
    case 'note':
      h+=sel2('類型','tone',d.tone,[['info','提醒'],['warn','注意'],['ok','完成']],'文字開頭會自動加上類型字樣，不會只靠顏色傳達。');
      h+=f('標題','title',d.title);
      h+=rich('內容','html',d.html);
      break;
    case 'faq':
      h+=sel2('呈現方式','mode',d.mode,[['details','可展開收合（建議）'],['heading','標題＋段落']],'若後台會過濾 details 標籤，請改用標題＋段落。');
      (d.items||[]).forEach((it,i)=>{
        h+='<div class="rep"><div class="d-flex justify-content-between align-items-center mb-2">'
          +'<strong class="small">第 '+(i+1)+' 題</strong>'
          +'<button type="button" class="btn btn-sm btn-outline-danger" data-rm="'+i+'" aria-label="刪除第 '+(i+1)+' 題"><i class="bi bi-trash3" aria-hidden="true"></i></button></div>'
          +f('問題','items.'+i+'.q',it.q)
          +ta('答案','items.'+i+'.a',it.a,null,null,3)+'</div>';
      });
      h+='<button type="button" class="btn btn-sm btn-outline-dark w-100" data-addrep="faq"><i class="bi bi-plus-lg" aria-hidden="true"></i> 新增一題</button>';
      break;
    case 'quote':
      h+=ta('引言內容','text',d.text,null,null,4);
      h+=f('資料來源','source',d.source);
      break;
    case 'video':
      h+=f('影片網址','url',d.url,'url','支援 YouTube 與 Vimeo，會自動轉成嵌入網址。');
      h+=f('影片標題','title',d.title,'text','必填，會寫進 iframe 的 title。');
      h+=ta('文字稿／內容摘要','transcript',d.transcript,'AAA 等級必填。也請確認影片本身已上字幕。',null,5);
      break;
    case 'divider':
      h+='<p class="hint">分隔線沒有可調整的設定。請注意分隔線只是視覺分隔，段落分段仍要靠標題。</p>';
      break;
  }
  box.innerHTML=h;
}

/* =========================================================
   8. 事件
   ========================================================= */
function addBlock(type,data){
  const b={id:nid(),type,data:Object.assign(TYPES[type].make(),data||{})};
  state.blocks.push(b); state.sel=b.id;
  refreshAll(); renderInspector();
  return b;
}
$('#palette').addEventListener('click',e=>{
  const btn=e.target.closest('[data-add]'); if(!btn) return;
  addBlock(btn.dataset.add);
  toast('已加入「'+TYPES[btn.dataset.add].label+'」');
  document.querySelector('#canvasList').lastElementChild?.scrollIntoView({block:'nearest'});
});
$('#templates').addEventListener('click',e=>{
  const btn=e.target.closest('[data-tpl]'); if(!btn) return;
  TPL_INDEX[btn.dataset.tpl].forEach(([t,d])=>addBlock(t,JSON.parse(JSON.stringify(d))));
  toast('已套用版型：'+btn.dataset.tpl);
  document.querySelector('#canvasList').lastElementChild?.scrollIntoView({block:'nearest'});
});
$('#templates').addEventListener('change',e=>{
  if(e.target.id!=='tplCat') return;
  state.tplCat=e.target.value; renderTemplates();
  document.getElementById('tplCat').focus();
});

/* ── 範本庫 ────────────────────────────── */
/* 範本資料為 [type,data] 陣列，套用時補上預設欄位並給新 id */
const tplBlocks = pairs => pairs.map(([type,data])=>({id:nid(),type,data:Object.assign(TYPES[type].make(),JSON.parse(JSON.stringify(data)))}));

/* 範本檢測：網址與圖片替代文字要等使用者放入實際素材才能填，另計為「素材待填」 */
function libAudit(blocks){
  const keep=state.blocks; state.blocks=blocks;
  const errs=audit().filter(i=>i.lv==='e');
  state.blocks=keep;
  const pending=errs.filter(i=>/網址|替代文字/.test(i.msg)).length;
  return {fail:errs.length-pending, pending};
}

let libUnit='全部', libTopic='全部', libConfirm=null;
function libItems(){
  return LIBRARY.map((t,i)=>Object.assign({key:'t'+i},t))
    .concat(state.my.map((t,i)=>({key:'m'+i,name:t.name,unit:'我的範本',topic:'',blocks:t.blocks,mine:i})));
}
function libChips(attr,label,list,cur){
  return '<span class="lib-lb" id="'+attr+'Lb">'+label+'</span>'
    + ['全部'].concat(list).map(c=>'<button type="button" class="lib-chip" data-'+attr+'="'+esc(c)+'" aria-pressed="'+(c===cur)+'">'+esc(c)+'</button>').join('');
}
function renderLibrary(){
  const mineView = libUnit==='我的範本';
  $('#libUnits').innerHTML=libChips('unit','單位類型',Object.keys(TEMPLATES).concat('我的範本'),libUnit);
  $('#libTopics').innerHTML=libChips('topic','內容主題',LIB_TOPICS,libTopic);
  $('#libTopics').hidden=mineView; // 我的範本沒有主題分類
  const show=libItems().filter(t=>(libUnit==='全部'||t.unit===libUnit) && (mineView||libTopic==='全部'||t.topic===libTopic));
  // 主題色是全域設定，未達標時含按鈕的範本都會顯示須修正，先講清楚原因
  const lowContrast = ratio(state.theme,'#FFFFFF') < (state.level==='AAA'?7:4.5);
  $('#libStatus').textContent='目前顯示 '+show.length+' 套範本。'
    +(lowContrast?'目前主題色的按鈕對比未達 '+state.level+'，含按鈕的範本會顯示須修正，請到「樣式」分頁調整主題色。':'');
  $('#libGrid').innerHTML = show.map(t=>{
    const bs=tplBlocks(t.blocks), a=libAudit(bs), nm=esc(t.name);
    const verdict = a.fail
      ? '<p class="lib-audit err"><i class="bi bi-x-circle-fill" aria-hidden="true"></i>尚有 '+a.fail+' 項須修正</p>'
      : '<p class="lib-audit ok"><i class="bi bi-check-circle-fill" aria-hidden="true"></i>'+state.level+' 通過'+(a.pending?'・素材待填 '+a.pending+' 項':'')+'</p>';
    const act = libConfirm===t.key
      ? '<p class="lib-confirm" id="lc-'+t.key+'">畫布上的 '+state.blocks.length+' 個區塊會被刪除，無法復原。</p>'
        +'<button type="button" class="btn btn-sm btn-danger" data-lib-use="'+t.key+'" data-sure="1" aria-describedby="lc-'+t.key+'">確定取代</button>'
        +'<button type="button" class="btn btn-sm btn-outline-dark" data-lib-save="'+t.key+'">先存草稿再取代</button>'
        +'<button type="button" class="btn btn-sm btn-outline-secondary" data-lib-cancel="'+t.key+'">取消</button>'
      : '<button type="button" class="btn btn-sm btn-accent" data-lib-add="'+t.key+'" aria-label="加到版面：'+nm+'">加到版面</button>'
        +'<button type="button" class="btn btn-sm btn-outline-dark" data-lib-use="'+t.key+'" aria-label="取代全部：'+nm+'">取代全部</button>'
        +(t.mine!==undefined ? '<button type="button" class="btn btn-sm btn-outline-danger" data-lib-rm="'+t.mine+'" title="刪除" aria-label="刪除我的範本：'+nm+'"><i class="bi bi-trash3" aria-hidden="true"></i></button>' : '');
    return '<article class="lib-card" aria-labelledby="ln-'+t.key+'">'
      +'<div class="lib-pv doc" aria-hidden="true" inert><div class="lib-scale">'+bs.map(previewHTML).join('')+'</div></div>'
      +'<div class="lib-meta"><h3 class="lib-name" id="ln-'+t.key+'">'+nm+'</h3>'
      +'<p class="lib-tags">'+[t.unit,t.topic].filter(Boolean).map(x=>'<span class="lib-tag">'+esc(x)+'</span>').join('')+'</p>'
      +'<p class="lib-desc">'+esc([...new Set(bs.map(b=>TYPES[b.type].label))].join('＋'))+'</p>'
      +verdict+'<div class="lib-act">'+act+'</div></div></article>';
  }).join('') || '<p class="lib-empty">'+(mineView?'還沒有自訂範本。把畫布排好之後，用下方的「存成我的範本」就能存進來。':'這個分類還沒有範本。')+'</p>';
}
function applyLib(key,replace){
  const t=libItems().find(x=>x.key===key); if(!t) return;
  const blocks=tplBlocks(t.blocks);
  state.blocks = replace ? blocks : state.blocks.concat(blocks);
  state.sel = blocks[0] ? blocks[0].id : null;
  bootstrap.Modal.getInstance($('#libModal')).hide();
  const oc=bootstrap.Offcanvas.getInstance($('#palettePanel')); if(oc) oc.hide(); // 手機版側欄一併收起
  refreshAll(); renderInspector();
  toast('已套用範本「'+t.name+'」，接著修改文字、填入素材就好');
  if(state.sel) document.querySelector('[data-id="'+state.sel+'"]').scrollIntoView({block:'nearest'});
}
$('#libModal').addEventListener('show.bs.modal',()=>{ libConfirm=null; renderLibrary(); });
$('#libModal').addEventListener('click',e=>{
  const chip=e.target.closest('.lib-chip');
  if(chip){
    const attr = chip.dataset.unit ? 'unit' : 'topic';
    if(attr==='unit') libUnit=chip.dataset.unit; else libTopic=chip.dataset.topic;
    libConfirm=null; renderLibrary();
    document.querySelector('.lib-chip[data-'+attr+'="'+(attr==='unit'?libUnit:libTopic)+'"]').focus();
    return;
  }
  const add=e.target.closest('[data-lib-add]');
  if(add){ applyLib(add.dataset.libAdd,false); return; }
  const use=e.target.closest('[data-lib-use]');
  if(use){
    // 本工具沒有復原功能，畫布有內容時先在卡片上原地確認
    if(state.blocks.length && !use.dataset.sure){
      libConfirm=use.dataset.libUse; renderLibrary();
      document.querySelector('#libGrid [data-sure]').focus();
      return;
    }
    applyLib(use.dataset.libUse,true); return;
  }
  const save=e.target.closest('[data-lib-save]');
  if(save){ saveDraft(); applyLib(save.dataset.libSave,true); return; }
  const cancel=e.target.closest('[data-lib-cancel]');
  if(cancel){
    libConfirm=null; renderLibrary();
    document.querySelector('#libGrid [data-lib-use="'+cancel.dataset.libCancel+'"]').focus();
    return;
  }
  const rm=e.target.closest('[data-lib-rm]');
  if(rm){
    const i=+rm.dataset.libRm, t=state.my[i];
    if(!confirm('確定刪除我的範本「'+t.name+'」？刪除後無法復原。')) return;
    state.my.splice(i,1); renderLibrary();
    toast('已刪除我的範本「'+t.name+'」');
    document.querySelector('.lib-chip[data-unit][aria-pressed="true"]').focus();
  }
});
$('#myTplForm').addEventListener('submit',e=>{
  e.preventDefault();
  if(!state.blocks.length){ toast('畫布是空的，先排好內容再存成範本'); return; }
  const name=$('#myTplName').value.trim() || '我的範本 '+(state.my.length+1);
  state.my.push({name, blocks:state.blocks.map(b=>[b.type,JSON.parse(JSON.stringify(b.data))])});
  $('#myTplName').value='';
  libUnit='我的範本'; libConfirm=null; renderLibrary();
  toast('已存成我的範本「'+name+'」。要保留到下次，請記得「存草稿」');
});

$('#canvasList').addEventListener('click',e=>{
  const q=e.target.closest('[data-quick]');
  if(q){
    const k=q.dataset.quick, small=window.innerWidth<992;
    if(k==='import'){ bootstrap.Modal.getOrCreateInstance($('#importModal')).show(); return; }
    if(k==='demo'){
      TPL_INDEX['最新消息公告'].forEach(([t,d])=>addBlock(t,JSON.parse(JSON.stringify(d))));
      toast('已載入範例，可直接修改或全部刪掉重來'); return;
    }
    if(small){ bootstrap.Offcanvas.getOrCreateInstance($('#palettePanel')).show(); }
    setTimeout(()=>{
      const target = k==='tpl' ? $('#templates') : $('#palette');
      target.scrollIntoView({block:'nearest',behavior:'smooth'});
      target.closest('.panel').classList.add('flash');
      setTimeout(()=>target.closest('.panel').classList.remove('flash'),1500);
      const first = k==='tpl' ? $('#tplCat') : target.querySelector('button');
      first && first.focus();
    }, small?320:0);
    return;
  }
  const act=e.target.closest('[data-act]');
  if(act){
    const id=act.dataset.id, i=state.blocks.findIndex(b=>b.id===id);
    if(act.dataset.act==='up'&&i>0){ [state.blocks[i-1],state.blocks[i]]=[state.blocks[i],state.blocks[i-1]]; }
    if(act.dataset.act==='down'&&i<state.blocks.length-1){ [state.blocks[i+1],state.blocks[i]]=[state.blocks[i],state.blocks[i+1]]; }
    if(act.dataset.act==='copy'){ const c=JSON.parse(JSON.stringify(state.blocks[i])); c.id=nid(); state.blocks.splice(i+1,0,c); state.sel=c.id; }
    if(act.dataset.act==='del'){ state.blocks.splice(i,1); if(state.sel===id) state.sel=null; toast('已刪除區塊'); }
    refreshAll(); renderInspector();
    const focusId = act.dataset.act==='del' ? null : (state.blocks[Math.min(i, state.blocks.length-1)]||{}).id;
    if(focusId){ const el=document.querySelector('[data-id="'+focusId+'"] [data-act="'+act.dataset.act+'"]'); el&&el.focus(); }
    return;
  }
  const open=e.target.closest('[data-open]');
  if(open){
    state.sel=open.dataset.open; renderCanvas(); renderInspector();
    if(window.innerWidth<992) bootstrap.Offcanvas.getOrCreateInstance($('#inspectorPanel')).show();
  }
});

/* 拖曳排序 */
let dragId=null;
$('#canvasList').addEventListener('dragstart',e=>{
  const a=e.target.closest('.blk'); if(!a) return;
  dragId=a.dataset.id; e.dataTransfer.effectAllowed='move';
});
$('#canvasList').addEventListener('dragover',e=>{
  const a=e.target.closest('.blk'); if(!a||a.dataset.id===dragId) return;
  e.preventDefault(); a.classList.add('drag-over');
});
$('#canvasList').addEventListener('dragleave',e=>{
  const a=e.target.closest('.blk'); a&&a.classList.remove('drag-over');
});
$('#canvasList').addEventListener('drop',e=>{
  const a=e.target.closest('.blk'); if(!a||!dragId) return;
  e.preventDefault(); a.classList.remove('drag-over');
  const from=state.blocks.findIndex(b=>b.id===dragId), to=state.blocks.findIndex(b=>b.id===a.dataset.id);
  const [m]=state.blocks.splice(from,1); state.blocks.splice(to,0,m);
  dragId=null; refreshAll();
});

/* 屬性欄位輸入 */
function setPath(obj,path,val){
  const p=path.split('.'); let o=obj;
  for(let i=0;i<p.length-1;i++) o=o[p[i]];
  o[p[p.length-1]]=val;
}
function onField(e){
  const el=e.target.closest('[data-field]'); if(!el) return;
  const b=sel(); if(!b) return;
  let v = el.type==='checkbox' ? el.checked : el.value;
  const tf=el.dataset.transform;
  if(tf==='lines') v=v.split('\n');
  if(tf==='cells') v=v.split('|').map(s=>s.trim());
  if(tf==='rows')  v=v.split('\n').filter(l=>l.trim()).map(l=>l.split('|').map(s=>s.trim()));
  if(el.dataset.field==='lv') v=parseInt(v,10);
  setPath(b.data, el.dataset.field, v);

  const node=document.querySelector('[data-open="'+b.id+'"]');
  if(node) node.innerHTML=previewHTML(b);
  renderAudit();
  const dot=document.querySelector('[data-id="'+b.id+'"] .dot');
  if(dot) dot.className='dot '+blockStatus(b.id,audit());
  // 需要重畫表單的切換
  // 這些欄位會改變表單本身要顯示哪些項目，需重畫（含 items.0.isFile 這類巢狀欄位）
  if(['decorative','isFile'].includes(el.dataset.field.split('.').pop())) renderInspector();
}
$('#inspector').addEventListener('input',onField);
$('#inspector').addEventListener('change',onField);

$('#inspector').addEventListener('click',e=>{
  const b=sel(); if(!b) return;
  const rm=e.target.closest('[data-rm]');
  if(rm){ b.data.items.splice(parseInt(rm.dataset.rm,10),1); refreshAll(); renderInspector(); return; }
  const mv=e.target.closest('[data-mv]');
  if(mv){
    const i=parseInt(mv.dataset.mv,10), j=i+parseInt(mv.dataset.dir,10);
    if(j>=0 && j<b.data.items.length){
      const arr=b.data.items; [arr[i],arr[j]]=[arr[j],arr[i]];
      refreshAll(); renderInspector();
    }
    return;
  }
  const ar=e.target.closest('[data-addrep]');
  if(ar){
    const k=ar.dataset.addrep;
    b.data.items.push(
      k==='files' ? {name:'',url:'',type:'PDF',size:''} :
      k==='link'  ? {text:'',url:'',newWindow:true,style:'button',title:'',srOnly:false,isFile:false,fileType:'PDF',fileSize:''} :
                    {q:'',a:''});
    refreshAll(); renderInspector();
  }
});

/* 簡易格式工具 */
let savedRange=null, richField=null;
$('#inspector').addEventListener('mouseup',saveRange);
$('#inspector').addEventListener('keyup',saveRange);
function saveRange(e){
  if(!e.target.closest('[data-rich]')) return;
  const s=window.getSelection();
  if(s.rangeCount) savedRange=s.getRangeAt(0).cloneRange();
  richField=e.target.closest('[data-rich]');
}
$('#inspector').addEventListener('input',e=>{
  const r=e.target.closest('[data-rich]'); if(!r) return;
  const b=sel(); if(!b) return;
  b.data[r.dataset.rich]=sanitizeInline(r.innerHTML);
  const node=document.querySelector('[data-open="'+b.id+'"]');
  if(node) node.innerHTML=previewHTML(b);
  renderAudit();
});
$('#inspector').addEventListener('click',e=>{
  const t=e.target.closest('[data-rt]'); if(!t) return;
  const ed=t.closest('.field').querySelector('[data-rich]'); ed.focus();
  if(savedRange){ const s=window.getSelection(); s.removeAllRanges(); s.addRange(savedRange); }
  const cmd=t.dataset.rt;
  if(cmd==='bold') document.execCommand('bold');
  else if(cmd==='italic') document.execCommand('italic');
  else if(cmd==='clear') document.execCommand('removeFormat');
  else if(cmd==='link'){
    richField=ed; savedRange=window.getSelection().rangeCount?window.getSelection().getRangeAt(0).cloneRange():null;
    $('#lkText').value=savedRange?savedRange.toString():''; $('#lkUrl').value='https://';
    bootstrap.Modal.getOrCreateInstance($('#linkModal')).show();
    return;
  }
  const b=sel(); b.data[ed.dataset.rich]=sanitizeInline(ed.innerHTML);
  const node=document.querySelector('[data-open="'+b.id+'"]'); if(node) node.innerHTML=previewHTML(b);
  renderAudit();
});
$('#btnInsertLink').addEventListener('click',()=>{
  const txt=$('#lkText').value.trim()||$('#lkUrl').value, url=$('#lkUrl').value.trim(), nw=$('#lkNew').checked;
  if(!url){ toast('請填寫網址'); return; }
  const label = txt + (nw && !/另開新視窗/.test(txt) ? '（另開新視窗）' : '');
  const a='<a href="'+esc(url)+'"'+(nw?' target="_blank" rel="noopener noreferrer"':'')+'>'+esc(label)+'</a>';
  richField.focus();
  if(savedRange){ const s=window.getSelection(); s.removeAllRanges(); s.addRange(savedRange); }
  document.execCommand('insertHTML',false,a);
  const b=sel(); b.data[richField.dataset.rich]=sanitizeInline(richField.innerHTML);
  bootstrap.Modal.getInstance($('#linkModal')).hide();
  refreshAll(); renderInspector();
});

/* 檢測跳轉 */
$('#audit').addEventListener('click',e=>{
  const g=e.target.closest('[data-goto]'); if(!g||!g.dataset.goto) return;
  state.sel=g.dataset.goto; renderCanvas(); renderInspector();
  document.querySelector('[data-id="'+state.sel+'"]').scrollIntoView({block:'center',behavior:'smooth'});
  bootstrap.Tab.getOrCreateInstance($('#tabProp')).show();
});

/* 等級 / 主題色 */
$$('input[name=lvl]').forEach(r=>r.addEventListener('change',()=>{
  state.level=document.querySelector('input[name=lvl]:checked').value;
  refreshAll(); toast('檢測等級：'+state.level);
}));
$('#styleTab').addEventListener('change',e=>{
  if(e.target.id==='baseLevel'){
    state.baseLevel=parseInt(e.target.value,10);
    renderStyle(); refreshAll(); renderInspector();
    document.getElementById('baseLevel').focus();
    toast('內文標題已改為從 H'+state.baseLevel+' 起算');
  }
  if(e.target.id==='styleText'){
    state.styleText=e.target.checked;
    renderStyle(); refreshAll();
    document.getElementById('styleText').focus();
    toast(state.styleText?'將一併輸出標題與內文樣式':'標題與內文樣式改由後台決定');
  }
});
$('#styleTab').addEventListener('input',e=>{
  if(e.target.id==='themeColor'||e.target.id==='themeHex'){
    const v=e.target.value.trim();
    if(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)){ state.theme=v; renderStyle(); refreshAll(); }
  }
});

/* =========================================================
   9. 匯入 Word
   ========================================================= */
const BULLET=/^\s*([\u2022\u25cf\u25aa\u30fb\u00b7\-\*\u25e6\u2013])\s+/;
const NUMBER=/^\s*(\d+|[（(]?\d+[）)]|[一二三四五六七八九十]+[、.])\s*[、.]?\s+/;

/* 儲存格文字：多個段落／換行補空白避免黏字；「|」是編輯器的欄位分隔符、「<」「^」是合併記號，一律改全形 */
function cellText(td){
  td.querySelectorAll('br').forEach(n=>n.replaceWith(' '));
  td.querySelectorAll('p,div,li').forEach(n=>n.append(' '));
  return (td.textContent||'').replace(/\s+/g,' ').trim()
    .replace(/\|/g,'｜').replace(/^<$/,'＜').replace(/^\^$/,'＾');
}

/* Word 表格 → 方正格線。合併儲存格改寫成記號：「<」＝併入左格、「^」＝併入上格 */
function wordTableGrid(table){
  const trs=Array.from(table.rows); // 只取本表的列，不含巢狀表格
  const g=trs.map(()=>[]);
  trs.forEach((tr,y)=>{
    let x=0;
    Array.from(tr.cells).forEach(td=>{
      // Word 貼上時為了對齊欄數補的隱形格
      if(/mso-cell-special:\s*placeholder/i.test(td.getAttribute('style')||'')) return;
      while(g[y][x]!==undefined) x++; // 跳過被上方 rowspan 佔住的位置
      const cs=Math.max(1,td.colSpan||1);
      const rs=Math.min(Math.max(1,td.rowSpan||1), trs.length-y);
      const text=cellText(td);
      for(let j=0;j<rs;j++) for(let k=0;k<cs;k++) g[y+j][x+k] = j ? '^' : k ? '<' : text;
      x+=cs;
    });
  });
  const W=Math.max(0,...g.map(r=>r.length));
  return g.map(r=>Array.from({length:W},(_,i)=>r[i]??'')).filter(r=>r.some(Boolean));
}

function htmlToBlocks(html){
  const doc=new DOMParser().parseFromString(html,'text/html');
  doc.querySelectorAll('style,script,meta,link,o\\:p').forEach(n=>n.remove());
  const out=[]; let buf=null;

  const flush=()=>{ if(buf){ out.push(buf); buf=null; } };

  function pushList(text,ordered){
    const item=text.replace(BULLET,'').replace(NUMBER,'').trim();
    if(!item) return;
    if(buf && buf.type==='list' && buf.data.ordered===ordered) buf.data.items.push(item);
    else { flush(); buf={id:nid(),type:'list',data:{ordered,items:[item]}}; }
  }

  function walk(node){
    Array.from(node.children).forEach(el=>{
      const tag=el.tagName;
      if(/^H[1-6]$/.test(tag)){
        flush();
        const n=parseInt(tag[1],10);
        const off = n<=2 ? 0 : (n===3 ? 1 : 2);
        const t=(el.textContent||'').trim();
        if(t) out.push({id:nid(),type:'heading',data:{lv:off,text:t}});
        return;
      }
      if(tag==='P'||tag==='DIV'){
        if(el.querySelector('table,ul,ol,h1,h2,h3,h4,img')){ walk(el); return; }
        const raw=(el.textContent||'').replace(/\u00a0/g,' ').trim();
        if(!raw){ return; }
        const cls=(el.className||'')+' '+(el.getAttribute('style')||'');
        if(BULLET.test(raw)||/MsoListParagraph|mso-list/i.test(cls)){ pushList(raw,false); return; }
        if(NUMBER.test(raw) && raw.length<200){ pushList(raw,true); return; }
        flush();
        const inner=sanitizeInline(el.innerHTML);
        // Word 常把標題做成粗體大字的段落
        const onlyBold = /^<strong>.*<\/strong>$/.test(inner) && raw.length<=30;
        if(onlyBold) out.push({id:nid(),type:'heading',data:{lv:1,text:raw}});
        else out.push({id:nid(),type:'paragraph',data:{html:inner||esc(raw)}});
        return;
      }
      if(tag==='UL'||tag==='OL'){
        flush();
        const items=Array.from(el.querySelectorAll(':scope > li')).map(li=>(li.textContent||'').trim()).filter(Boolean);
        if(items.length) out.push({id:nid(),type:'list',data:{ordered:tag==='OL',items}});
        return;
      }
      if(tag==='TABLE'){
        flush();
        const grid=wordTableGrid(el);
        if(!grid.length) return;
        const headers=grid[0];
        const rows=grid.slice(1);
        out.push({id:nid(),type:'table',data:{
          caption:'', headers, rows:rows.length?rows:[headers.map(()=>'')], scope:'col'
        }});
        return;
      }
      if(tag==='IMG'){
        flush();
        out.push({id:nid(),type:'image',data:{src:'',alt:'',decorative:false,caption:''}});
        return;
      }
      if(tag==='BLOCKQUOTE'){
        flush();
        out.push({id:nid(),type:'quote',data:{text:(el.textContent||'').trim(),source:''}});
        return;
      }
      if(tag==='HR'){ flush(); out.push({id:nid(),type:'divider',data:{}}); return; }
      walk(el);
    });
  }
  walk(doc.body); flush();
  return out;
}

let pendingHTML='';
$('#pasteBox').addEventListener('input',function(){ pendingHTML=this.innerHTML; });
$('#docxInput').addEventListener('change',function(){
  const file=this.files[0]; if(!file) return;
  $('#docxStatus').innerHTML='<p class="hint">讀取中…</p>';
  const fr=new FileReader();
  fr.onload=ev=>{
    mammoth.convertToHtml({arrayBuffer:ev.target.result})
      .then(r=>{ pendingHTML=r.value; $('#docxStatus').innerHTML='<div class="alert alert-success py-2 mb-0">已讀取「'+esc(file.name)+'」，按下「開始匯入」即可。</div>'; })
      .catch(()=>{ $('#docxStatus').innerHTML='<div class="alert alert-danger py-2 mb-0">這個檔案讀不出來。請確認是 .docx 格式，或改用「貼上內容」。</div>'; });
  };
  fr.readAsArrayBuffer(file);
});
$('#btnDoImport').addEventListener('click',()=>{
  if(!pendingHTML.trim()){ toast('還沒有可匯入的內容'); return; }
  const blocks=htmlToBlocks(pendingHTML);
  if(!blocks.length){ toast('沒有解析到內容，請確認貼上的資料'); return; }
  if(document.querySelector('input[name=impMode]:checked').value==='replace') state.blocks=[];
  const hadImg=/<img/i.test(pendingHTML);
  state.blocks=state.blocks.concat(blocks);
  state.sel=blocks[0].id;
  bootstrap.Modal.getInstance($('#importModal')).hide();
  $('#pasteBox').innerHTML=''; $('#docxInput').value=''; $('#docxStatus').innerHTML=''; pendingHTML='';
  refreshAll(); renderInspector();
  toast('已匯入 '+blocks.length+' 個區塊');
  if(hadImg) setTimeout(()=>toast('文件中的圖片需另外上傳到後台，再回到圖片區塊填入網址與替代文字'),600);
});

/* =========================================================
   10. 原始碼輸出
   ========================================================= */
function generate(){
  USED=new Set();
  state.mode=$('#outMode').value;
  const html=state.blocks.map(blockHTML).filter(Boolean).join('\n\n');
  const css = state.mode==='class' ? buildCSS() : '';
  state.mode='clean';
  return {html,css};
}
function renderCode(){
  const {html,css}=generate();
  $('#codeOut').value=html;
  $('#cssWrap').classList.toggle('d-none', !css);
  $('#cssOut').value=css;
  const mh={
    clean:'目前是純語義模式：標題、段落、清單都不帶任何樣式，外觀完全由後台的文章樣式決定。若後台沒有預設標題樣式，畫面會是一片沒有層次的文字。',
    inline:'目前是內嵌樣式模式：每個標籤自帶 style，貼到哪裡外觀都一致，但原始碼較長。',
    'class':'目前是類別模式：記得把下方 CSS 區塊一起貼在 HTML 最前面，否則所有樣式都不會生效。'
  }[$('#outMode').value] || '';
  $('#modeHint').textContent = mh + ($('#outMode').value!=='clean' && !state.styleText ? '　（已在「樣式」分頁關閉標題與內文樣式）' : '');
  const issues=audit(), e=issues.filter(i=>i.lv==='e').length;
  $('#codeAlert').innerHTML = e
    ? '<div class="alert alert-danger py-2"><strong>還有 '+e+' 項必須修正</strong>：這份原始碼目前無法通過 '+state.level+' 檢測，建議回到「檢測」分頁處理後再貼上。</div>'
    : '<div class="alert alert-success py-2"><strong>檢測通過</strong>：符合 WCAG 2.1 '+state.level+' 常見檢測項目，可以貼進後台了。</div>';
}
$('#btnCode').addEventListener('click',()=>{ renderCode(); bootstrap.Modal.getOrCreateInstance($('#codeModal')).show(); });
$('#outMode').addEventListener('change',renderCode);
$('#btnCopy').addEventListener('click',async()=>{
  const t=$('#codeOut');
  try{ await navigator.clipboard.writeText(t.value); }
  catch(err){ t.removeAttribute('readonly'); t.select(); document.execCommand('copy'); t.setAttribute('readonly',''); }
  toast('原始碼已複製，貼到後台的「原始碼」檢視即可');
});
$('#btnDownload').addEventListener('click',()=>{
  const {html,css}=generate();
  dl(new Blob([css? css+'\n'+html : html],{type:'text/html;charset=utf-8'}),'content.html');
});

/* 全部清空 */
function saveDraft(){
  // v2：新增 my（我的範本）
  dl(new Blob([JSON.stringify({v:2,theme:state.theme,level:state.level,baseLevel:state.baseLevel,styleText:state.styleText,blocks:state.blocks,my:state.my},null,2)],{type:'application/json'}),'draft.json');
}
function doClear(){
  state.blocks=[]; state.sel=null;
  bootstrap.Modal.getInstance($('#clearModal')).hide();
  refreshAll(); renderInspector();
  toast('已清空全部內容');
  $('#canvas').focus();
}
$('#btnClear').addEventListener('click',()=>{
  if(!state.blocks.length){ toast('目前沒有內容可以清空'); return; }
  $('#clearCount').textContent=state.blocks.length;
  bootstrap.Modal.getOrCreateInstance($('#clearModal')).show();
});
$('#btnClearOk').addEventListener('click',doClear);
$('#btnClearSave').addEventListener('click',()=>{ saveDraft(); doClear(); toast('草稿已下載'); });

/* 草稿 */
function dl(blob,name){
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
$('#btnSave').addEventListener('click',()=>{
  if(!state.blocks.length && !state.my.length){ toast('目前沒有內容可以存'); return; }
  saveDraft();
  toast('草稿已下載，下次用「讀草稿」開回來');
});
$('#btnLoad').addEventListener('click',()=>$('#jsonInput').click());
$('#jsonInput').addEventListener('change',function(){
  const f=this.files[0]; if(!f) return;
  const fr=new FileReader();
  fr.onload=e=>{
    try{
      const d=JSON.parse(e.target.result);
      state.blocks=d.blocks||[]; state.theme=d.theme||state.theme; state.level=d.level||'AA'; state.baseLevel=d.baseLevel||3; state.styleText=d.styleText!==false;
      // v1 草稿沒有 my，保留目前的我的範本；有的話濾掉無法辨識的區塊，避免範本庫壞掉
      if(Array.isArray(d.my)) state.my=d.my.filter(t=>t && Array.isArray(t.blocks))
        .map(t=>({name:String(t.name||'未命名範本'), blocks:t.blocks.filter(p=>Array.isArray(p) && TYPES[p[0]])}));
      document.getElementById('lvl'+state.level).checked=true;
      state.sel=null; renderStyle(); refreshAll(); renderInspector();
      toast('草稿已載入'+(state.my.length?'（含 '+state.my.length+' 套我的範本）':''));
    }catch(err){ toast('這個檔案讀不出來，請確認是本工具匯出的草稿'); }
    this.value='';
  };
  fr.readAsText(f);
});

/* =========================================================
   11. 啟動
   ========================================================= */
renderPalette(); renderTemplates(); renderStyle();
refreshAll(); renderInspector();
})();
