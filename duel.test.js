const test = (name, run) => { run(); console.log('PASS ' + name); };
const assert = require('node:assert/strict');
const D = require('./duel');
const inventory = ['pistol','bullets','shotgun','shells','launcher','rockets','green','red','yellow'].map((type,id)=>({type,id:id+1,x:id%8,y:0}));
const fresh = () => ({turn:1,player:D.fighter(inventory),enemy:D.fighter(inventory),result:null});
const shot = {kind:'attack',id:1}, guard={kind:'guard'}, dodge={kind:'dodge'};
test('simultaneous lethal hits draw, input state stays unchanged',()=>{
 const s=fresh();s.player.hp=s.enemy.hp=18;
 const n=D.resolve(s,shot,shot);
 assert.equal(n.result,'draw');assert.equal(s.player.hp,18);assert.equal(D.ammo(n.player,'bullets'),11);
});
test('defense matrix has counters and no random damage',()=>{
 assert.equal(D.resolve(fresh(),shot,guard).last.player.dealt,5);
 assert.equal(D.resolve(fresh(),shot,dodge).last.player.dealt,0);
 assert.equal(D.resolve(fresh(),{kind:'attack',id:3},dodge).last.player.dealt,15);
 const rocket=D.resolve(fresh(),{kind:'attack',id:5},guard);
 assert.equal(rocket.last.player.dealt,44);
 assert.equal(rocket.player.items.some(i=>i.type==='launcher'||i.type==='rockets'),false);
 assert.equal(D.resolve(fresh(),{kind:'attack',id:5},dodge).last.player.dealt,0);
});
test('cooldowns are per weapon type and require full intervening turns',()=>{
 let n=D.resolve(fresh(),shot,guard);
 assert.equal(D.legal(n.player,shot,n.turn),false);
 n.player.items.push({type:'pistol',id:99});
 assert.equal(D.legal(n.player,{kind:'attack',id:99},n.turn),false);
 assert.throws(()=>D.resolve(n,shot,guard));
 n=D.resolve(n,guard,guard);assert.equal(D.legal(n.player,shot,n.turn),true);
});
test('dodge consumes stamina, guard restores it',()=>{
 let n=D.resolve(fresh(),dodge,guard);n=D.resolve(n,dodge,guard);
 assert.equal(D.legal(n.player,dodge,n.turn),false);
 n=D.resolve(n,guard,guard);assert.equal(n.player.energy,1);
});
test('mixing spends one turn; healing is before simultaneous damage',()=>{
 let n=fresh();n.player.hp=10;
 n=D.resolve(n,{kind:'combine',ids:[7,8,9]},guard);
 assert.equal(n.player.hp,10);assert.equal(n.player.items.filter(i=>i.type==='mix').length,1);
 n=D.resolve(n,{kind:'heal',id:7},shot);
 assert.equal(n.player.maxHp,120);assert.equal(n.player.hp,62);
 assert.equal(n.player.items.some(i=>i.id===7),false);
});
test('empty packs disappear and attacks without ammo are illegal',()=>{
 const s=fresh();s.player.items.find(i=>i.type==='bullets').remaining=1;
 const n=D.resolve(s,shot,guard);
 assert.equal(D.ammo(n.player,'bullets'),0);assert.equal(n.player.items.some(i=>i.type==='bullets'),false);
 assert.equal(D.legal(n.player,shot,99),false);
});
test('stalling ends, and every legal matchup is symmetric when sides swap',()=>{
 let n=fresh();while(!n.result){n=D.resolve(n,guard,guard);assert.equal(n.player.hp,100);assert.equal(n.enemy.hp,100);}
 assert.equal(n.result,'draw');assert.equal(n.turn,25);
 const s=fresh();
 for(const a of D.actions(s.player,1))for(const b of D.actions(s.enemy,1)){
   const x=D.resolve(s,a,b),y=D.resolve(s,b,a);
   assert.deepEqual(x.player,y.enemy);assert.deepEqual(x.enemy,y.player);
 }
});
