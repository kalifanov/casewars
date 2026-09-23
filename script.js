const COLS = 8, ROWS = 5;
const TYPES = {
  pistol: {name:'Пистолет', icon:'🔫', w:2,h:1,kind:'weapon', damage:11, cooldown:530, ammo:'bullets'},
  shotgun:{name:'Дробовик',icon:'▰',w:3,h:1,kind:'weapon',damage:28,cooldown:1300,ammo:'shells'},
  launcher:{name:'Базука',icon:'🚀',w:4,h:1,kind:'weapon',damage:65,cooldown:0,ammo:'rockets'},
  bullets:{name:'Патроны',icon:'▥',w:1,h:1,kind:'ammo',amount:12},
  shells:{name:'Картечь',icon:'▥',w:1,h:1,kind:'ammo',amount:5},
  rockets:{name:'Ракета',icon:'◆',w:1,h:1,kind:'ammo',amount:1},
  green:{name:'Зелёная',icon:'🧪',w:1,h:1,kind:'herb'},
  red:{name:'Красная',icon:'🧪',w:1,h:1,kind:'herb'},
  yellow:{name:'Жёлтая',icon:'🧪',w:1,h:1,kind:'herb'},
  mix:{name:'Смесь',icon:'⚗',w:1,h:1,kind:'mix'}
};
const $ = id=>document.getElementById(id);
const s={phase:'prep',round:1,deck:[],items:[],selectedDeck:null,selectedItem:null,herbs:[],id:0,hp:100,maxHp:100,enemyHp:100,enemyMaxHp:100,ammo:{bullets:0,shells:0,rockets:0},lastShot:{},lastEnemy:0,loop:null,ended:false};
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
    const caption=item.type==='mix'?item.mix.join('+').map(k=>k[0].toUpperCase()).join(''):t.name;
    let count=t.kind==='ammo'?`<small>×${item.remaining??t.amount}</small>`:'';
    el.innerHTML=`<div class="item-face"><span class="item-art">${t.icon}</span><span class="item-info">${caption}${count}</span></div>`;
    el.addEventListener('click',ev=>{ev.stopPropagation();selectItem(item)});attachDrag(el,item,'case');layer.append(el)
  });
  $('slots').textContent=`${s.items.reduce((n,i)=>n+dims(i).w*dims(i).h,0)} / ${COLS*ROWS}`;
}
function selectItem(item){
  let t=TYPES[item.type];if(s.phase==='prep'){s.selectedDeck=null;s.selectedItem=s.selectedItem===item.id?null:item.id;status(s.selectedItem?`Переместите ${t.name.toLowerCase()} или поверните ↻.`:'Предмет не выбран.');render();return}
  if(s.phase!=='battle')return;
  if(t.kind==='herb'){s.herbs=s.herbs.includes(item.id)?s.herbs.filter(id=>id!==item.id):[...s.herbs,item.id];s.selectedItem=item.id;status('Выберите другие травы и смешайте их или нажмите на зелёную ещё раз, чтобы применить.');render();return}
  if(t.kind==='mix'){useHeal(item);return}
  if(t.kind==='weapon')fire(item);
  if(t.kind==='ammo')status('Боеприпасы расходуются автоматически при выстреле.');
}
function render(){renderDraft();renderGrid();$('draft-section').classList.toggle('hidden',s.phase!=='prep');$('reroll').disabled=s.phase!=='prep';$('rotate').style.display=s.phase==='prep'?'':'none';$('phase-chip').textContent=s.phase==='prep'?'01 / ПОДГОТОВКА':s.phase==='battle'?'02 / ДУЭЛЬ':'03 / РЕЗУЛЬТАТ';
  $('round').textContent=`ПРОТОТИП · РАУНД ${s.round}`;$('combine').hidden=s.phase!=='battle';$('combine').disabled=s.herbs.length<2;
  $('primary').innerHTML=s.phase==='prep'?'НАЧАТЬ БОЙ <span>➜</span>':s.phase==='battle'?'ПРИМЕНИТЬ ЗЕЛЁНУЮ <span>✚</span>':'НОВЫЙ РАУНД <span>↻</span>';
  $('primary').disabled=s.phase==='prep'&&!s.items.some(i=>TYPES[i.type].kind==='weapon');updateHud();
}
function updateHud(){let p=Math.max(0,s.hp/s.maxHp*100),e=Math.max(0,s.enemyHp/s.enemyMaxHp*100);$('player-health').style.width=p+'%';$('enemy-health').style.width=e+'%';$('player-health-text').textContent=`${Math.ceil(s.hp)} / ${s.maxHp}`;$('enemy-health-text').textContent=`${Math.ceil(s.enemyHp)} / ${s.enemyMaxHp}`}
function start(){if(!s.items.some(i=>TYPES[i.type].kind==='weapon'))return status('Возьмите хотя бы одно оружие.');s.phase='battle';s.hp=100;s.maxHp=100;s.enemyHp=100;s.enemyMaxHp=100;s.herbs=[];s.lastEnemy=performance.now();s.lastShot={};s.ammo={bullets:0,shells:0,rockets:0};s.items.forEach(i=>{const t=TYPES[i.type];if(t.kind==='ammo'){i.remaining=t.amount;s.ammo[i.type]+=t.amount}});$('arena-message').textContent='ВЫБЕРИТЕ ОРУЖИЕ В ЧЕМОДАНЕ';status('Бой идёт! Нажмите на оружие или перетащите его на поле.');render();cancelAnimationFrame(s.loop);s.loop=requestAnimationFrame(tick)}
function tick(time){if(s.phase!=='battle')return;if(time-s.lastEnemy>2350){s.lastEnemy=time;s.hp=Math.max(0,s.hp-(8+Math.floor(Math.random()*6)));float('−'+(100-s.hp>0?Math.min(13,100-s.hp):8),24,53,'damage');updateHud();if(s.hp<=0)return end(false);status('Ада атакует! Примените траву или стреляйте.')}
  s.loop=requestAnimationFrame(tick)}
