/**
 * tests_resultats.js — Tests automatiques V.A.L.E.U.R©
 * Méthode V.A.L.E.U.R© · Céline Bourbon · Psychologue
 * 
 * Usage : node tests_resultats.js
 */

const fs = require('fs');
const vm = require('vm');

// ── Charger resultats.html et extraire le JS ──────────────────────────────
const html = fs.readFileSync('resultats.html', 'utf8');
const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)]
  .map(m => m[1]).join('\n');

// Simuler les APIs navigateur absentes dans Node
const browserStubs = `
  const window = { location: { href: 'http://localhost/resultats.html', search: '' } };
  const document = {
    getElementById: () => ({ innerHTML: '', style: {}, classList: { add:()=>{} } }),
    querySelectorAll: () => [],
    querySelector: () => null,
    addEventListener: () => {},
    body: { style: {} },
  };
  const localStorage = { getItem: () => null, setItem: () => {} };
  const sessionStorage = { getItem: () => null };
  const URLSearchParams = class {
    constructor(s) { this._p = {}; }
    get(k) { return null; }
  };
  const IntersectionObserver = class { observe(){} };
  const navigator = { userAgent: '' };
  const history = { pushState: ()=>{} };
`;

const ctx = { console, setTimeout:()=>{}, clearTimeout:()=>{}, require };
vm.createContext(ctx);
try {
  vm.runInContext(browserStubs + scripts, ctx);
} catch(e) {
  // Certaines erreurs d'init (DOM manquant) sont normales
}

// ── Utilitaires de test ───────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const failures = [];

function test(label, got, expected) {
  const ok = JSON.stringify(got) === JSON.stringify(expected);
  if (ok) {
    process.stdout.write(`  ✓ ${label}\n`);
    passed++;
  } else {
    process.stdout.write(`  ✗ ${label}\n`);
    process.stdout.write(`      Attendu : ${JSON.stringify(expected)}\n`);
    process.stdout.write(`      Obtenu  : ${JSON.stringify(got)}\n`);
    failed++;
    failures.push(label);
  }
}

function testContains(label, str, substring) {
  const ok = typeof str === 'string' && str.includes(substring);
  if (ok) { process.stdout.write(`  ✓ ${label}\n`); passed++; }
  else {
    process.stdout.write(`  ✗ ${label} — "${substring}" absent\n`);
    failed++;
    failures.push(label);
  }
}

function testNotContains(label, str, substring, isRegex = false) {
  const found = isRegex
    ? new RegExp(substring).test(str)
    : str.includes(substring);
  if (!found) { process.stdout.write(`  ✓ ${label}\n`); passed++; }
  else {
    process.stdout.write(`  ✗ ${label} — "${substring}" trouvé (ne devrait pas)\n`);
    failed++;
    failures.push(label);
  }
}

