/* =========================================================
   IRON LOTUS — game data
   ========================================================= */

export const STARTING_DECK = [
  'straight-punch', 'palm-strike', 'low-sweep', 'iron-guard',
  'evasive-step', 'focused-breath', 'throat-jab', 'crescent-kick'
];

/* Cards are defined as three upgrade levels. Level 0 = base (shown as I),
   level 1 = tempered (II), level 2 = mastered (III). */
export const CARDS = [
  // ——— STARTER DECK ———
  {
    id: 'straight-punch', name: 'Straight Punch', sigil: '拳', style: 'tiger', type: 'Strike', rarity: 'starter',
    flavor: 'The first lesson, repeated ten thousand times.',
    levels: [
      { cost: 1, dmg: 6, posture: 8 },
      { cost: 1, dmg: 8, posture: 11 },
      { cost: 1, dmg: 11, posture: 15 }
    ]
  },
  {
    id: 'palm-strike', name: 'Palm Strike', sigil: '掌', style: 'tiger', type: 'Strike', rarity: 'starter',
    flavor: 'A push becomes a wave.',
    levels: [
      { cost: 1, dmg: 5, posture: 12 },
      { cost: 1, dmg: 7, posture: 16 },
      { cost: 1, dmg: 9, posture: 21 }
    ]
  },
  {
    id: 'low-sweep', name: 'Low Sweep', sigil: '掃', style: 'serpent', type: 'Strike', rarity: 'starter',
    flavor: 'Cut the root, and the tree forgets its balance.',
    levels: [
      { cost: 1, dmg: 4, posture: 14, statuses: { enemy: { weak: 1 } } },
      { cost: 1, dmg: 6, posture: 18, statuses: { enemy: { weak: 1 } } },
      { cost: 1, dmg: 8, posture: 24, statuses: { enemy: { weak: 2 } } }
    ]
  },
  {
    id: 'iron-guard', name: 'Iron Guard', sigil: '守', style: 'crane', type: 'Guard', rarity: 'starter',
    flavor: 'Stone does not argue with the rain.',
    levels: [
      { cost: 1, block: 6, recover: 12 },
      { cost: 1, block: 9, recover: 16 },
      { cost: 1, block: 12, recover: 22 }
    ]
  },
  {
    id: 'evasive-step', name: 'Evasive Step', sigil: '步', style: 'crane', type: 'Art', rarity: 'starter',
    flavor: 'The reed survives by bending.',
    levels: [
      { cost: 0, block: 3, draw: 1 },
      { cost: 0, block: 5, draw: 1 },
      { cost: 0, block: 6, draw: 2 }
    ]
  },
  {
    id: 'focused-breath', name: 'Focused Breath', sigil: '息', style: 'serpent', type: 'Breath', rarity: 'starter',
    flavor: 'Stillness is also a movement.',
    levels: [
      { cost: 0, chi: 1, recover: 8 },
      { cost: 0, chi: 1, draw: 1 },
      { cost: 0, chi: 2, draw: 1 }
    ]
  },
  {
    id: 'throat-jab', name: 'Throat Jab', sigil: '刺', style: 'serpent', type: 'Strike', rarity: 'starter',
    flavor: 'One finger finds the door no armor closes.',
    levels: [
      { cost: 2, dmg: 8, posture: 6, statuses: { enemy: { bleed: 2 } } },
      { cost: 2, dmg: 11, posture: 8, statuses: { enemy: { bleed: 3 } } },
      { cost: 2, dmg: 14, posture: 10, statuses: { enemy: { bleed: 4 } } }
    ]
  },
  {
    id: 'crescent-kick', name: 'Crescent Kick', sigil: '踢', style: 'tiger', type: 'Strike', rarity: 'starter',
    flavor: 'The moon draws a blade across the sky.',
    levels: [
      { cost: 2, dmg: 12, posture: 14 },
      { cost: 2, dmg: 15, posture: 18 },
      { cost: 2, dmg: 19, posture: 24 }
    ]
  },

  // ——— COMMON TECHNIQUES ———
  {
    id: 'chain-jab', name: 'Chain Jab', sigil: '連', style: 'tiger', type: 'Strike', rarity: 'common',
    flavor: 'A question asked twice, then a third time.',
    levels: [
      { cost: 1, dmg: 3, hits: 2, posture: 4 },
      { cost: 1, dmg: 4, hits: 2, posture: 5 },
      { cost: 1, dmg: 5, hits: 2, posture: 6 }
    ]
  },
  {
    id: 'shoulder-check', name: 'Shoulder Check', sigil: '肩', style: 'tiger', type: 'Strike', rarity: 'common',
    flavor: 'Bone remembers what the mind forgets.',
    levels: [
      { cost: 1, dmg: 6, posture: 10, block: 4 },
      { cost: 1, dmg: 8, posture: 13, block: 6 },
      { cost: 1, dmg: 10, posture: 16, block: 8 }
    ]
  },
  {
    id: 'deflecting-palm', name: 'Deflecting Palm', sigil: '撥', style: 'crane', type: 'Guard', rarity: 'common',
    flavor: 'Turn the river aside; do not dam it.',
    levels: [
      { cost: 1, block: 7, statuses: { self: { counter: 3 } } },
      { cost: 1, block: 9, statuses: { self: { counter: 4 } } },
      { cost: 1, block: 12, statuses: { self: { counter: 6 } } }
    ]
  },
  {
    id: 'rooted-stance', name: 'Rooted Stance', sigil: '樁', style: 'crane', type: 'Guard', rarity: 'common',
    flavor: 'Become the mountain the wind cannot move.',
    levels: [
      { cost: 1, block: 5, recover: 22 },
      { cost: 1, block: 7, recover: 28 },
      { cost: 1, block: 10, recover: 36 }
    ]
  },
  {
    id: 'serpents-coil', name: "Serpent's Coil", sigil: '纏', style: 'serpent', type: 'Strike', rarity: 'common',
    flavor: 'It does not squeeze. It waits.',
    levels: [
      { cost: 1, dmg: 4, posture: 4, statuses: { enemy: { bleed: 3 } } },
      { cost: 1, dmg: 5, posture: 6, statuses: { enemy: { bleed: 4 } } },
      { cost: 1, dmg: 7, posture: 8, statuses: { enemy: { bleed: 5 } } }
    ]
  },
  {
    id: 'feint', name: 'Feint', sigil: '虛', style: 'serpent', type: 'Art', rarity: 'common',
    flavor: 'The empty hand is the most honest lie.',
    levels: [
      { cost: 0, draw: 2, statuses: { self: { focus: 1 } } },
      { cost: 0, draw: 2, chi: 1, statuses: { self: { focus: 1 } } },
      { cost: 0, draw: 2, chi: 1, statuses: { self: { focus: 2 } } }
    ]
  },
  {
    id: 'rising-knee', name: 'Rising Knee', sigil: '膝', style: 'tiger', type: 'Strike', rarity: 'common',
    flavor: 'The earth pushes; the knee delivers.',
    levels: [
      { cost: 2, dmg: 9, posture: 22 },
      { cost: 2, dmg: 12, posture: 28 },
      { cost: 2, dmg: 16, posture: 34 }
    ]
  },
  {
    id: 'pressure-point', name: 'Pressure Point', sigil: '穴', style: 'serpent', type: 'Strike', rarity: 'common',
    flavor: 'Three fingers, one truth.',
    levels: [
      { cost: 2, dmg: 6, posture: 8, statuses: { enemy: { vulnerable: 2 } } },
      { cost: 2, dmg: 8, posture: 10, statuses: { enemy: { vulnerable: 2 } } },
      { cost: 2, dmg: 10, posture: 13, statuses: { enemy: { vulnerable: 3 } } }
    ]
  },
  {
    id: 'silken-parry', name: 'Silken Parry', sigil: '絲', style: 'crane', type: 'Guard', rarity: 'common',
    flavor: 'Softness, given a blade’s edge.',
    levels: [
      { cost: 2, block: 11, draw: 1, statuses: { self: { counter: 5 } } },
      { cost: 2, block: 14, draw: 1, statuses: { self: { counter: 6 } } },
      { cost: 2, block: 18, draw: 1, statuses: { self: { counter: 8 } } }
    ]
  },
  {
    id: 'mind-like-water', name: 'Mind Like Water', sigil: '水', style: 'crane', type: 'Art', rarity: 'common',
    flavor: 'The cup is useful because it is empty.',
    levels: [
      { cost: 1, draw: 2, chi: 1 },
      { cost: 1, draw: 2, chi: 1, block: 4 },
      { cost: 1, draw: 3, chi: 1, block: 6 }
    ]
  },
  {
    id: 'dragon-breath', name: 'Dragon Breath', sigil: '龍', style: 'serpent', type: 'Breath', rarity: 'common',
    flavor: 'Inhale the storm. Exhale the calm.',
    levels: [
      { cost: 1, chi: 2, heal: 3 },
      { cost: 1, chi: 2, heal: 5, draw: 1 },
      { cost: 1, chi: 3, heal: 6, draw: 1 }
    ]
  },
  {
    id: 'feral-roar', name: 'Feral Roar', sigil: '嘯', style: 'tiger', type: 'Art', rarity: 'common',
    flavor: 'The tiger does not announce itself twice.',
    levels: [
      { cost: 1, block: 3, statuses: { self: { strength: 2 } } },
      { cost: 1, block: 4, statuses: { self: { strength: 3 } } },
      { cost: 1, block: 6, statuses: { self: { strength: 4 } } }
    ]
  },

  // ——— RARE TECHNIQUES ———
  {
    id: 'thousand-fists', name: 'Thousand Fists', sigil: '千', style: 'tiger', type: 'Strike', rarity: 'rare',
    flavor: 'Not a thousand hands. One hand, a thousand times.',
    levels: [
      { cost: 3, dmg: 5, hits: 4, posture: 4 },
      { cost: 3, dmg: 6, hits: 4, posture: 4 },
      { cost: 3, dmg: 7, hits: 5, posture: 4 }
    ]
  },
  {
    id: 'empty-vessel', name: 'Empty Vessel', sigil: '空', style: 'crane', type: 'Art', rarity: 'rare',
    flavor: 'What cannot be struck cannot be broken.',
    levels: [
      { cost: 2, draw: 2, recover: 15, statuses: { self: { dodge: 1 } } },
      { cost: 2, draw: 2, recover: 20, block: 5, statuses: { self: { dodge: 1 } } },
      { cost: 2, draw: 2, recover: 25, block: 6, statuses: { self: { dodge: 2 } } }
    ]
  },
  {
    id: 'black-lotus-bloom', name: 'Black Lotus Bloom', sigil: '蓮', style: 'serpent', type: 'Strike', rarity: 'rare',
    flavor: 'Beauty is only another word for danger.',
    levels: [
      { cost: 3, dmg: 16, heal: 4, statuses: { enemy: { bleed: 4 } } },
      { cost: 3, dmg: 20, heal: 6, statuses: { enemy: { bleed: 5 } } },
      { cost: 3, dmg: 26, heal: 8, statuses: { enemy: { bleed: 7 } } }
    ]
  },
  {
    id: 'iron-body', name: 'Iron Body', sigil: '鐵', style: 'crane', type: 'Guard', rarity: 'rare',
    flavor: 'The body is a bell. Strike it, and hear your own name.',
    levels: [
      { cost: 2, block: 16, heal: 4, recover: 15 },
      { cost: 2, block: 20, heal: 6, recover: 20 },
      { cost: 2, block: 26, heal: 8, recover: 25 }
    ]
  },
  {
    id: 'executioners-palm', name: "Executioner's Palm", sigil: '誅', style: 'tiger', type: 'Strike', rarity: 'rare',
    flavor: 'Mercy is a decision made before the blow.',
    special: 'postureBonus',
    levels: [
      { cost: 3, dmg: 16, posture: 10, postureBonus: 12 },
      { cost: 3, dmg: 21, posture: 12, postureBonus: 15 },
      { cost: 3, dmg: 27, posture: 15, postureBonus: 20 }
    ]
  },
  {
    id: 'seven-point-strike', name: 'Seven-Point Strike', sigil: '七', style: 'serpent', type: 'Strike', rarity: 'rare',
    flavor: 'Count the places where the body forgets to be whole.',
    special: 'bleedBonus',
    levels: [
      { cost: 2, dmg: 10, posture: 6, bleedBonus: 3 },
      { cost: 2, dmg: 13, posture: 8, bleedBonus: 4 },
      { cost: 2, dmg: 16, posture: 10, bleedBonus: 5 }
    ]
  },
  {
    id: 'flow-state', name: 'Flow State', sigil: '流', style: 'serpent', type: 'Art', rarity: 'rare',
    flavor: 'The fight happens without you. You are merely its witness.',
    levels: [
      { cost: 1, chi: 2, draw: 3, exhaust: true },
      { cost: 1, chi: 2, draw: 3, block: 5, exhaust: true },
      { cost: 1, chi: 3, draw: 3, block: 5, exhaust: true }
    ]
  },
  {
    id: 'unbroken-will', name: 'Unbroken Will', sigil: '志', style: 'crane', type: 'Guard', rarity: 'rare',
    flavor: 'Fall seven times. Stand up eight.',
    levels: [
      { cost: 1, heal: 6, block: 4, recover: 10 },
      { cost: 1, heal: 8, block: 6, recover: 14 },
      { cost: 1, heal: 11, block: 9, recover: 18 }
    ]
  },
  {
    id: 'dragon-kick', name: 'Dragon Kick', sigil: '躍', style: 'tiger', type: 'Strike', rarity: 'rare',
    flavor: 'The sky is a floor that has not yet been broken.',
    levels: [
      { cost: 2, dmg: 14, posture: 20, statuses: { self: { vulnerable: 1 } } },
      { cost: 2, dmg: 18, posture: 26, statuses: { self: { vulnerable: 1 } } },
      { cost: 2, dmg: 23, posture: 32, statuses: { self: { vulnerable: 1 } } }
    ]
  },
  {
    id: 'nerve-strike', name: 'Nerve Strike', sigil: '脈', style: 'serpent', type: 'Strike', rarity: 'rare',
    flavor: 'The body has many doors. This one opens inward.',
    levels: [
      { cost: 1, dmg: 5, posture: 10, statuses: { enemy: { weak: 2 } } },
      { cost: 1, dmg: 7, posture: 13, statuses: { enemy: { weak: 2 } } },
      { cost: 1, dmg: 9, posture: 16, statuses: { enemy: { weak: 3 } } }
    ]
  }
];

