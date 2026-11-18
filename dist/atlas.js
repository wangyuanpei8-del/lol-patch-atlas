const names = ['海克斯大乱斗','斗魂竞技场','召唤师峡谷','跨模式与客户端'];
const english = ['ARAM MAYHEM','ARENA','SUMMONER’S RIFT','SHARED UPDATES'];
const accents = ['#c8a2f4','#d8b67e','#86bfa9','#90b7da'];
const symbols = ['✧','⚔','♜','◎'];
const get = id => document.getElementById(id);
const node = (tag, value) => Object.assign(document.createElement(tag), {textContent:value});
let patches = [], selected = 0, mode = 0;
function rows() {
  const patch = patches[selected], list = patch.modes[mode];
  const search = get('query').value.trim().toLowerCase();
  get('title').textContent = names[mode];
  get('intro').textContent = patch.intro[mode];
  const output = get('results');
  output.replaceChildren();
  let lastGroup = null;
  for (const [group, title, details] of list) {
    if (![group,title,...details].join(' ').toLowerCase().includes(search)) continue;
    if (group !== lastGroup) {
      const label = node('h3',group); label.className='group'; output.append(label); lastGroup=group;
    }
    const line = document.createElement('div'), bullets = document.createElement('ul');
    line.className='line';
    for(const detail of details) bullets.append(node('li',detail));
    line.append(node('strong',title),bullets); output.append(line);
  }
  if(!output.children.length) output.textContent=search?'没有匹配的改动。':'本次公告未列出该栏的专属改动。';
}
function render() {
  const p=patches[selected];
  for(const key of ['version','headline','lead']) get(key).textContent=p[key];
  get('source').href=p.source;
  get('date').textContent=p.date+' JST  /  '+p.kind;
  get('hero').style.setProperty('--art',p.art?'url("'+p.art+'")':'none');
  get('modes').replaceChildren();
  names.forEach((name,i)=>{
    const b=document.createElement('button'); b.className='mode'; b.style.setProperty('--accent',accents[i]);
    const icon=node('span',symbols[i]), label=node('span',english[i]), count=node('span',p.modes[i].length+' 项');
    icon.className='sigil';label.className='eng';count.className='counter';
    b.append(icon,node('strong',name),label,count); b.setAttribute('aria-pressed',mode===i);
    b.onclick=()=>{mode=i;get('query').value='';render();get('modes').children[i].focus()};get('modes').append(b);
  });
  rows();
}
const archive=get('archive');
function load(data) {
  if(!Array.isArray(data)||!data.length||!data.every(p=>typeof p.version==='string' && Array.isArray(p.intro)&&p.intro.length===4&&Array.isArray(p.modes)&&p.modes.length===4&&p.modes.every(m=>Array.isArray(m)&&m.every(r=>Array.isArray(r)&&Array.isArray(r[2])))&&/^https:\/\/www\.leagueoflegends\.com\//.test(p.source)))throw Error('invalid patch archive');
  const current=selected===0?null:patches[selected]?.version;
  patches=data; selected=current?Math.max(0,data.findIndex(p=>p.version===current)):0;
  archive.replaceChildren(...data.map((p,i)=>new Option(p.version+' · '+p.kind,i)));archive.selectedIndex=selected;render();
}
async function read(url){const r=await fetch(url,{cache:'no-cache'});if(!r.ok)throw Error(r.status);return r.json()}
async function start(){
  try{load(await read('patches.json'))}catch{get('results').textContent='补丁数据暂时无法读取。'}
  try{load(await read('https://raw.githubusercontent.com/wangyuanpei8-del/lol-patch-atlas/main/dist/patches.json'))}catch{/* Keep the bundled edition when GitHub is unavailable. */}
}
archive.onchange=()=>{selected=archive.selectedIndex;get('query').value='';render()};
get('query').oninput=rows;start();
