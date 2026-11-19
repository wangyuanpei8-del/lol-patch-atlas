const $ = id => document.getElementById(id);
const modes = [
  ['海克斯大乱斗','海克斯大乱斗','ARAM MAYHEM','aram','#c6a6fa'],
  ['斗魂竞技场','斗魂竞技场','ARENA','arena','#e1bf82'],
  ['召唤师峡谷','召唤师峡谷','SUMMONER’S RIFT','rift','#92cbb3'],
  ['跨模式','跨模式与客户端','SHARED UPDATES','shared','#9bbfe3']
];
const championIds = Object.fromEntries('布兰德:Brand 艾克:Ekko 格温:Gwen 贾克斯:Jax 拉克丝:Lux 希维尔:Sivir 亚索:Yasuo 永恩:Yone 亚恒:Zaahen 吉格斯:Ziggs 安妮:Annie 阿兹尔（沙皇）:Azir 卑尔维斯:Belveth 布隆:Braum 科加斯:Chogath 凯隐（拉亚斯特）:Kayn 璐璐:Lulu 娜美:Nami 萨勒芬妮:Seraphine 斯卡纳:Skarner 娑娜:Sona 塔里克:Taric 崔丝塔娜:Tristana 薇恩:Vayne 弗拉迪米尔:Vladimir 约里克:Yorick 巴德:Bard 伊泽瑞尔:Ezreal 加里奥:Galio 纳尔:Gnar 奎桑提:KSante 勒布朗:Leblanc 易大师:MasterYi 梅尔:Mel 辛德拉:Syndra 维克兹:Velkoz 蔚:Vi'.split(' ').map(s=>s.split(':')));
const items={'歌谣之冠':222530,'困惑（Perplexity）':4015,'符文雕刻者':447108,'涡轮炼金罐':443079,'寒冰霸拳':226662,'纳什之牙':3115,'感电三轮刃':6699};
const picks=[
 [['新增 · 全面强化','新增 4 款坦克强化符文'],['防御塔双抗与镀层','防御塔双抗固定为 120'],['防御塔双抗与镀层','每层镀层平分 100 金币']],
 [['远程英雄模式加成','远程技能急速 20 → 10'],['崔丝塔娜','小炮 W 法强加成升至 120%'],['阿兹尔（沙皇）','沙兵保留竞技场专属规则']],
 [['冬季峡谷回归','冬季地图重新开放'],['阿兹尔（沙皇）','沙皇普攻距离提升至 550'],['巴德','巴德 Q 法强加成升至 100%']],
 [['队伍语音分地区测试','北美和大洋洲先行开放'],['回放下载限额','回放调整为每日 50 次'],['DJ 娑娜的互动音乐','施法逐层叠加音轨']]
];
function el(tag,text,cls) {const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n}
const edition=v=>v.split(' · ')[0];
let archive=[], index=0, mode=0, changes=false, timer;
const patch=()=>archive[index];
function entries(p, data=p.modes){
  const seen=new Map();
  return data[mode].map(([group,title,lines])=>{
    const key=JSON.stringify([group,title]), n=seen.get(key)||0;
    seen.set(key,n+1);return {group,title,lines,key:key+'-'+n};
  });
}
function prior(){return archive.slice(index+1).find(p=>p.source.replace(/\/$/,'')===patch().source.replace(/\/$/,''))}
function visibleEntries(){
  const all=entries(patch()), older=prior();
  if(!changes||!older)return all;
  const old=new Map(entries(older,older.comparisonModes || older.modes).map(r=>[r.key,r])), result=[];
  for(const r of all){
    const prev=old.get(r.key);old.delete(r.key);
    if(!prev){result.push({...r,status:'新增'});continue}
    if(JSON.stringify(prev.lines)!==JSON.stringify(r.lines)){
      const before=prev.lines.filter(x=>!r.lines.includes(x)).map(x=>'修订前 · '+x);
      const after=r.lines.filter(x=>!prev.lines.includes(x)).map(x=>'修订后 · '+x);
      result.push({...r,status:'修订',lines:before.length||after.length?[...before,...after]:r.lines});
    }
  }
  for(const row of old.values())result.push({...row,status:'移除'});
  return result;
}
function route(row){
  const hash=new URLSearchParams({v:patch().version,m:String(mode)});if(row)hash.set('r',row.key);
  if(changes)hash.set('diff','1');else hash.set('diff','0');
  return '#'+hash;
}
function focusRow(key){
  const row=[...$('results').querySelectorAll('.row')].find(r=>r.dataset.key===key);
  if(row){row.scrollIntoView({block:'start'});row.classList.add('focused');setTimeout(()=>row.classList.remove('focused'),1400)}
}
function toast(msg){clearTimeout(timer);$('toast').textContent=msg;timer=setTimeout(()=>$('toast').textContent='',2200)}
function values(p,line){
  const split=line.indexOf('→');if(split<0){p.append(line);return}
  p.append(line.slice(0,split+1)+' ',el('strong',line.slice(split+1).trim()));
}
function renderRows(){
  const rows=visibleEntries(), query=$('query').value.trim().toLowerCase();
  const out=$('results'), toc=$('contents');out.replaceChildren();toc.replaceChildren();
  const groups=new Map();
  for(const row of rows.filter(r=>[r.group,r.title,...r.lines].join(' ').toLowerCase().includes(query))){
    if(!groups.has(row.group)){
      const section=el('section'); const label=el('h3',row.group,'group');section.append(label);out.append(section);groups.set(row.group,section);
      const jump=el('button',row.group);jump.onclick=()=>label.scrollIntoView({block:'start'});toc.append(jump);
    }
    const block=el('article',null,'row'), title=el('h4'), body=el('div',null,'body');
    block.dataset.key=row.key;
    const art=championIds[row.title]?'champion/'+championIds[row.title]:items[row.title]?'item/'+items[row.title]:null;
    if(art){const img=el('img',null,'portrait');img.alt='';img.loading='lazy';img.src='https://ddragon.leagueoflegends.com/cdn/16.22.1/img/'+art+'.png';img.onerror=()=>img.remove();title.append(img)}
    title.append(row.title);if(row.status)body.append(el('span',row.status,'delta'));
    for(const line of row.lines){
      const p=el('p');
      if(/竞技场.{0,10}(保留|已有)|不适用|不适用于|仅.{0,8}模式/.test(line)) p.append(el('span','模式例外','scope-note'));
      values(p,line);body.append(p)
    }
    const share=el('button','↗','share');share.title='复制此条链接';share.setAttribute('aria-label','复制「'+row.title+'」链接');
    share.onclick=async()=>{const link=new URL(route(row),location.href);history.replaceState(null,'',link);try{await navigator.clipboard.writeText(link.href);toast('已复制此条链接')}catch{toast('可复制地址栏中的此条链接')}};
    block.append(title,body,share);groups.get(row.group).append(block);
  }
  if(!out.children.length)out.textContent=query?'本栏没有匹配的改动。':changes?'本次修订没有此模式的条目变化。':'本期未列出本模式的专属改动。';
}
function autoHighlights(rows) {
  const candidates = rows.map(row => {
    const detail = row.lines.find(line => line.startsWith('修订后')) ||
      row.lines.find(line => line.includes('→')) || row.lines[0] || row.title;
    const priority = Number(Boolean(row.status)) * 4 +
      Number(/系统|机制|地图|新增|添加/.test(row.group + row.title)) * 2 +
      Number(detail.includes('→'));
    return {row, detail, priority};
  }).sort((a,b) => b.priority-a.priority);
  const chosen = [];
  for (const entry of candidates) {
    if (!chosen.some(item => item.row.group === entry.row.group)) chosen.push(entry);
    if (chosen.length === 3) break;
  }
  for (const entry of candidates) {
    if (chosen.length === 3) break;
    if (!chosen.includes(entry)) chosen.push(entry);
  }
  return chosen.map(({row,detail}) => [row, row.title + ' · ' + detail]);
}
function render(){
  const p=patch(), current=modes[mode], rows=visibleEntries();
  $('version').textContent=edition(p.version);$('headline').textContent=p.headline;
  $('date').textContent=p.date+' JST　/　'+p.kind;$('source').href=p.source;
  $('hero').style.setProperty('--art',/^https:\/\/cmsassets\.rgpub\.io\//.test(p.art)?'url('+JSON.stringify(p.art)+')':'none');
  document.documentElement.style.setProperty('--accent',current[4]);$('title').textContent=current[1];$('english').textContent=current[2];
  $('modes').replaceChildren(...modes.map((m,i)=>{const b=el('button');b.style.setProperty('--tint',m[4]);const icon=el('span',null,'mode-icon mode-icon--'+m[3]);icon.setAttribute('aria-hidden','true');b.append(icon,m[0]);b.setAttribute('aria-pressed',i===mode);b.onclick=()=>{mode=i;$('query').value='';history.replaceState(null,'',route());render();$('modes').children[i].focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'})};return b}));
  $('views').hidden=!prior();$('changes').setAttribute('aria-pressed',changes);$('full').setAttribute('aria-pressed',!changes);
  let cards=[];
  if(p.version==='26.23')cards=picks[mode].map(([name,text])=>[rows.find(r=>r.title===name),text]).filter(([r])=>r);
  if(!cards.length)cards=autoHighlights(rows);
  $('brief').hidden=!cards.length;
  $('cards').replaceChildren(...cards.map(([row,txt])=>{const b=el('button',null,'card');b.append(el('small',row.group),el('strong',txt));b.onclick=()=>{$('query').value='';renderRows();history.replaceState(null,'',route(row));focusRow(row.key)};return b}));
  renderRows();
}
function restore(){
  const hash=new URLSearchParams(location.hash.slice(1));index=Math.max(0,archive.findIndex(p=>p.version===hash.get('v')));
  const choice=Number(hash.get('m'));mode=Number.isInteger(choice)&&choice>=0&&choice<4?choice:0;
  changes=Boolean(prior())&&hash.get('diff')!=='0';$('query').value='';render();
  if(hash.has('r'))requestAnimationFrame(()=>focusRow(hash.get('r')));
}
$('historyBtn').onclick=()=>{
  const list=$('editions');list.replaceChildren();const groups=new Map();
  archive.forEach((p,i)=>{const key=edition(p.version);if(!groups.has(key)){const g=el('section');g.append(el('h3','Patch '+key));list.append(g);groups.set(key,g)}
    const b=el('button',(i===index?'✓　':'')+p.date+'　'+p.kind);b.onclick=()=>{index=i;changes=Boolean(prior());history.pushState(null,'',route());$('archive').close();restore();window.scrollTo(0,0)};groups.get(key).append(b)});
  $('archive').showModal();
};
$('close').onclick=()=>$('archive').close();
$('query').oninput=renderRows;
for(const id of ['changes','full'])$(id).onclick=()=>{changes=id==='changes';history.replaceState(null,'',route());render()};
addEventListener('hashchange',()=>{if(archive.length)restore()});
async function start(){
  try{const res=await fetch('patches.json',{cache:'no-cache'});if(!res.ok)throw Error(res.status);archive=await res.json();restore()}
  catch{$('results').textContent='补丁读取失败，请刷新页面重试。'}
}
start();

function updateThemeControl() {
  const light = document.documentElement.dataset.theme === 'light';
  $('themeBtn').setAttribute('aria-pressed', String(light));
  $('themeIcon').textContent = light ? '☾' : '☀';
  $('themeText').textContent = light ? '深色' : '浅色';
  document.querySelector('meta[name="theme-color"]').content = light ? '#f7f4ec' : '#10141d';
}
$('themeBtn').onclick = () => {
  const root = document.documentElement;
  root.dataset.theme = root.dataset.theme === 'light' ? 'dark' : 'light';
  updateThemeControl();
  try {
    localStorage.setItem('rift-atlas-theme', root.dataset.theme);
  } catch {}
};
updateThemeControl();