function float(text,x,y,cls=''){let el=document.createElement('div');el.className='float '+cls;el.style.left=x+'%';el.style.top=y+'%';el.textContent=text;$('effects').append(el);setTimeout(()=>el.remove(),900)}
function fire(item){if(s.phase!=='battle')return;let t=TYPES[item.type],now=performance.now();if(now-(s.lastShot[item.id]||-Infinity)<t.cooldown)return status('Оружие перезаряжается.');if(!s.ammo[t.ammo])return status(`Нет боеприпасов для «${t.name}».`);
  s.lastShot[item.id]=now;s.ammo[t.ammo]--;let stack=s.items.find(i=>i.type===t.ammo&&i.remaining>0);if(stack){stack.remaining--;if(!stack.remaining)s.items=s.items.filter(i=>i.id!==stack.id)}let dmg=t.damage+(item.type==='shotgun'?Math.floor(Math.random()*7):0);s.enemyHp=Math.max(0,s.enemyHp-dmg);float('−'+dmg,76,28);let proj=document.createElement('div');proj.className='projectile';proj.style.cssText='left:23%;top:49%;width:56%;transform:rotate(-12deg)';$('effects').append(proj);setTimeout(()=>proj.remove(),240);
  status(`${t.name}: −${dmg} HP. Осталось зарядов: ${s.ammo[t.ammo]}.`);updateHud();if(item.type==='launcher')s.items=s.items.filter(i=>i.id!==item.id);render();if(s.enemyHp<=0)end(true)
}
function useHeal(item){if(s.phase!=='battle')return;let mix=item.type==='mix'?item.mix:[item.type];if(!mix.includes('green'))return status('Красную и жёлтую траву нельзя применить без зелёной.');
  let extra=mix.includes('yellow')?20:0,amount=mix.includes('red')?70:30;s.maxHp+=extra;let restored=Math.min(amount,s.maxHp-s.hp);s.hp+=restored;s.items=s.items.filter(i=>i.id!==item.id);s.herbs=[];s.selectedItem=null;float(`+${restored}${extra?' / MAX +20':''}`,21,44,'heal');status(`Лечение +${restored} HP${extra?', максимум здоровья +20':''}.`);render()
}
function combine(){let items=s.herbs.map(id=>s.items.find(i=>i.id===id)).filter(Boolean);if(items.length<2||items.length>3||new Set(items.map(i=>i.type)).size!==items.length||!items.every(i=>TYPES[i.type].kind==='herb'))return status('Выберите 2–3 травы разных цветов.');
  if(!items.some(i=>i.type==='green'))return status('Для смеси нужна зелёная трава.');
  const first=items[0],mix=make('mix',{x:first.x,y:first.y,mix:items.map(i=>i.type)});s.items=s.items.filter(i=>!s.herbs.includes(i.id));s.items.push(mix);s.herbs=[];s.selectedItem=null;status(`Смешаны травы: ${mix.mix.map(k=>TYPES[k].name.toLowerCase()).join(' + ')}. Нажмите на смесь, чтобы применить.`);render()
}
function end(win){s.phase='end';cancelAnimationFrame(s.loop);$('arena-message').textContent=win?'ПОБЕДА · АДА ПОВЕРЖЕНА':'ПОРАЖЕНИЕ · ЛЕОН ПОВЕРЖЕН';status(win?'Вы выиграли дуэль. Нажмите «Новый раунд».':'Попробуйте взять больше лечения или раньше использовать базуку.');render()}
function reset(){cancelAnimationFrame(s.loop);s.phase='prep';s.round++;s.items=[];s.selectedItem=null;s.herbs=[];s.ended=false;s.hp=s.enemyHp=100;s.maxHp=s.enemyMaxHp=100;$('arena-message').textContent='СОБЕРИТЕ ЧЕМОДАН';drawDeck()}
function pointCell(cx,cy){let r=$('case-grid').getBoundingClientRect();if(cx<r.left||cx>=r.right||cy<r.top||cy>=r.bottom)return null;return{x:Math.floor((cx-r.left)/r.width*COLS),y:Math.floor((cy-r.top)/r.height*ROWS)}}
function attachDrag(el,item,origin){let start=null,ghost=null,moved=false;el.addEventListener('pointerdown',e=>{if((origin==='deck'&&s.phase!=='prep')||(origin==='case'&&s.phase==='end'))return;start={x:e.clientX,y:e.clientY};moved=false});el.addEventListener('pointermove',e=>{if(!start)return;if(!moved&&Math.hypot(e.clientX-start.x,e.clientY-start.y)>9){moved=true;ghost=document.createElement('div');ghost.className='drag-ghost';ghost.textContent=TYPES[item.type].icon;document.body.append(ghost);el.setPointerCapture(e.pointerId)}if(ghost){ghost.style.left=e.clientX+'px';ghost.style.top=e.clientY+'px'}});el.addEventListener('pointerup',e=>{if(!start)return;if(moved){e.preventDefault();e.stopPropagation();let cell=pointCell(e.clientX,e.clientY);if(origin==='deck'&&cell){s.selectedDeck=item.id;s.selectedItem=null;place(cell.x,cell.y)}else if(origin==='case'&&s.phase==='prep'&&cell){s.selectedItem=item.id;place(cell.x,cell.y)}else if(origin==='case'&&s.phase==='battle'&&$('arena').getBoundingClientRect().top<=e.clientY&&e.clientY<=$('arena').getBoundingClientRect().bottom){if(TYPES[item.type].kind==='weapon')fire(item);else if(item.type==='green'||item.type==='mix')useHeal(item)}}ghost?.remove();ghost=null;start=null;moved=false});el.addEventListener('pointercancel',()=>{ghost?.remove();ghost=null;start=null;moved=false})}
$('rotate').addEventListener('click',()=>{let item=s.deck.find(i=>i.id===s.selectedDeck)||s.items.find(i=>i.id===s.selectedItem);if(!item)return status('Сначала выберите предмет.');item.rot=!item.rot;if(s.items.includes(item)&&!canPlace(item,item.x,item.y,item)){item.rot=!item.rot;return status('В этой позиции предмет не повернуть. Переместите его.')};render()});
$('reroll').addEventListener('click',()=>{s.items=[];drawDeck()});$('combine').addEventListener('click',combine);
$('primary').addEventListener('click',()=>{if(s.phase==='prep')start();else if(s.phase==='end')reset();else{let chosen=s.items.find(i=>i.id===s.selectedItem&&i.type==='green')||s.items.find(i=>i.type==='green');if(chosen)useHeal(chosen);else status('В чемодане нет зелёной травы.')}});
drawDeck();