export const CARD_BY_ID = Object.fromEntries(CARDS.map(c => [c.id, c]));

/* Every damaging technique aims at a body part. Crippling a part leaves a
   lasting injury for the rest of the duel. */
export const BODY_PARTS = {
  head: {
    label: 'Head', glyph: '頭', color: '#e0a786', max: 80,
    effect: 'Concussed. Their attacks deal 20% less damage.'
  },
  arms: {
    label: 'Arms', glyph: '臂', color: '#d8b678', max: 90,
    effect: 'Broken guard. Their attacks deal 30% less damage.'
  },
  torso: {
    label: 'Torso', glyph: '胸', color: '#d76a45', max: 120,
    effect: 'Cracked ribs. They take 20% more damage.'
  },
  legs: {
    label: 'Legs', glyph: '腿', color: '#9aae5a', max: 90,
    effect: 'Torn stance. Posture recovery halved; posture damage +25%.'
  }
};

export const CARD_TARGETS = {
  'straight-punch': 'torso',
  'palm-strike': 'torso',
  'low-sweep': 'legs',
  'throat-jab': 'head',
  'crescent-kick': 'head',
  'chain-jab': 'head',
  'shoulder-check': 'torso',
  'serpents-coil': 'arms',
  'rising-knee': 'torso',
  'pressure-point': 'arms',
  'thousand-fists': 'torso',
  'black-lotus-bloom': 'torso',
  'executioners-palm': 'head',
  'seven-point-strike': 'arms',
  'dragon-kick': 'legs',
  'nerve-strike': 'arms'
};

