const COLS = 8, ROWS = 5;
const TYPES = {
  pistol: {name:'Пистолет', icon:'🔫', w:2,h:1,kind:'weapon', damage:18, cooldown:1, ammo:'bullets'},
  shotgun:{name:'Дробовик',icon:'▰',w:3,h:1,kind:'weapon',damage:30,cooldown:2,ammo:'shells'},
  launcher:{name:'Базука',icon:'🚀',w:4,h:1,kind:'weapon',damage:44,cooldown:0,ammo:'rockets'},
  bullets:{name:'Патроны',icon:'▥',w:1,h:1,kind:'ammo',amount:12},
  shells:{name:'Картечь',icon:'▥',w:1,h:1,kind:'ammo',amount:5},
  rockets:{name:'Ракета',icon:'◆',w:1,h:1,kind:'ammo',amount:1},
  green:{name:'Зелёная',icon:'🧪',w:1,h:1,kind:'herb'},
  red:{name:'Красная',icon:'🧪',w:1,h:1,kind:'herb'},
  yellow:{name:'Жёлтая',icon:'🧪',w:1,h:1,kind:'herb'},
  mix:{name:'Смесь',icon:'⚗',w:1,h:1,kind:'mix'}
};
const $ = id=>document.getElementById(id);
let duel=null, pending=null, enemyPlan=null, resolving=false, resolutionTimer=null;
const s={phase:'prep',round:1,deck:[],items:[],selectedDeck:null,selectedItem:null,herbs:[],id:0,hp:100,maxHp:100,enemyHp:100,enemyMaxHp:100,ammo:{bullets:0,shells:0,rockets:0}};
const random = arr=>arr[Math.floor(Math.random()*arr.length)];
function make(type,extra={}){return{id:++s.id,type,x:0,y:0,rot:false,used:false,...extra}}
function drawDeck(){
  const base=['pistol','bullets','shotgun','shells','launcher','rockets','green','red','yellow'];
  s.deck=[...base,...Array.from({length:4},()=>random(['bullets','shells','green','green','red','yellow','pistol','shotgun']))].map(type=>make(type));
  s.selectedDeck=null;render();status('Колода обновлена. Выберите предмет.');
}
function dims(item){const t=TYPES[item.type];return item.rot?{w:t.h,h:t.w}:{w:t.w,h:t.h}}
function canPlace(item,x,y,ignore=null){let {w,h}=dims(item);if(x<0||y<0||x+w>COLS||y+h>ROWS)return false;
  return !s.items.some(o=>o.id!==ignore?.id&&Array.from({length:dims(o).h},(_,yy)=>Array.from({length:dims(o).w},(_,xx)=>x<o.x+dims(o).w&&x+w>o.x&&y<o.y+dims(o).h&&y+h>o.y)).flat().some(Boolean));
}
function place(x,y){
  if(s.phase!=='prep')return;
  if(s.selectedItem){const item=s.items.find(i=>i.id===s.selectedItem);if(item&&canPlace(item,x,y,item)){item.x=x;item.y=y;s.selectedItem=null;status('Предмет перемещён.');render()}else status('Здесь недостаточно места.');return}
  const item=s.deck.find(i=>i.id===s.selectedDeck);if(!item)return status('Сначала выберите предмет из колоды.');
  if(!canPlace(item,x,y))return status('Здесь недостаточно места. Поверните предмет или выберите другие клетки.');
  item.x=x;item.y=y;item.used=true;s.items.push(item);s.selectedDeck=null;status(`${TYPES[item.type].name} добавлен в чемодан.`);render();
}
function status(msg){$('status').textContent=msg}
function renderDraft(){
  $('draft').innerHTML='';s.deck.forEach(item=>{let t=TYPES[item.type],el=document.createElement('button');el.className=`draft-card ${item.used?'used':''} ${s.selectedDeck===item.id?'selected':''}`;el.innerHTML=`<span class="icon">${t.icon}</span><span class="item-label">${t.name}</span><span class="size">${dims(item).w} × ${dims(item).h}</span>`;el.addEventListener('click',()=>{s.selectedItem=null;s.selectedDeck=item.id;status(`Разместите ${t.name.toLowerCase()} в чемодане.`);render()});attachDrag(el,item,'deck');$('draft').append(el)});
}
function itemAt(x,y){return s.items.find(i=>x>=i.x&&x<i.x+dims(i).w&&y>=i.y&&y<i.y+dims(i).h)}
function renderGrid(){
  const grid=$('case-grid'),layer=$('case-items');grid.innerHTML='';layer.innerHTML='';
  for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){let cell=document.createElement('div');cell.className='cell';cell.dataset.x=x;cell.dataset.y=y;cell.addEventListener('click',()=>{if(s.phase==='prep'&&s.selectedDeck)place(x,y);else if(s.phase==='prep'&&s.selectedItem){place(x,y)}else if(s.phase==='prep'){const it=itemAt(x,y);if(it)selectItem(it)} });grid.append(cell)}
  s.items.forEach(item=>{let t=TYPES[item.type],{w,h}=dims(item),el=document.createElement('div');el.className=`case-item item-${item.type} ${s.selectedItem===item.id?'active':''} ${s.herbs.includes(item.id)?'marked':''}`;
    el.style.cssText=`left:${item.x/COLS*100}%;top:${item.y/ROWS*100}%;width:${w/COLS*100}%;height:${h/ROWS*100}%`;
    const caption=item.type==='mix'?item.mix.map(k=>({green:'З',red:'К',yellow:'Ж'})[k]).join('+'):t.name;
    let count=t.kind==='ammo'?`<small>×${item.remaining??t.amount}</small>`:t.kind==='weapon'&&s.phase==='battle'?`<small>ЗАРЯДЫ ${s.ammo[t.ammo]}</small>`:'';
    el.innerHTML=`<div class="item-face"><span class="item-art">${t.icon}</span><span class="item-info">${caption}${count}</span></div>`;
    el.setAttribute('role','button');el.tabIndex=0;el.setAttribute('aria-label',t.name);el.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();selectItem(item)}});el.addEventListener('click',ev=>{ev.stopPropagation();selectItem(item)});attachDrag(el,item,'case');if(duel&&s.phase==='battle'&&t.kind==='weapon'){const wait=Math.max(0,(duel.player.ready[item.type]||0)-duel.turn);if(wait){el.classList.add('cooling');el.querySelector('small').textContent=`ПАУЗА ${wait} х.`;}}layer.append(el)
  });
  $('slots').textContent=`${s.items.reduce((n,i)=>n+dims(i).w*dims(i).h,0)} / ${COLS*ROWS}`;
}
function selectItem(item){
  let t=TYPES[item.type];if(s.phase==='prep'){s.selectedDeck=null;s.selectedItem=s.selectedItem===item.id?null:item.id;status(s.selectedItem?`Переместите ${t.name.toLowerCase()} или поверните ↻.`:'Предмет не выбран.');render();return}
  if(s.phase!=='battle'||resolving)return;
  if(t.kind==='herb'){s.herbs=s.herbs.includes(item.id)?s.herbs.filter(id=>id!==item.id):[...s.herbs,item.id];s.selectedItem=item.id;pending=item.type==='green'?{kind:'heal',id:item.id}:null;status('Зелёная — лечение. Выберите ещё травы для смешивания за один ход.');render();return}
  if(t.kind==='mix'){useHeal(item);return}
  if(t.kind==='weapon')fire(item);
  if(t.kind==='ammo')status('Боеприпасы расходуются автоматически при выстреле.');
}
function render(){renderDraft();renderGrid();$('draft-section').classList.toggle('hidden',s.phase!=='prep');$('reroll').disabled=s.phase!=='prep';$('rotate').style.display=s.phase==='prep'?'':'none';$('phase-chip').textContent=s.phase==='prep'?'01 / ПОДГОТОВКА':s.phase==='battle'?'02 / ДУЭЛЬ':'03 / РЕЗУЛЬТАТ';
  $('round').textContent=`ПРОТОТИП · РАУНД ${s.round}`;$('combine').hidden=s.phase!=='battle';$('combine').disabled=s.herbs.length<2;
  $('primary').innerHTML=s.phase==='prep'?'НАЧАТЬ БОЙ <span>➜</span>':s.phase==='battle'?'ПРИМЕНИТЬ ЗЕЛЁНУЮ <span>✚</span>':'НОВЫЙ РАУНД <span>↻</span>';
  $('primary').disabled=s.phase==='prep'&&!s.items.some(i=>TYPES[i.type].kind==='weapon');updateHud();renderTactics();
}
function updateHud(){let p=Math.max(0,s.hp/s.maxHp*100),e=Math.max(0,s.enemyHp/s.enemyMaxHp*100);$('player-health').style.width=p+'%';$('enemy-health').style.width=e+'%';$('player-health-text').textContent=`${Math.ceil(s.hp)} / ${s.maxHp}`;$('enemy-health-text').textContent=`${Math.ceil(s.enemyHp)} / ${s.enemyMaxHp}`}
function syncDuel(){
  s.items=duel.player.items;s.hp=duel.player.hp;s.maxHp=duel.player.maxHp;s.enemyHp=duel.enemy.hp;s.enemyMaxHp=duel.enemy.maxHp;
  for(const type of ['bullets','shells','rockets'])s.ammo[type]=Duel.ammo(duel.player,type);
}
function actionName(action,fighter){
  if(!action)return 'Выберите действие';
  const names={guard:'Блок',dodge:'Уклонение',strike:'Удар',heal:'Лечение',combine:'Смешивание'};
  return names[action.kind]||TYPES[action.type||fighter.items.find(i=>i.id===action.id)?.type]?.name||'Выстрел';
}
function chooseBot(){
  const f=duel.enemy,available=Duel.actions(f,duel.turn),previous=duel.last?.player;
  // Uses public previous-turn information only; never reads pending or the player's current selection.
  const weighted=available.flatMap(a=>{
    let weight=a.kind==='attack'?5:1;
    if(a.kind==='guard')weight=f.energy<2?5:2;
    if(a.kind==='dodge')weight=previous?.type==='pistol'||previous?.type==='launcher'?7:2;
    if(a.kind==='heal')weight=f.hp<55?10:1;
    if(a.kind==='combine')weight=f.hp<75?4:1;
    if(a.kind==='attack'&&f.items.find(i=>i.id===a.id).type==='launcher'&&previous?.kind==='guard')weight=10;
    return Array(weight).fill(a);
  });
  return {...random(weighted)};
}
function start(){
  if(!s.items.some(i=>TYPES[i.type].kind==='weapon'))return;
  clearTimeout(resolutionTimer);resolving=false;pending=null;s.selectedItem=null;s.herbs=[];
  duel={turn:1,player:Duel.fighter(s.items),enemy:Duel.fighter(s.items),result:null};
  s.phase='battle';syncDuel();enemyPlan=chooseBot();
  $('turn-log').textContent='Равное снаряжение · один выбор на ход';
  status('Ожидание безопасно. Выберите действие и подтвердите ход.');render();
}
function renderTactics(){
  const battle=s.phase==='battle';$('tactics').hidden=!battle;
  $('combine').hidden=!battle||s.herbs.length<2;
  $('combine').disabled=resolving||s.herbs.length<2;
  if(!battle)return;
  const f=duel.player;
  $('phase-chip').textContent=`ХОД ${duel.turn} / 24 · ${resolving?'РАЗРЕШЕНИЕ':'ВАШ ВЫБОР'}`;
  $('arena-message').textContent=resolving?'ДЕЙСТВИЯ РАСКРЫТЫ':'СОПЕРНИК ВЫБРАЛ · ВЫБОР СКРЫТ';
  $('turn-info').textContent=`Выносливость ${f.energy}/2 · враг ${duel.enemy.energy}/2 · ${duel.turn<9?`сужение через ${9-duel.turn} х.`:'АРЕНА СУЖАЕТСЯ'}`;
  $('primary').textContent=resolving?'РАЗРЕШЕНИЕ…':pending?`${actionName(pending,f)} · ХОД ✓`:'ВЫБЕРИТЕ ДЕЙСТВИЕ';
  $('primary').disabled=resolving||!Duel.legal(f,pending,duel.turn);
  for(const kind of ['guard','dodge','strike']){
    $(kind).disabled=resolving||!Duel.legal(f,{kind},duel.turn);
    $(kind).classList.toggle('chosen',pending?.kind===kind);
    $(kind).setAttribute('aria-pressed',String(pending?.kind===kind));
  }
}
function selectAction(action){
  if(s.phase!=='battle'||resolving)return;
  if(!Duel.legal(duel.player,action,duel.turn))return status('Сейчас недоступно: проверьте заряды, паузу, здоровье и выносливость.');
  pending=action;s.selectedItem=action.id||null;
  if(action.kind!=='combine')s.herbs=[];
  const hints={guard:'Блок: −75% урона пуль, +1 выносливость. Ракета пробивает.',dodge:'Уклонение: −1 выносливость. Дробовик всё ещё наносит 15.',strike:'Удар: 8 урона. Без патронов и паузы.',heal:'Лечение займёт ход. Противник тоже выполнит действие.',combine:'Смешивание займёт ход; смесь можно применить следующим.'};
  const type=duel.player.items.find(i=>i.id===action.id)?.type,w=Duel.WEAPONS[type];
  status(hints[action.kind]||`${TYPES[type].name}: ${w.damage} урона, пауза ${w.cooldown} х. Подтвердите ход.`);render();
}
function fire(item){selectAction({kind:'attack',id:item.id})}
function useHeal(item){selectAction({kind:'heal',id:item.id})}
function combine(){selectAction({kind:'combine',ids:[...s.herbs]})}
function float(text,x,y,cls=''){
  const el=document.createElement('div');el.className='float '+cls;el.style.left=x+'%';el.style.top=y+'%';el.textContent=text;
  $('effects').append(el);setTimeout(()=>el.remove(),1100);
}
function animateAction(side,result){
  const actor=$(side),other=$(side==='player'?'enemy':'player');
  actor.classList.remove('firing','blocking','dodging','healing','hit');
  void actor.offsetWidth;
  if(result.damage){
    actor.classList.add('firing');
    const shot=document.createElement('div');shot.className=`turn-projectile ${side} ${result.type}`;
    $('effects').append(shot);setTimeout(()=>shot.remove(),800);
    if(result.dealt)other.classList.add('hit');
  }else actor.classList.add(result.kind==='guard'?'blocking':result.kind==='dodge'?'dodging':'healing');
  setTimeout(()=>{actor.classList.remove('firing','blocking','dodging','healing');other.classList.remove('hit')},1100);
  if(result.healed)float('+'+result.healed,side==='player'?18:72,45,'heal');
  if(result.damage)float(result.dealt?'−'+result.dealt:'МИМО',side==='player'?70:15,58);
}
function commitTurn(){
  if(s.phase!=='battle'||resolving||!Duel.legal(duel.player,pending,duel.turn))return;
  resolving=true;
  duel=Duel.resolve(duel,pending,enemyPlan);syncDuel();
  const last=duel.last;
  $('turn-log').textContent=`Вы: ${actionName(last.player,duel.player)}${last.player.damage?' −'+last.player.dealt:''} · Враг: ${actionName(last.enemy,duel.enemy)}${last.enemy.damage?' −'+last.enemy.dealt:''}${last.pressure?' · зона −'+last.pressure:''}`;
  pending=null;s.selectedItem=null;s.herbs=[];render();
  $('phase-chip').textContent=`ХОД ${last.turn} · ДЕЙСТВИЯ РАСКРЫТЫ`;
  animateAction('player',last.player);animateAction('enemy',last.enemy);
  status('Оба действия выполнены одновременно.');
  resolutionTimer=setTimeout(()=>{
    resolving=false;
    if(duel.result){end(duel.result);return;}
    enemyPlan=chooseBot();render();status('Ожидание безопасно — ход идёт только после подтверждения.');
  },1150);
}
function end(result){
  s.phase='end';pending=null;enemyPlan=null;resolving=false;
  $('arena-message').textContent=result==='draw'?'НИЧЬЯ':result==='win'?'ПОБЕДА':'ПОРАЖЕНИЕ';
  status(`${duel.turn-1} ходов · ${result==='draw'?'Равный результат.':result==='win'?'Тактика сработала.':'Попробуйте чередовать оружие и защиту.'}`);render();
}
function reset(){
  clearTimeout(resolutionTimer);duel=null;pending=null;enemyPlan=null;resolving=false;s.phase='prep';s.round++;s.items=[];s.selectedItem=null;s.herbs=[];s.hp=s.enemyHp=100;s.maxHp=s.enemyMaxHp=100;
  $('arena-message').textContent='СОБЕРИТЕ ЧЕМОДАН';$('turn-log').textContent='';drawDeck();
}
for(const kind of ['guard','dodge','strike'])$(kind).addEventListener('click',()=>selectAction({kind}));
$('rules-open').addEventListener('click',()=>$('rules').showModal());

