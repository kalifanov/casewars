/* Shared, deterministic duel rules. No DOM, timers or opponent AI here. */
(function (root) {
  const WEAPONS = {
    knife: { damage: 8, cooldown: 0, ammo: null },
    pistol: { damage: 18, cooldown: 1, ammo: 'bullets' },
    shotgun: { damage: 30, cooldown: 2, ammo: 'shells' },
    launcher: { damage: 44, cooldown: 0, ammo: 'rockets' }
  };
  const AMMO = { bullets: 12, shells: 5, rockets: 1 };
  const clone = value => JSON.parse(JSON.stringify(value));
  function fighter(items) {
    return { hp: 100, maxHp: 100, energy: 2, ready: {}, items: clone(items).map(i =>
      AMMO[i.type] ? { ...i, remaining: i.remaining ?? AMMO[i.type] } : i) };
  }
  function ammo(f, type) { return f.items.filter(i => i.type === type).reduce((n, i) => n + i.remaining, 0); }
  function legal(f, action, turn) {
    if (!action || f.hp <= 0) return false;
    if (action.kind === 'guard') return true;
    if (action.kind === 'dodge') return f.energy > 0;
    const item = f.items.find(i => i.id === action.id);
    if (action.kind === 'attack') return !!item && !!WEAPONS[item.type] &&
      (f.ready[item.type] || 0) <= turn && (!WEAPONS[item.type].ammo || ammo(f, WEAPONS[item.type].ammo) > 0);
    if (action.kind === 'heal') return !!item && (item.type === 'green' ||
      (item.type === 'mix' && item.mix.includes('green'))) &&
      (f.hp < f.maxHp || (item.mix || []).includes('yellow'));
    if (action.kind === 'combine') {
      const ids = action.ids || [], herbs = ids.map(id => f.items.find(i => i.id === id));
      return ids.length >= 2 && ids.length <= 3 && new Set(ids).size === ids.length &&
        herbs.every(i => i && ['green', 'red', 'yellow'].includes(i.type)) &&
        new Set(herbs.map(i => i.type)).size === herbs.length && herbs.some(i => i.type === 'green');
    }
    return false;
  }
  function actions(f, turn) {
    const list = [{ kind: 'guard' }, { kind: 'dodge' }];
    f.items.forEach(i => list.push({ kind: WEAPONS[i.type] ? 'attack' : 'heal', id: i.id }));
    const herbs = ['green', 'red', 'yellow'].map(type => f.items.find(i => i.type === type)).filter(Boolean);
    list.push({ kind: 'combine', ids: herbs.map(i => i.id) });
    return list.filter(a => legal(f, a, turn));
  }
  function damage(attack, defense) {
    let value = attack.damage || 0;
    if (defense === 'dodge') value = attack.type === 'shotgun' ? Math.ceil(value / 2) : 0;
    if (defense === 'guard' && attack.type !== 'launcher') value = Math.ceil(value / 4);
    return value;
  }
  function prepare(f, a, turn) {
    const out = { kind: a.kind, damage: 0, healed: 0 };
    if (a.kind === 'guard') f.energy = Math.min(2, f.energy + 1);
    if (a.kind === 'dodge') f.energy--;
    const item = f.items.find(i => i.id === a.id);
    if (a.kind === 'attack') {
      const weapon = WEAPONS[item.type];
      Object.assign(out, { type: item.type, damage: weapon.damage });
      if (weapon.ammo) {
        const stack = f.items.find(i => i.type === weapon.ammo && i.remaining > 0);
        stack.remaining--;
      }
      f.items = f.items.filter(i => i.remaining !== 0 && !(item.type === 'launcher' && i.id === item.id));
      f.ready[item.type] = turn + weapon.cooldown + 1;
    }
    if (a.kind === 'heal') {
      const herbs = item.mix || [item.type];
      f.maxHp += herbs.includes('yellow') ? 20 : 0;
      out.healed = Math.min(herbs.includes('red') ? 70 : 30, f.maxHp - f.hp);
      f.hp += out.healed;
      f.items = f.items.filter(i => i.id !== item.id);
    }
    if (a.kind === 'combine') {
      const herbs = a.ids.map(id => f.items.find(i => i.id === id));
      f.items = f.items.filter(i => !a.ids.includes(i.id));
      f.items.push({ ...herbs[0], type: 'mix', rot: false, mix: herbs.map(i => i.type) });
    }
    return out;
  }
  function resolve(state, playerAction, enemyAction) {
    if (state.result || !legal(state.player, playerAction, state.turn) || !legal(state.enemy, enemyAction, state.turn))
      throw new Error('Invalid turn');
    const next = clone(state), turn = state.turn;
    // Both actions are committed before either fighter takes damage. Healing precedes damage.
    const player = prepare(next.player, playerAction, turn), enemy = prepare(next.enemy, enemyAction, turn);
    player.dealt = damage(player, enemyAction.kind);
    enemy.dealt = damage(enemy, playerAction.kind);
    next.player.hp = Math.max(0, next.player.hp - enemy.dealt);
    next.enemy.hp = Math.max(0, next.enemy.hp - player.dealt);
    next.last = { player, enemy, turn };
    next.turn++;
    if (!next.player.hp && !next.enemy.hp) next.result = 'draw';
    else if (!next.enemy.hp) next.result = 'win';
    else if (!next.player.hp) next.result = 'loss';
    else if (turn >= 24) {
      const difference = next.player.hp / next.player.maxHp - next.enemy.hp / next.enemy.maxHp;
      next.result = difference === 0 ? 'draw' : difference > 0 ? 'win' : 'loss';
    }
    return next;
  }
  const api = { WEAPONS, fighter, ammo, legal, actions, damage, resolve };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Duel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