for (const [id, target] of Object.entries(CARD_TARGETS)) {
  if (CARD_BY_ID[id]) CARD_BY_ID[id].target = target;
}

/* ——— Enemy definitions ———
   Each enemy contains a look used by the canvas renderer, stats,
   and a pool of telegraphed moves. `statuses.enemy` targets the player. */
export const ENEMIES = [
  {
    id: 'ren', name: 'Ren', title: 'The Eager Student', chapter: 0, style: 'tiger', glyph: '仁',
    quote: '“Master said the first step is the hardest. I have been running ever since.”',
    hint: 'Ren leaves openings after big kicks. Punish his recovery.',
    hp: 34, posture: 100, postureRegen: 18, xp: 32, insight: 25, rewardTier: 1,
    look: { robe: '#3a3025', trim: '#c48263', sash: '#b23a2f', hair: '#181410', skin: '#c8a57c', build: 0.94, headband: '#b23a2f', topknot: true, weapon: 'none' },
    moves: [
      { id: 'jab', name: 'Quick Jab', glyph: '拳', kind: 'attack', dmg: 5, posture: 7, weight: 3 },
      { id: 'wild-kick', name: 'Wild Kick', glyph: '踢', kind: 'attack', dmg: 8, posture: 11, weight: 2, statuses: { self: { weak: 1 } } },
      { id: 'hop-back', name: 'Hop Back', glyph: '步', kind: 'guard', block: 4, recover: 8, weight: 1 }
    ]
  },
  {
    id: 'taro', name: 'Two-Blades Taro', title: 'The Twin Edge', chapter: 0, style: 'tiger', glyph: '刃',
    quote: '“One blade asks a question. Two blades refuse the answer.”',
    hint: 'His twin cuts stack Bleed. Guard often or end the fight quickly.',
    hp: 52, posture: 95, postureRegen: 18, xp: 42, insight: 35, rewardTier: 1,
    look: { robe: '#2f2b30', trim: '#b6574d', sash: '#6d7a88', hair: '#111012', skin: '#bf9a72', build: 0.98, headband: '#8d2f28', topknot: false, weapon: 'blades' },
    moves: [
      { id: 'twin-slash', name: 'Twin Slash', glyph: '雙', kind: 'attack', dmg: 3, hits: 2, posture: 5, weight: 3, statuses: { enemy: { bleed: 1 } } },
      { id: 'fan-kick', name: 'Fan Kick', glyph: '踢', kind: 'attack', dmg: 7, posture: 12, weight: 2 },
      { id: 'cross-guard', name: 'Cross Guard', glyph: '守', kind: 'guard', block: 6, weight: 1, statuses: { self: { counter: 3 } } }
    ]
  },
  {
    id: 'mei', name: 'Sister Mei', title: 'The Silken Fist', chapter: 0, style: 'crane', glyph: '梅',
    quote: '“Do not mistake my calm for permission.”',
    hint: 'Mei counters direct attacks. Break her posture with heavy strikes.',
    hp: 68, posture: 105, postureRegen: 20, xp: 52, insight: 45, rewardTier: 1,
    look: { robe: '#293a37', trim: '#7fb7b3', sash: '#d8b678', hair: '#171512', skin: '#d1ab82', build: 0.88, headband: '#7fb7b3', topknot: true, weapon: 'fan' },
    moves: [
      { id: 'silk-parry', name: 'Silk Parry', glyph: '絲', kind: 'guard', block: 7, weight: 2, statuses: { self: { counter: 4 } } },
      { id: 'palm-wave', name: 'Palm Wave', glyph: '掌', kind: 'attack', dmg: 7, posture: 9, weight: 3, statuses: { enemy: { weak: 1 } } },
      { id: 'crescent', name: 'Crescent Palm', glyph: '月', kind: 'attack', dmg: 10, posture: 14, weight: 2 }
    ]
  },
  {
    id: 'ox', name: 'Iron Ox', title: 'The Unmoved', chapter: 1, style: 'tiger', glyph: '牛',
    quote: '“I have been struck by better men than you. They are all tired now.”',
    hint: 'Ox builds Strength. His posture is enormous — guard the big blows.',
    hp: 84, posture: 145, postureRegen: 24, xp: 62, insight: 55, rewardTier: 2,
    look: { robe: '#382a20', trim: '#a9854f', sash: '#7f2e25', hair: '#0d0c0a', skin: '#9e7850', build: 1.16, headband: '#a9854f', topknot: false, weapon: 'none' },
    moves: [
      { id: 'boulder-fist', name: 'Boulder Fist', glyph: '岩', kind: 'attack', dmg: 13, posture: 18, weight: 3 },
      { id: 'iron-shirt', name: 'Iron Shirt', glyph: '鐵', kind: 'guard', block: 10, weight: 2, statuses: { self: { strength: 1 } } },
      { id: 'ground-slam', name: 'Ground Slam', glyph: '震', kind: 'attack', dmg: 8, posture: 12, weight: 2, statuses: { enemy: { vulnerable: 1 } } }
    ]
  },
  {
    id: 'whisper', name: 'Whisper', title: 'The Smoke', chapter: 1, style: 'serpent', glyph: '影',
    quote: '“You cannot hit what you cannot name.”',
    hint: 'Whisper dodges and applies Bleed. Multi-hit techniques beat a single dodge.',
    hp: 78, posture: 92, postureRegen: 22, xp: 70, insight: 65, rewardTier: 2,
    look: { robe: '#23262a', trim: '#7c8894', sash: '#42554d', hair: '#0a0a0c', skin: '#b08e6d', build: 0.9, headband: '#2d3f39', topknot: false, weapon: 'blades', masked: true },
    moves: [
      { id: 'poison-needle', name: 'Poison Needle', glyph: '毒', kind: 'attack', dmg: 4, posture: 5, weight: 3, statuses: { enemy: { bleed: 3 } } },
      { id: 'smoke-step', name: 'Smoke Step', glyph: '霧', kind: 'guard', block: 4, weight: 2, statuses: { self: { dodge: 1 } } },
      { id: 'shadow-kick', name: 'Shadow Kick', glyph: '踢', kind: 'attack', dmg: 6, hits: 2, posture: 6, weight: 2 }
    ]
  },
  {
    id: 'shen', name: 'Magistrate Shen', title: 'The Iron Writ', chapter: 1, style: 'crane', glyph: '令',
    quote: '“The law is a fist. I merely decide where it lands.”',
    hint: 'Shen weakens your strikes and exposes your guard. Pace your Chi.',
    hp: 104, posture: 125, postureRegen: 22, xp: 82, insight: 75, rewardTier: 2,
    look: { robe: '#2d2730', trim: '#b59a5e', sash: '#8c3a32', hair: '#151214', skin: '#c19b74', build: 1.02, headband: '#b59a5e', topknot: true, weapon: 'staff' },
    moves: [
      { id: 'verdict', name: 'Verdict', glyph: '判', kind: 'attack', dmg: 11, posture: 12, weight: 3, statuses: { enemy: { weak: 2 } } },
      { id: 'chains', name: 'Paper Chains', glyph: '枷', kind: 'attack', dmg: 6, posture: 9, weight: 2, statuses: { enemy: { vulnerable: 2 } } },
      { id: 'edict', name: 'Edict of Iron', glyph: '令', kind: 'buff', block: 8, weight: 1, statuses: { self: { strength: 2 } } }
    ]
  },
  {
    id: 'ryo', name: 'Abbot Ryo', title: 'Keeper of the Bell', chapter: 2, style: 'crane', glyph: '禅',
    quote: '“The bell does not strike the silence. It reveals it.”',
    hint: 'Ryo heals when wounded. Save a heavy combination to finish him.',
    hp: 120, posture: 120, postureRegen: 24, xp: 96, insight: 85, rewardTier: 3,
    look: { robe: '#3a3529', trim: '#c8a76a', sash: '#5c6e59', hair: '#1b1813', skin: '#cba77d', build: 1.04, headband: '#c8a76a', topknot: false, shaved: true, weapon: 'staff' },
    moves: [
      { id: 'staff-sweep', name: 'Staff Sweep', glyph: '棍', kind: 'attack', dmg: 9, posture: 16, weight: 3 },
      { id: 'mountain-palm', name: 'Mountain Palm', glyph: '山', kind: 'attack', dmg: 14, posture: 12, weight: 2 },
      { id: 'healing-breath', name: 'Healing Breath', glyph: '息', kind: 'heal', block: 6, heal: 10, weight: 2, hpBelow: 0.85 }
    ]
  },
  {
    id: 'hollow', name: 'The Hollow Monk', title: 'Vessel of Nothing', chapter: 2, style: 'serpent', glyph: '空',
    quote: '“Strike me. There is nothing here to strike.”',
    hint: 'The Hollow Monk strikes many times. A single guard card will not be enough.',
    hp: 136, posture: 115, postureRegen: 20, xp: 112, insight: 95, rewardTier: 3,
    look: { robe: '#1f2422', trim: '#8da59a', sash: '#3d4f48', hair: '#0a0b0a', skin: '#9c8a78', build: 1.0, headband: '#8da59a', topknot: false, masked: true, weapon: 'none' },
    moves: [
      { id: 'three-bells', name: 'Three Bells', glyph: '三', kind: 'attack', dmg: 5, hits: 3, posture: 4, weight: 3 },
      { id: 'karma-strike', name: 'Karma Strike', glyph: '業', kind: 'attack', dmg: 12, posture: 10, weight: 2, statuses: { self: { counter: 5 } } },
      { id: 'void-step', name: 'Void Step', glyph: '無', kind: 'guard', heal: 5, weight: 1, statuses: { self: { dodge: 1 } } }
    ]
  },
  {
    id: 'veil', name: 'Crimson Veil', title: 'The Blood Lotus', chapter: 3, style: 'serpent', glyph: '血',
    quote: '“Every petal is a promise. Every promise bleeds.”',
    hint: 'Veil drinks your wounds. Keep your Guard high and bleed her first.',
    hp: 155, posture: 130, postureRegen: 22, xp: 128, insight: 110, rewardTier: 3, boss: true,
    look: { robe: '#3a1e22', trim: '#c7564a', sash: '#7a1f29', hair: '#120a0c', skin: '#d2a688', build: 0.92, headband: '#c7564a', topknot: true, weapon: 'fan', veil: true },
    moves: [
      { id: 'blood-dance', name: 'Blood Dance', glyph: '舞', kind: 'attack', dmg: 5, hits: 3, posture: 5, weight: 3, statuses: { enemy: { bleed: 2 } } },
      { id: 'crimson-nail', name: 'Crimson Nail', glyph: '爪', kind: 'attack', dmg: 12, posture: 10, weight: 2, statuses: { enemy: { bleed: 4 } } },
      { id: 'sanguine-ward', name: 'Sanguine Ward', glyph: '血', kind: 'heal', block: 12, heal: 6, weight: 1, statuses: { self: { strength: 1 } } }
    ]
  },
  {
    id: 'kurogane', name: 'Master Kurogane', title: 'The Last Petal', chapter: 3, style: 'tiger', glyph: '鉄',
    quote: '“I did not guard the lotus from the world. I guarded the world from the lotus. Now you will learn why.”',
    hint: 'Kurogane unleashes his true blade below half health. Hold nothing back.',
    hp: 190, posture: 150, postureRegen: 26, xp: 170, insight: 150, rewardTier: 4, boss: true, final: true,
    look: { robe: '#24221e', trim: '#d8b678', sash: '#8f2d25', hair: '#0b0b09', skin: '#b08b66', build: 1.1, headband: '#d8b678', topknot: true, weapon: 'staff', scar: true },
    phase2At: 0.5,
    moves: [
      { id: 'steel-draw', name: 'Steel Draw', glyph: '斬', kind: 'attack', dmg: 15, posture: 16, weight: 3 },
      { id: 'dragon-tail', name: "Dragon's Tail", glyph: '尾', kind: 'attack', dmg: 8, hits: 2, posture: 12, weight: 2 },
      { id: 'empty-mind', name: 'Empty Mind', glyph: '空', kind: 'guard', block: 10, weight: 2, statuses: { self: { counter: 6 } } },
      { id: 'thousand-cuts', name: 'Thousand Cuts', glyph: '千', kind: 'attack', dmg: 6, hits: 4, posture: 6, weight: 3, phase2: true },
      { id: 'final-bell', name: 'Final Bell', glyph: '終', kind: 'attack', dmg: 22, posture: 18, weight: 2, phase2: true, statuses: { enemy: { vulnerable: 1 } } },
      { id: 'still-water', name: 'Still Water', glyph: '水', kind: 'heal', block: 12, heal: 8, weight: 1, phase2: true, statuses: { self: { strength: 1 } } }
    ]
  }
];