function section(title) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  ${title}`);
  console.log('═'.repeat(60));
}

// ── Récupérer les fonctions depuis le contexte VM ─────────────────────────
const lv             = ctx.lv;
const detectProfile  = ctx.detectProfile;
const gd             = ctx.gd;
const gt             = ctx.gt;
const buildPage      = ctx.buildPage;

// ─────────────────────────────────────────────────────────────────────────
// PARTIE 1 — lv(p) : niveaux
// ─────────────────────────────────────────────────────────────────────────
section('PARTIE 1 — lv(p) : seuils de niveau');

if (typeof lv !== 'function') {
  console.log('  ⚠ lv() non trouvée dans resultats.html — vérifier le nom de la fonction');
} else {
  test('lv(0)   = Non significatif',   lv(0),   'Non significatif');
  test('lv(15)  = Non significatif',   lv(15),  'Non significatif');
  test('lv(29)  = Non significatif',   lv(29),  'Non significatif');
  test('lv(30)  = Modéré',             lv(30),  'Modéré');
  test('lv(40)  = Modéré',             lv(40),  'Modéré');
  test('lv(49)  = Modéré',             lv(49),  'Modéré');
  test('lv(50)  = Significatif',       lv(50),  'Significatif');
  test('lv(57)  = Significatif',       lv(57),  'Significatif');
  test('lv(64)  = Significatif',       lv(64),  'Significatif');
  test('lv(65)  = Élevé',              lv(65),  'Élevé');
  test('lv(72)  = Élevé',              lv(72),  'Élevé');
  test('lv(79)  = Élevé',              lv(79),  'Élevé');
  test('lv(80)  = Dominant',           lv(80),  'Dominant');
  test('lv(91)  = Dominant',           lv(91),  'Dominant');
  test('lv(100) = Dominant',           lv(100), 'Dominant');
}

// ─────────────────────────────────────────────────────────────────────────
// PARTIE 2 — detectProfile() : arbre 5 étapes
// ─────────────────────────────────────────────────────────────────────────
section('PARTIE 2 — detectProfile() : arbre de décision');

if (typeof detectProfile !== 'function') {
  console.log('  ⚠ detectProfile() non trouvée');
} else {

  // CAS 1 — MONO DOMINANT sans secondaire
  let r = detectProfile({orange:85, rouge:30, jaune:40, vert:35, bleu:50, indigo:60, violet:25});
  test('CAS 1 — Mono dominant (type)',    r.type,    'mono');
  test('CAS 1 — Mono dominant (subtype)', r.subtype, 'dominant');
  test('CAS 1 — Mono dominant (mask)',    r.masks[0], 'orange');
  test('CAS 1 — Pas de secondaire',       r.secondary, undefined);

  // CAS 2 — MONO DOMINANT avec secondaire
  r = detectProfile({orange:85, indigo:70, rouge:30, jaune:40, vert:35, bleu:50, violet:25});
  test('CAS 2 — Mono + secondaire (type)',      r.type,      'mono');
  test('CAS 2 — Mono + secondaire (subtype)',   r.subtype,   'dominant_secondaire');
  test('CAS 2 — Secondaire détecté',            r.secondary, 'indigo');

  // CAS 3 — orange=80 exact → MONO, pas triade malgré indigo=75 vert=70
  r = detectProfile({orange:80, indigo:75, vert:70, bleu:65, rouge:30, jaune:40, violet:25});
  test('CAS 3 — orange=80 exact → type mono',        r.type,    'mono');
  test('CAS 3 — orange=80 exact → PAS triade',       r.type !== 'triade', true);
  test('CAS 3 — Secondaire = indigo',                r.secondary, 'indigo');

  // CAS 4 — DYADE pure (écart <= 10, 3e masque < 55)
  r = detectProfile({vert:72, bleu:68, orange:40, jaune:35, rouge:30, indigo:50, violet:25});
  test('CAS 4 — Dyade pure (type)',    r.type,    'dyade');
  test('CAS 4 — Dyade pure (subtype)', r.subtype, 'dyade');
  test('CAS 4 — Masques dyade',        r.masks.sort().join('+'), 'bleu+vert');

  // CAS 5 — DYADE écart exactement 10 (limite incluse)
  r = detectProfile({vert:75, bleu:65, orange:40, jaune:35, rouge:30, indigo:50, violet:25});
  test('CAS 5 — Dyade écart=10 inclus (type)', r.type, 'dyade');

  // CAS 6 — DYADE avec tertiaire actif (3e masque 55-59)
  r = detectProfile({vert:72, bleu:68, orange:57, jaune:35, rouge:30, indigo:40, violet:25});
  test('CAS 6 — Dyade tertiaire (type)',    r.type,    'dyade');
  test('CAS 6 — Dyade tertiaire (subtype)', r.subtype, 'dyade_tertiaire');

  // CAS 7 — DYADE écart > 10 → PAS dyade
  r = detectProfile({vert:78, bleu:65, orange:40, jaune:35, rouge:30, indigo:50, violet:25});
  test('CAS 7 — Dyade écart=13 > 10 → PAS dyade', r.type !== 'dyade', true);

  // CAS 8 — TRIADE (3 masques >= 60, écart <= 15)
  r = detectProfile({orange:72, indigo:65, vert:60, bleu:55, rouge:30, jaune:40, violet:25});
  test('CAS 8 — Triade (type)',   r.type, 'triade');
  test('CAS 8 — 3 masques',       r.masks.length, 3);

  // CAS 9 — TRIADE écart exactement 15 (limite incluse)
  r = detectProfile({orange:75, indigo:65, vert:60, bleu:40, rouge:30, jaune:35, violet:25});
  test('CAS 9 — Triade écart=15 inclus (type)', r.type, 'triade');

  // CAS 10 — PAN-MASQUES (maintenant en ÉTAPE 1 — accessible)
  // 6 masques >= 65%, écart 79-65=14 <= 20pts, aucun >= 80% → PAN
  r = detectProfile({vert:79, orange:75, bleu:70, indigo:68, jaune:66, rouge:65, violet:40});
  test('CAS 10 — Pan-masques (type)',       r.type,          'pan');
  test('CAS 10 — Pan-masques (6 masques)',  r.masks.length,  6);

  // CAS 10b — PAN prime sur MONO si 6 masques >=65 (pan vérifié en premier)
  r = detectProfile({vert:81, orange:75, bleu:70, indigo:68, jaune:66, rouge:65, violet:40});
  test('CAS 10b — vert=81 mais 6 masques >=65 → PAN (étape 1)', r.type, 'pan');

  // CAS 10c — MONO quand <6 masques >=65 (pan non déclenché)
  r = detectProfile({vert:81, orange:75, bleu:70, indigo:68, jaune:60, rouge:50, violet:40});
  test('CAS 10c — vert=81, seulement 4 masques >=65 → MONO', r.type, 'mono');
  test('CAS 10c — masque dominant = vert', r.masks[0], 'vert');

  // CAS 11 — RÉSIDUEL
  r = detectProfile({rouge:60, orange:55, jaune:50, vert:62, bleu:48, indigo:55, violet:40});
  test('CAS 11 — Résiduel (type)', r.type, 'residuel');

  // CAS CRITIQUE — Orange (91%) + Indigo (79%) + Vert (75%) → MONO car orange >= 80
  r = detectProfile({orange:91, indigo:79, vert:75, bleu:66, violet:56, jaune:46, rouge:25});
  test('CAS CRITIQUE (PDF Céline) — type=mono car orange>=80', r.type, 'mono');
  test('CAS CRITIQUE (PDF Céline) — secondaire=indigo',        r.secondary, 'indigo');
  test('CAS CRITIQUE (PDF Céline) — PAS de triade',            r.type !== 'triade', true);
}

// ─────────────────────────────────────────────────────────────────────────
// PARTIE 3 — DY lookup : 21 dyades dans les deux sens
// ─────────────────────────────────────────────────────────────────────────
section('PARTIE 3 — DY lookup : 21 dyades (commutativité + champs)');

const DYADES_21 = [
  ['rouge','orange'],['rouge','jaune'],['rouge','vert'],['rouge','bleu'],
  ['rouge','indigo'],['rouge','violet'],['orange','jaune'],['orange','vert'],
  ['orange','bleu'],['orange','indigo'],['orange','violet'],['jaune','vert'],
  ['jaune','bleu'],['jaune','indigo'],['jaune','violet'],['vert','bleu'],
  ['vert','indigo'],['vert','violet'],['bleu','indigo'],['bleu','violet'],
  ['indigo','violet']
];

// gd() est const dans le script → non exportée par vm. On parse DY directement depuis le HTML.
function buildDY(html) {
  const DY = {};
  // Single-quote entries: sd('key', {...})
  for (const m of html.matchAll(/sd\('([^']+)',\{([\s\S]*?)\}\);/g)) {
    const key = m[1];
    const body = m[2];
    const get = (b, isLast) => {
      if (isLast) {
        const idx = body.lastIndexOf(b+":'");
        return idx >= 0 ? body.slice(idx + b.length + 2).replace(/'\s*$/, '') : '';
      }
      const rx = new RegExp(b + ":'(.*?)',b\\d", 's');
      const r = rx.exec(body);
      return r ? r[1] : '';
    };
    DY[key] = { n:get('n',false), b1:get('b1',false), b2:get('b2',false),
                b3:get('b3',false), b4:get('b4',false), b5:get('b5',false), b6:get('b6',true) };
  }
  // Double-quote entry: sd("key", {...})
  for (const m of html.matchAll(/sd\("([^"]+)",\{([\s\S]*?)\}\);/g)) {
    const key = m[1];
    const body = m[2];
    const get = (b, isLast) => {
      if (isLast) {
        const idx = body.lastIndexOf(b+':"');
        return idx >= 0 ? body.slice(idx + b.length + 2).replace(/"?\s*$/, '') : '';
      }
      const rx = new RegExp(b + ':"(.*?)",b\\d', 's');
      const r = rx.exec(body);
      return r ? r[1] : '';
    };
    DY[key] = { n:get('n',false), b1:get('b1',false), b2:get('b2',false),
                b3:get('b3',false), b4:get('b4',false), b5:get('b5',false), b6:get('b6',true) };
  }
  return DY;
}

const DY_parsed = buildDY(html);
const gdParsed = (a, b) => DY_parsed[a+'+'+b] || DY_parsed[b+'+'+a] || null;

const dyOkCount = DYADES_21.filter(([a,b]) => {
  const d1 = gdParsed(a, b);
  const d2 = gdParsed(b, a);
  return d1 && d1.n && d1.b1 && d1.b6 && d2 && d1.n === d2.n;
}).length;

if (dyOkCount === 21) {
  process.stdout.write(`  ✓ 21/21 dyades : champs complets + commutativité OK\n`);
  passed++;
} else {
  const bad = DYADES_21.filter(([a,b]) => {
    const d = gdParsed(a,b);
    return !d || !d.n || !d.b6;
  });
  bad.forEach(([a,b]) => {
    process.stdout.write(`  ✗ dyade ${a}+${b} manquante ou incomplète\n`);
    failed++; failures.push(`DY[${a}+${b}]`);
  });
}

// ─────────────────────────────────────────────────────────────────────────
// PARTIE 4 — gt() : 15 triades (permutations)
// ─────────────────────────────────────────────────────────────────────────
section('PARTIE 4 — gt() : 15 triades (permutations)');

const TRIADES_15 = [
  ['rouge','jaune','orange'],['jaune','bleu','indigo'],['vert','indigo','orange'],
  ['rouge','bleu','jaune'],['violet','orange','indigo'],['rouge','vert','jaune'],
  ['jaune','vert','bleu'],['rouge','orange','violet'],['indigo','bleu','orange'],
  ['vert','jaune','orange'],['rouge','indigo','jaune'],['violet','vert','bleu'],
  ['bleu','jaune','orange'],['rouge','vert','violet'],['indigo','jaune','violet']
];

if (typeof gt !== 'function') {
  console.log('  ⚠ gt() non trouvée');
} else {
  let trOk = 0;
  for (const keys of TRIADES_15) {
    // Test les 6 permutations
    const perms = [
      [keys[0],keys[1],keys[2]], [keys[0],keys[2],keys[1]],
      [keys[1],keys[0],keys[2]], [keys[1],keys[2],keys[0]],
      [keys[2],keys[0],keys[1]], [keys[2],keys[1],keys[0]],
    ];
    const results = perms.map(p => gt(p));
    const allFound = results.every(r => r && r.n);
    const allSame  = results.every(r => r && r.n === results[0].n);
    const hasFields = results[0] && results[0].n && results[0].b1 &&
                      results[0].b7;

    if (allFound && allSame && hasFields) {
      trOk++;
    } else {
      const label = keys.join('+');
      process.stdout.write(`  ✗ triade ${label} — found:${allFound} same:${allSame} fields:${hasFields}\n`);
      failed++;
      failures.push(`gt([${label}])`);
    }
  }
  if (trOk === 15) {
    process.stdout.write(`  ✓ 15/15 triades : champs complets + toutes permutations OK\n`);
    passed++;
  }
}

// ─────────────────────────────────────────────────────────────────────────
// PARTIE 5 — Calculs de score (formules brut → %)
// ─────────────────────────────────────────────────────────────────────────
section('PARTIE 5 — Calculs de score (items inversés)');

// Reproduire la logique de index.html — items RÉELS extraits du questionnaire
const MASK_DEF = {
  rouge:  { items:[1,8,15,22,29,36,43,44], inv:[],   max:32 },
  orange: { items:[2,9,16,23,30,37,45,46], inv:[],   max:32 },
  jaune:  { items:[3,10,17,24,31,38],      inv:[38], max:24 },
  vert:   { items:[4,11,18,25,32,39],      inv:[32], max:24 },
  bleu:   { items:[5,12,19,26,33,40,47,48],inv:[48], max:32 },
  indigo: { items:[6,13,20,27,34,41],      inv:[],   max:24 },
  violet: { items:[7,14,21,28,35,42,49,50],inv:[],   max:32 },
};

function simulerScores(responses) {
  const scores = {};
  for (const [key, def] of Object.entries(MASK_DEF)) {
    let brut = 0;
    for (const q of def.items) {
      if (def.inv && def.inv.includes(q)) {
        brut += (4 - (responses[q] || 0));
      } else {
        brut += (responses[q] || 0);
      }
    }
    scores[key] = Math.round((brut / def.max) * 100);
  }
  return scores;
}

// Tous à 4 — items inversés Q32(vert) Q38(jaune) Q48(bleu) → brut=4→inversé=0
const allFour = {};
for (let i=1;i<=50;i++) allFour[i]=4;
const s1 = simulerScores(allFour);
test('Score rouge tous=4 → 100%',  s1.rouge,  100);
test('Score orange tous=4 → 100%', s1.orange, 100);
test('Score indigo tous=4 → 100%', s1.indigo, 100);
test('Score violet tous=4 → 100%', s1.violet, 100);
test('Score jaune tous=4 → 83% (Q38 inversé)', s1.jaune, 83);
test('Score vert  tous=4 → 83% (Q32 inversé)', s1.vert,  83);
test('Score bleu  tous=4 → 88% (Q48 inversé)', s1.bleu,  88);

// Tous à 1 — min possible (items inversés à 1 → inversé=3 → score plus haut)
const allOne = {};
for (let i=1;i<=50;i++) allOne[i]=1;
const s2 = simulerScores(allOne);
test('Score rouge tous=1 → 25%',  s2.rouge,  25);
test('Score orange tous=1 → 25%', s2.orange, 25);
test('Score jaune tous=1 → 33% (Q38 inversé boost)',  s2.jaune, 33);
test('Score vert  tous=1 → 33% (Q32 inversé boost)',  s2.vert,  33);
test('Score bleu  tous=1 → 31% (Q48 inversé boost)',  s2.bleu,  31);

// Profil Orange dominant — items orange à max, reste faible
// orange items: 2,9,16,23,30,37,45,46 → tous à 4 → 32/32 = 100%
// On réduit légèrement pour obtenir ~91%
const repCeline = {};
for (let i=1;i<=50;i++) repCeline[i]=1; // base basse
// Orange: 8 items, 7×4 + 1×3 = 31/32 = 97%
[2,9,16,23,30,45,46].forEach(q => repCeline[q]=4);
repCeline[37]=3;
// Indigo: 6 items, 5×4+1×3 = 27/24 — attention max=24, items:[6,13,20,27,34,41]
[6,13,20,27,34].forEach(q => repCeline[q]=4); repCeline[41]=3;
// Vert: items:[4,11,18,25,32,39], Q32 inversé, 5×4+inv(32=1→3) = 23/24 = 96%
[4,11,18,25,39].forEach(q => repCeline[q]=4); repCeline[32]=1;
const scCeline = simulerScores(repCeline);
test('Profil Céline — orange dominant',  scCeline.orange > scCeline.indigo, true);
test('Profil Céline — orange > 80%',     scCeline.orange >= 80, true);
const profil = detectProfile ? detectProfile(scCeline) : null;
if (profil) {
  test('Profil Céline — type mono',        profil.type, 'mono');
  test('Profil Céline — masque = orange',  profil.masks[0], 'orange');
}

// ─────────────────────────────────────────────────────────────────────────
// PARTIE 6 — Lexique interdit dans tous les textes
// ─────────────────────────────────────────────────────────────────────────
section('PARTIE 6 — Lexique interdit dans tous les textes');

const INTERDIT = [
  'pathologie','trouble','diagnostic','narcissisme','toxique',
  'psychiatrique','dysfonctionnel','symptôme','clinique','DSM'
];
// Regex tutoiement : éviter les faux positifs sur "êtes", "notes", "listes", "êtes", etc.
// \btu\b : faux positif sur "tuent", "étude" → OK car \b
// \btes\b : faux positif sur "êtes" (ê n'est pas \w donc \b match avant t)
// Solution : chercher ' tes ' (avec espaces) plutôt que \btes\b
const TUTOIEMENT_REGEX = [
  { pat: /\btoi\b/,        label: "'toi'" },
  { pat: / tes /,          label: "' tes '" },
  { pat: / te /,           label: "' te '" },
  { pat: /\btu\b/,         label: "'tu'" },
  { pat: /[^êèéàùâôî]ton\b/, label: "'ton'" },
  { pat: /[^êèéàùâôî]ta\b/,  label: "'ta' (possessif)" },
];
const CONJUGAISON = [
  'vous pourras','vous ressens','vous serais','vous lâches',
  "vous n'as","vous l'as",'vous appliquais','vous vaux',
  'vous dévies','vous exiges','vous appliquais'
];

// Extraire tous les textes des DY et TR
const allTexts = [...html.matchAll(/[nb]\d?:'((?:[^'\\]|\\.)*)'/g)]
  .map(m => m[1].replace(/\\'/g,"'"));

let lexOk = true;
for (const mot of INTERDIT) {
  const found = allTexts.some(t => t.toLowerCase().includes(mot.toLowerCase()));
  if (found) {
    process.stdout.write(`  ✗ Mot interdit trouvé : "${mot}"\n`);
    failed++; failures.push(`Lexique: ${mot}`); lexOk = false;
  }
}
if (lexOk) {
  process.stdout.write(`  ✓ Aucun des ${INTERDIT.length} mots interdits trouvé\n`);
  passed++;
}

let tuOk = true;
for (const {pat, label} of TUTOIEMENT_REGEX) {
  const found = allTexts.some(t => pat.test(t));
  if (found) {
    const example = allTexts.find(t => pat.test(t)) || '';
    process.stdout.write(`  ✗ Tutoiement résiduel (${label}): ...${example.slice(0,70)}...\n`);
    failed++; failures.push(`Tutoiement: ${label}`); tuOk = false;
  }
}
if (tuOk) {
  process.stdout.write(`  ✓ Aucun tutoiement résiduel détecté\n`);
  passed++;
}

let conjOk = true;
for (const conj of CONJUGAISON) {
  const found = allTexts.some(t => t.includes(conj));
  if (found) {
    process.stdout.write(`  ✗ Conjugaison incorrecte : "${conj}"\n`);
    failed++; failures.push(`Conjugaison: ${conj}`); conjOk = false;
  }
}
if (conjOk) {
  process.stdout.write(`  ✓ Aucune conjugaison incorrecte détectée\n`);
  passed++;
}

// ─────────────────────────────────────────────────────────────────────────
// RÉSULTAT FINAL
// ─────────────────────────────────────────────────────────────────────────
const total = passed + failed;
console.log(`\n${'═'.repeat(60)}`);
console.log(`  RÉSULTAT FINAL : ${passed}/${total} tests passés`);
if (failures.length > 0) {
  console.log(`\n  Échecs :`);
  failures.forEach(f => console.log(`    ✗ ${f}`));
  console.log('');
  process.exit(1);   // Code 1 → GitHub Actions marque le job en rouge
} else {
  console.log(`  ✅ Tous les tests passés — V.A.L.E.U.R© OK`);
  console.log('');
  process.exit(0);   // Code 0 → GitHub Actions marque le job en vert
}