function pointCell(cx,cy){let r=$('case-grid').getBoundingClientRect();if(cx<r.left||cx>=r.right||cy<r.top||cy>=r.bottom)return null;return{x:Math.floor((cx-r.left)/r.width*COLS),y:Math.floor((cy-r.top)/r.height*ROWS)}}
function attachDrag(el,item,origin){let start=null,ghost=null,moved=false;el.addEventListener('pointerdown',e=>{if((origin==='deck'&&s.phase!=='prep')||(origin==='case'&&s.phase==='end'))return;start={x:e.clientX,y:e.clientY};moved=false});el.addEventListener('pointermove',e=>{if(!start)return;if(!moved&&Math.hypot(e.clientX-start.x,e.clientY-start.y)>9){moved=true;ghost=document.createElement('div');ghost.className='drag-ghost';ghost.textContent=TYPES[item.type].icon;document.body.append(ghost);el.setPointerCapture(e.pointerId)}if(ghost){ghost.style.left=e.clientX+'px';ghost.style.top=e.clientY+'px'}});el.addEventListener('pointerup',e=>{if(!start)return;if(moved){e.preventDefault();e.stopPropagation();let cell=pointCell(e.clientX,e.clientY);if(origin==='deck'&&cell){s.selectedDeck=item.id;s.selectedItem=null;place(cell.x,cell.y)}else if(origin==='case'&&s.phase==='prep'&&cell){s.selectedItem=item.id;place(cell.x,cell.y)}else if(origin==='case'&&s.phase==='battle'&&$('arena').getBoundingClientRect().top<=e.clientY&&e.clientY<=$('arena').getBoundingClientRect().bottom){if(TYPES[item.type].kind==='weapon')fire(item);else if(item.type==='green'||item.type==='mix')useHeal(item)}}ghost?.remove();ghost=null;start=null;moved=false});el.addEventListener('pointercancel',()=>{ghost?.remove();ghost=null;start=null;moved=false})}
$('rotate').addEventListener('click',()=>{let item=s.deck.find(i=>i.id===s.selectedDeck)||s.items.find(i=>i.id===s.selectedItem);if(!item)return status('Сначала выберите предмет.');item.rot=!item.rot;if(s.items.includes(item)&&!canPlace(item,item.x,item.y,item)){item.rot=!item.rot;return status('В этой позиции предмет не повернуть. Переместите его.')};render()});
$('reroll').addEventListener('click',()=>{s.items=[];drawDeck()});$('combine').addEventListener('click',combine);
$('primary').addEventListener('click',()=>{if(s.phase==='prep')start();else if(s.phase==='end')reset();else commitTurn()});
drawDeck();