export const CHAPTERS = [
  { num: 'I', name: 'The Bamboo Gate', range: [0, 1, 2], blurb: 'Where every student learns that pain is a patient teacher.' },
  { num: 'II', name: 'The Crimson Court', range: [3, 4, 5], blurb: 'A city of iron writs, bought silence, and smiling poison.' },
  { num: 'III', name: 'The Moonlit Peak', range: [6, 7], blurb: 'Above the clouds, the old vows are kept by older hands.' },
  { num: 'IV', name: 'The Black Lotus', range: [8, 9], blurb: 'At the summit, the flower opens only for blood.' }
];

export const STATUS_INFO = {
  bleed:      { label: 'Bleed', icon: '血', desc: 'Lose HP at the end of your turn, then Bleed fades by 1.' },
  vulnerable: { label: 'Vulnerable', icon: '破', desc: 'Takes 30% more damage.' },
  weak:       { label: 'Weak', icon: '弱', desc: 'Deals 25% less damage.' },
  strength:   { label: 'Strength', icon: '力', desc: 'Attacks deal extra damage per hit. Lasts the whole duel.' },
  counter:    { label: 'Counter', icon: '反', desc: 'The next attack against you is answered with this much damage.' },
  dodge:      { label: 'Dodge', icon: '避', desc: 'Completely avoids the next hit, then fades.' },
  focus:      { label: 'Focus', icon: '集', desc: 'Your next attack deals 50% more damage.' },
  regen:      { label: 'Regen', icon: '癒', desc: 'Heal at the end of your turn.' },
  stun:       { label: 'Stunned', icon: '停', desc: 'Lose the next turn.' }
};

export const DIFFICULTY_LABEL = {
  1: 'Novice', 2: 'Adept', 3: 'Master', 4: 'Grandmaster'
};

export function cardLevel(cardId, upgrades) {
  return Math.max(0, Math.min(2, upgrades?.[cardId] ?? 0));
}

export function getCardStats(cardId, upgrades) {
  const card = CARD_BY_ID[cardId];
  if (!card) return null;
  return { ...card.levels[cardLevel(cardId, upgrades)] };
}

export function cardCost(cardId, upgrades) {
  return getCardStats(cardId, upgrades).cost ?? 0;
}

export function upgradeCost(cardId, upgrades) {
  const lvl = cardLevel(cardId, upgrades);
  return lvl >= 2 ? null : lvl === 0 ? 30 : 65;
}

/* Description lines, kept concise so they fit the card face. */
export function describeCard(cardId, upgrades) {
  const s = getCardStats(cardId, upgrades);
  const card = CARD_BY_ID[cardId];
  const parts = [];
  if (s.dmg) {
    if (s.hits > 1) parts.push(`Deal <b>${s.dmg}</b>×${s.hits} damage.`);
    else parts.push(`Deal <b>${s.dmg}</b> damage.`);
  }
  if (s.posture) parts.push(`+<b>${s.posture}</b> posture.`);
  if (s.block) parts.push(`Gain <b>${s.block}</b> Guard.`);
  if (s.heal) parts.push(`Heal <b>${s.heal}</b>.`);
  if (s.chi) parts.push(`Gain <b>${s.chi}</b> Chi.`);
  if (s.draw) parts.push(`Draw <b>${s.draw}</b>.`);
  if (s.recover) parts.push(`Recover <b>${s.recover}</b> balance.`);
  if (s.statuses?.self) {
    for (const [k, v] of Object.entries(s.statuses.self)) {
      parts.push(`Gain <b>${v}</b> <span class="kw">${STATUS_INFO[k]?.label ?? k}</span>.`);
    }
  }
  if (s.statuses?.enemy) {
    for (const [k, v] of Object.entries(s.statuses.enemy)) {
      parts.push(`Apply <b>${v}</b> <span class="kw">${STATUS_INFO[k]?.label ?? k}</span>.`);
    }
  }
  if (s.postureBonus) parts.push(`+<b>${s.postureBonus}</b> damage if posture is 50+.`);
  if (s.bleedBonus) parts.push(`+<b>${s.bleedBonus}</b> damage per Bleed.`);
  if (s.exhaust) parts.push(`<span class="kw">Exhaust</span>.`);
  return parts.join(' ') || 'A quiet technique.';
}

export function describeMove(move) {
  const parts = [];
  if (move.dmg) {
    const dmg = move.hits > 1 ? `${move.dmg}×${move.hits} damage` : `${move.dmg} damage`;
    parts.push(dmg);
  }
  if (move.posture) parts.push(`+${move.posture} posture`);
  if (move.block) parts.push(`Guard ${move.block}`);
  if (move.heal) parts.push(`heal ${move.heal}`);
  if (move.recover) parts.push(`recover ${move.recover}`);
  if (move.statuses?.enemy) {
    for (const [k, v] of Object.entries(move.statuses.enemy)) parts.push(`${STATUS_INFO[k]?.label ?? k} ${v}`);
  }
  if (move.statuses?.self) {
    for (const [k, v] of Object.entries(move.statuses.self)) parts.push(`self ${STATUS_INFO[k]?.label ?? k} ${v}`);
  }
  return parts.join(' · ');
}

export function rewardPool(maxTier) {
  return CARDS.filter(c => {
    if (c.rarity === 'starter') return false;
    const tier = c.rarity === 'rare' ? 3 : 1;
    return tier <= maxTier;
  });
}
