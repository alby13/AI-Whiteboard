/* Hand-drawn icon library for the AI whiteboard, plus a small SVG path parser.
 *
 * Icons live in a 100x100 box. Each part is [svgPath, fill, stroke, widthMul, dashed]:
 *   fill/stroke: null (none), 'c' (the icon's main colour, overridable with "color"),
 *   'c2' (second colour), 'ink' (marker outline), or a name from WB.ICON_FILL.
 *   stroke defaults to 'ink' when left out.
 */
(function () {
  'use strict';
  const WB = (window.WB = window.WB || {});

  // ---------------------------------------------------------------- SVG path parser
  // Returns [{pts: [[x, y], ...], closed}] with curves and arcs sampled to points.
  function parseSvgPath(d) {
    const toks = String(d).match(/[MmLlHhVvCcSsQqTtAaZz]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) || [];
    const subs = [];
    let i = 0, cmd = null, x = 0, y = 0, sx = 0, sy = 0, cur = null;
    let lastC = null, lastQ = null, prevCmd = '';
    const isCmd = (t) => /^[A-Za-z]$/.test(t);
    const n = () => (i < toks.length && !isCmd(toks[i]) ? +toks[i++] : NaN);
    const start = (px, py) => {
      cur = { pts: [[px, py]], closed: false };
      subs.push(cur);
    };
    const add = (pts) => {
      if (!cur) start(x, y);
      for (const p of pts) cur.pts.push(p);
    };
    const steps = (len) => Math.max(4, Math.min(48, Math.ceil(len / 3)));
    while (i < toks.length) {
      if (isCmd(toks[i])) cmd = toks[i++];
      else if (!cmd) {
        i++;
        continue;
      }
      const rel = cmd === cmd.toLowerCase();
      const C = cmd.toUpperCase();
      const ox = rel ? x : 0, oy = rel ? y : 0;
      if (C === 'Z') {
        if (cur) cur.closed = true;
        x = sx;
        y = sy;
        cur = null;
        prevCmd = 'Z';
        lastC = lastQ = null;
        continue;
      }
      const before = i;
      if (C === 'M') {
        const px = n() + ox, py = n() + oy;
        if (isNaN(px) || isNaN(py)) break;
        x = sx = px;
        y = sy = py;
        start(x, y);
        cmd = rel ? 'l' : 'L';
        lastC = lastQ = null;
      } else if (C === 'L') {
        const px = n() + ox, py = n() + oy;
        if (isNaN(px) || isNaN(py)) break;
        add([[px, py]]);
        x = px;
        y = py;
        lastC = lastQ = null;
      } else if (C === 'H') {
        const px = n() + ox;
        if (isNaN(px)) break;
        add([[px, y]]);
        x = px;
        lastC = lastQ = null;
      } else if (C === 'V') {
        const py = n() + oy;
        if (isNaN(py)) break;
        add([[x, py]]);
        y = py;
        lastC = lastQ = null;
      } else if (C === 'C' || C === 'S') {
        let c1;
        if (C === 'C') c1 = [n() + ox, n() + oy];
        else c1 = lastC && /[CS]/i.test(prevCmd) ? [2 * x - lastC[0], 2 * y - lastC[1]] : [x, y];
        const c2 = [n() + ox, n() + oy], p = [n() + ox, n() + oy];
        if ([c1[0], c1[1], c2[0], c2[1], p[0], p[1]].some(isNaN)) break;
        const len = Math.hypot(c1[0] - x, c1[1] - y) + Math.hypot(c2[0] - c1[0], c2[1] - c1[1]) + Math.hypot(p[0] - c2[0], p[1] - c2[1]);
        add(WB.cubicPts([x, y], c1, c2, p, steps(len)).slice(1));
        lastC = c2;
        lastQ = null;
        x = p[0];
        y = p[1];
      } else if (C === 'Q' || C === 'T') {
        let q;
        if (C === 'Q') q = [n() + ox, n() + oy];
        else q = lastQ && /[QT]/i.test(prevCmd) ? [2 * x - lastQ[0], 2 * y - lastQ[1]] : [x, y];
        const p = [n() + ox, n() + oy];
        if ([q[0], q[1], p[0], p[1]].some(isNaN)) break;
        const len = Math.hypot(q[0] - x, q[1] - y) + Math.hypot(p[0] - q[0], p[1] - q[1]);
        add(WB.quadPts([x, y], q, p, steps(len)).slice(1));
        lastQ = q;
        lastC = null;
        x = p[0];
        y = p[1];
      } else if (C === 'A') {
        const rx = n(), ry = n(), rot = n(), fa = n(), fs = n();
        const px = n() + ox, py = n() + oy;
        if ([rx, ry, rot, fa, fs, px, py].some(isNaN)) break;
        add(arcPts(x, y, rx, ry, rot, fa, fs, px, py));
        x = px;
        y = py;
        lastC = lastQ = null;
      } else {
        i++;
      }
      prevCmd = cmd;
      if (i === before) i++; // never loop forever on bad input
    }
    return subs.filter((s) => s.pts.length);
  }
  function arcPts(x1, y1, rx, ry, phiDeg, fa, fs, x2, y2) {
    if (!rx || !ry) return [[x2, y2]];
    const phi = (phiDeg * Math.PI) / 180, cs = Math.cos(phi), sn = Math.sin(phi);
    const dx = (x1 - x2) / 2, dy = (y1 - y2) / 2;
    const x1p = cs * dx + sn * dy, y1p = -sn * dx + cs * dy;
    rx = Math.abs(rx);
    ry = Math.abs(ry);
    const lam = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
    if (lam > 1) {
      rx *= Math.sqrt(lam);
      ry *= Math.sqrt(lam);
    }
    const num = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
    const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
    let coef = den ? Math.sqrt(Math.max(0, num / den)) : 0;
    if (!!fa === !!fs) coef = -coef;
    const cxp = (coef * rx * y1p) / ry, cyp = (-coef * ry * x1p) / rx;
    const cx = cs * cxp - sn * cyp + (x1 + x2) / 2, cy = sn * cxp + cs * cyp + (y1 + y2) / 2;
    const ang = (ux, uy, vx, vy) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
    const t1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
    let dt = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
    if (!fs && dt > 0) dt -= Math.PI * 2;
    else if (fs && dt < 0) dt += Math.PI * 2;
    const steps = Math.max(4, Math.min(64, Math.ceil((Math.abs(dt) * Math.max(rx, ry)) / 3)));
    const out = [];
    for (let k = 1; k <= steps; k++) {
      const t = t1 + (dt * k) / steps;
      out.push([cx + cs * rx * Math.cos(t) - sn * ry * Math.sin(t), cy + sn * rx * Math.cos(t) + cs * ry * Math.sin(t)]);
    }
    return out;
  }

  // ---------------------------------------------------------------- helpers for generated icons
  const f = (v) => Math.round(v * 10) / 10;
  function circle(cx, cy, r) {
    return `M${f(cx - r)} ${f(cy)} A${r} ${r} 0 1 0 ${f(cx + r)} ${f(cy)} A${r} ${r} 0 1 0 ${f(cx - r)} ${f(cy)} Z`;
  }
  function ellipse(cx, cy, rx, ry) {
    return `M${f(cx - rx)} ${f(cy)} A${rx} ${ry} 0 1 0 ${f(cx + rx)} ${f(cy)} A${rx} ${ry} 0 1 0 ${f(cx - rx)} ${f(cy)} Z`;
  }
  function rect(x, y, w, h, r) {
    if (!r) return `M${x} ${y} H${x + w} V${y + h} H${x} Z`;
    return `M${x + r} ${y} H${x + w - r} Q${x + w} ${y} ${x + w} ${y + r} V${y + h - r} Q${x + w} ${y + h} ${x + w - r} ${y + h} H${x + r} Q${x} ${y + h} ${x} ${y + h - r} V${y + r} Q${x} ${y} ${x + r} ${y} Z`;
  }
  function star(cx, cy, ro, ri, n) {
    let d = '';
    for (let i = 0; i < n * 2; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / n;
      const r = i % 2 ? ri : ro;
      d += (i ? 'L' : 'M') + f(cx + Math.cos(a) * r) + ' ' + f(cy + Math.sin(a) * r) + ' ';
    }
    return d + 'Z';
  }
  function gear(cx, cy, ro, ri, teeth) {
    let d = '';
    const n = teeth * 4;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = i % 4 < 2 ? ro : ri;
      d += (i ? 'L' : 'M') + f(cx + Math.cos(a) * r) + ' ' + f(cy + Math.sin(a) * r) + ' ';
    }
    return d + 'Z';
  }
  function rays(cx, cy, r1, r2, n, a0) {
    let d = '';
    for (let i = 0; i < n; i++) {
      const a = (a0 || 0) + (i / n) * Math.PI * 2;
      d += `M${f(cx + Math.cos(a) * r1)} ${f(cy + Math.sin(a) * r1)} L${f(cx + Math.cos(a) * r2)} ${f(cy + Math.sin(a) * r2)} `;
    }
    return d;
  }
  function person(cx, top, s, fill) {
    const hr = 13 * s;
    return [
      [`M${f(cx - 26 * s)} ${f(top + 78 * s)} C${f(cx - 26 * s)} ${f(top + 50 * s)} ${f(cx - 14 * s)} ${f(top + 38 * s)} ${f(cx)} ${f(top + 38 * s)} C${f(cx + 14 * s)} ${f(top + 38 * s)} ${f(cx + 26 * s)} ${f(top + 50 * s)} ${f(cx + 26 * s)} ${f(top + 78 * s)} Z`, fill],
      [circle(cx, top + hr + 4 * s, hr), 'skin'],
    ];
  }

  // ---------------------------------------------------------------- the icons
  const ICONS = {
  lightbulb: { color: 'yellow', parts: [
    ['M50 14 C31 14 21 28 21 42 C21 54 29 60 35 68 L36 74 L64 74 L65 68 C71 60 79 54 79 42 C79 28 69 14 50 14 Z', 'c'],
    ['M44 70 L44 56 M56 70 L56 56 M44 56 C44 48 56 48 56 56', null, 'orange', 0.8],
    ['M36 74 L64 74 L62 88 Q50 95 38 88 Z', 'gray'],
    ['M38 80 L62 80 M39 85 L61 85', null, 'ink', 0.7],
    ['M50 2 L50 8 M17 10 L22 15 M83 10 L78 15 M6 38 L12 38 M88 38 L94 38', null, 'orange', 1.2],
  ] },
  check: { color: 'green', parts: [['M12 54 L38 80 L90 18', null, 'c', 3.2]] },
  cross: { color: 'red', parts: [['M18 18 L82 82 M82 18 L18 82', null, 'c', 3.2]] },
  star: { color: 'yellow', parts: [[star(50, 54, 46, 20, 5), 'c']] },
  heart: { color: 'red', parts: [['M50 88 C22 68 8 52 8 33 C8 18 19 10 30 10 C40 10 46 16 50 25 C54 16 60 10 70 10 C81 10 92 18 92 33 C92 52 78 68 50 88 Z', 'c'], ['M24 30 C24 24 28 20 33 20', null, 'white', 1.2]] },
  rocket: { color: 'red', parts: [
    ['M50 6 C65 18 71 38 68 64 L32 64 C29 38 35 18 50 6 Z', 'white'],
    ['M50 6 C57 11 61 16 64 23 L36 23 C39 16 43 11 50 6 Z', 'c'],
    [circle(50, 38, 9), 'lightblue'],
    ['M33 46 L17 64 L19 78 L33 66 Z', 'c'],
    ['M67 46 L83 64 L81 78 L67 66 Z', 'c'],
    ['M38 64 L62 64 L58 72 L42 72 Z', 'gray'],
    ['M42 72 Q50 100 58 72 Q50 80 42 72 Z', 'orange'],
    ['M46 74 Q50 88 54 74 Z', 'yellow', null],
  ] },
  target: { color: 'red', parts: [
    [circle(46, 54, 40), 'c'], [circle(46, 54, 30), 'white'], [circle(46, 54, 20), 'c'], [circle(46, 54, 9), 'white'],
    ['M46 54 L86 14', null, 'ink', 1.4],
    ['M86 14 L80 5 L78 16 Z M86 14 L95 20 L84 22 Z', 'orange'],
  ] },
  calendar: { color: 'red', parts: [
    [rect(10, 20, 80, 70, 6), 'white'],
    ['M10 26 Q10 20 16 20 L84 20 Q90 20 90 26 L90 38 L10 38 Z', 'c'],
    ['M28 12 L28 28 M50 12 L50 28 M72 12 L72 28', null, 'ink', 1.6],
    [rect(20, 46, 12, 10) + rect(44, 46, 12, 10) + rect(68, 46, 12, 10) + rect(20, 66, 12, 10) + rect(44, 66, 12, 10), null, 'ink', 0.7],
    [rect(68, 66, 12, 10), 'c'],
  ] },
  clipboard: { color: 'tan', parts: [
    [rect(18, 12, 64, 84, 6), 'c'],
    [rect(26, 22, 48, 66, 2), 'white'],
    [rect(36, 6, 28, 14, 4), 'gray'],
    ['M34 38 L66 38 M34 50 L66 50 M34 62 L66 62 M34 74 L56 74', null, 'gray', 0.9],
    ['M30 37 L32 40 L36 34', null, 'green', 1],
  ] },
  clock: { color: 'white', parts: [
    [circle(50, 50, 42), 'c'], [circle(50, 50, 42), null, 'ink', 1.2],
    ['M50 14 L50 20 M86 50 L80 50 M50 86 L50 80 M14 50 L20 50', null, 'ink', 0.9],
    ['M50 50 L50 26 M50 50 L67 60', null, 'ink', 1.4],
    [circle(50, 50, 4), 'red'],
  ] },
  gear: { color: 'gray', parts: [[gear(50, 50, 44, 34, 9) + ' ' + circle(50, 50, 14), 'c']] },
  cloud: { color: 'lightblue', parts: [['M26 74 C12 74 6 64 8 55 C10 45 20 41 29 43 C31 28 43 20 56 22 C68 24 75 33 75 42 C87 41 94 51 92 60 C90 70 82 74 73 74 Z', 'c']] },
  sun: { color: 'yellow', parts: [[circle(50, 50, 22), 'c'], [rays(50, 50, 30, 44, 10), null, 'orange', 1.4]] },
  moon: { color: 'yellow', parts: [['M64 10 C42 13 25 31 25 53 C25 75 43 91 65 91 C75 91 83 87 89 81 C61 83 45 63 47 44 C48 30 55 18 64 10 Z', 'c']] },
  person: { color: 'blue', parts: person(50, 6, 1.15, 'c') },
  team: { color: 'blue', parts: () => [...person(26, 18, 0.85, 'purple'), ...person(74, 18, 0.85, 'green'), ...person(50, 10, 1.05, 'c')] },
  chat: { color: 'lightblue', parts: [
    ['M14 16 L86 16 Q92 16 92 22 L92 62 Q92 68 86 68 L46 68 L28 84 L31 68 L14 68 Q8 68 8 62 L8 22 Q8 16 14 16 Z', 'c'],
    ['M24 34 L76 34 M24 48 L62 48', null, 'ink', 0.9],
  ] },
  mail: { color: 'white', parts: [[rect(8, 22, 84, 58, 4), 'c'], ['M8 26 L50 58 L92 26', null, 'ink', 1], ['M8 80 L38 50 M92 80 L62 50', null, 'ink', 0.7]] },
  phone: { color: 'darkgray', parts: [[rect(28, 4, 44, 92, 8), 'c'], [rect(33, 14, 34, 64, 2), 'lightblue'], [circle(50, 86, 4), 'white']] },
  house: { color: 'red', parts: [
    [rect(20, 46, 60, 46), 'tan'],
    ['M8 50 L50 12 L92 50 Z', 'c'],
    [rect(42, 64, 16, 28), 'brown'],
    [rect(26, 56, 11, 11) + rect(63, 56, 11, 11), 'lightblue'],
    [rect(66, 18, 9, 18), 'gray'],
  ] },
  flag: { color: 'red', parts: [['M22 6 L22 96', null, 'ink', 1.8], ['M22 12 C40 2 54 22 78 12 L78 50 C54 60 40 40 22 50 Z', 'c']] },
  trophy: { color: 'gold', parts: [
    ['M30 20 C14 20 14 44 34 46 M70 20 C86 20 86 44 66 46', null, 'ink', 1.4],
    ['M28 10 L72 10 L72 32 C72 50 62 60 50 60 C38 60 28 50 28 32 Z', 'c'],
    [rect(44, 60, 12, 14), 'c'],
    [rect(30, 74, 40, 14, 3), 'brown'],
    [star(50, 33, 11, 5, 5), 'white', null],
  ] },
  lock: { color: 'gold', parts: [['M32 46 L32 32 C32 20 40 13 50 13 C60 13 68 20 68 32 L68 46', null, 'darkgray', 2.4], [rect(22, 44, 56, 48, 6), 'c'], [circle(50, 62, 6) + ' M50 66 L50 78', 'darkgray']] },
  key: { color: 'gold', parts: [[circle(28, 50, 18) + ' ' + circle(26, 50, 7), 'c'], ['M44 45 L92 45 L92 55 L84 55 L84 64 L76 64 L76 55 L68 55 L68 62 L60 62 L60 55 L44 55 Z', 'c']] },
  book: { color: 'blue', parts: [
    ['M50 22 C40 14 24 12 8 16 L8 82 C24 78 40 80 50 88 C60 80 76 78 92 82 L92 16 C76 12 60 14 50 22 Z', 'white'],
    ['M50 22 L50 88', null, 'ink', 1],
    ['M16 32 C26 30 36 31 43 35 M16 46 C26 44 36 45 43 49 M57 35 C64 31 74 30 84 32 M57 49 C64 45 74 44 84 46', null, 'c', 0.9],
  ] },
  pencil: { color: 'yellow', parts: [
    ['M22 70 L66 26 L78 38 L34 82 Z', 'c'],
    ['M22 70 L34 82 L12 92 Z', 'tan'],
    ['M15 86 L12 92 L18 89 Z', 'darkgray'],
    ['M66 26 L72 20 C75 17 79 17 82 20 L84 22 C87 25 87 29 84 32 L78 38 Z', 'pink'],
    ['M62 30 L74 42', null, 'gray', 2.2],
  ] },
  laptop: { color: 'lightblue', parts: [[rect(18, 16, 64, 46, 4), 'darkgray'], [rect(23, 21, 54, 36), 'c'], ['M6 66 L94 66 L88 80 L12 80 Z', 'gray']] },
  database: { color: 'blue', parts: [
    ['M18 20 L18 80 C18 94 82 94 82 80 L82 20 Z', 'c'],
    [ellipse(50, 20, 32, 11), 'lightblue'],
    ['M18 40 C18 54 82 54 82 40 M18 60 C18 74 82 74 82 60', null, 'ink', 1],
  ] },
  server: { color: 'darkgray', parts: [
    [rect(14, 10, 72, 24, 4) + rect(14, 38, 72, 24, 4) + rect(14, 66, 72, 24, 4), 'c'],
    [circle(26, 22, 3.5) + circle(26, 50, 3.5) + circle(26, 78, 3.5), 'green', null],
    ['M50 22 L74 22 M50 50 L74 50 M50 78 L74 78', null, 'lightgray', 1],
  ] },
  globe: { color: 'lightblue', parts: [
    [circle(50, 50, 42), 'c'],
    ['M30 26 C38 30 36 40 44 42 C52 44 50 56 42 58 C34 60 30 52 24 56 L16 52 C14 40 20 30 30 26 Z M62 18 C70 22 80 30 84 42 C76 46 70 40 64 46 C58 50 64 60 58 64 C54 56 50 46 56 36 C58 30 56 24 62 18 Z', 'green'],
    [ellipse(50, 50, 18, 42), null, 'ink', 0.7], ['M8 50 L92 50', null, 'ink', 0.7],
  ] },
  search: { color: 'lightblue', parts: [[circle(41, 41, 27), 'c'], ['M61 61 L88 88', null, 'darkgray', 3.6], ['M29 32 C31 26 36 22 42 22', null, 'white', 1.3]] },
  chart: { color: 'blue', parts: [
    ['M12 10 L12 88 L92 88', null, 'ink', 1.4],
    [rect(20, 58, 13, 30), 'orange'], [rect(39, 42, 13, 46), 'green'], [rect(58, 50, 13, 38), 'red'], [rect(77, 24, 13, 64), 'c'],
  ] },
  money: { color: 'green', parts: [
    [circle(50, 50, 42), 'c'],
    ['M63 34 C59 28 53 27 47 28 C39 29 35 35 37 41 C39 47 47 48 53 50 C61 52 66 56 64 64 C62 71 54 74 46 72 C40 71 36 68 34 64 M50 18 L50 82', null, 'white', 1.8],
  ] },
  bell: { color: 'gold', parts: [['M50 14 C34 14 26 28 26 44 L26 62 L17 73 L83 73 L74 62 L74 44 C74 28 66 14 50 14 Z', 'c'], [circle(50, 81, 7), 'c'], [circle(50, 10, 4), 'c']] },
  camera: { color: 'darkgray', parts: [['M8 30 L30 30 L37 18 L63 18 L70 30 L92 30 L92 84 L8 84 Z', 'c'], [circle(50, 56, 19), 'gray'], [circle(50, 56, 11), 'lightblue'], [rect(76, 38, 9, 6), 'yellow']] },
  music: { color: 'purple', parts: [['M38 76 L38 24 L82 14 L82 66', null, 'ink', 1.6], ['M38 24 L82 14 L82 26 L38 36 Z', 'ink'], [ellipse(29, 77, 11, 8), 'c'], [ellipse(73, 67, 11, 8), 'c']] },
  coffee: { color: 'brown', parts: [
    ['M68 42 C86 40 86 66 66 66', null, 'ink', 1.6],
    ['M16 34 L72 34 L72 64 C72 78 62 86 44 86 C26 86 16 78 16 64 Z', 'white'],
    ['M18 40 L70 40 L70 46 L18 46 Z', 'c', null],
    ['M32 26 C28 20 36 16 32 8 M46 26 C42 20 50 16 46 8 M60 26 C56 20 64 16 60 8', null, 'gray', 1],
    ['M8 92 L84 92', null, 'ink', 1.2],
  ] },
  gift: { color: 'red', parts: [
    [rect(16, 44, 68, 46), 'c'], [rect(10, 30, 80, 15), 'c'], [rect(44, 30, 12, 60), 'yellow'],
    ['M50 30 C38 10 20 16 30 30 Z M50 30 C62 10 80 16 70 30 Z', 'yellow'],
  ] },
  puzzle: { color: 'green', parts: [['M18 32 L38 32 C35 22 42 15 50 15 C58 15 65 22 62 32 L82 32 L82 52 C90 49 96 55 96 62 C96 69 90 75 82 72 L82 92 L18 92 Z', 'c']] },
  mountain: { color: 'gray', parts: [[circle(78, 22, 10), 'yellow'], ['M4 88 L36 30 L52 56 L64 42 L96 88 Z', 'c'], ['M36 30 L45 46 L40 43 L35 49 L29 43 Z', 'white']] },
  tree: { color: 'green', parts: [[rect(44, 62, 12, 30), 'brown'], ['M50 8 C66 8 76 20 74 32 C86 36 88 52 78 60 C76 70 62 74 50 68 C38 74 24 70 22 60 C12 52 14 36 26 32 C24 20 34 8 50 8 Z', 'c']] },
  apple: { color: 'red', parts: [
    ['M50 30 C40 22 16 24 15 48 C14 72 32 92 44 88 C48 86 52 86 56 88 C68 92 86 72 85 48 C84 24 60 22 50 30 Z', 'c'],
    ['M50 30 C50 22 52 16 56 10', null, 'brown', 1.6],
    ['M54 22 C60 11 72 11 75 15 C69 24 60 25 54 22 Z', 'green'],
    ['M28 44 C29 38 33 35 37 34', null, 'white', 1.2],
  ] },
  dumbbell: { color: 'darkgray', parts: [[rect(28, 45, 44, 10), 'gray'], [rect(12, 28, 12, 44, 3) + rect(76, 28, 12, 44, 3), 'c'], [rect(4, 38, 9, 24, 2) + rect(87, 38, 9, 24, 2), 'c']] },
  warning: { color: 'yellow', parts: [['M50 8 L94 88 L6 88 Z', 'c'], ['M50 36 L50 62', null, 'ink', 2.4], [circle(50, 74, 4), 'ink']] },
  info: { color: 'blue', parts: [[circle(50, 50, 42), 'c'], [circle(50, 28, 5), 'white', null], ['M50 44 L50 76', null, 'white', 3]] },
  question: { color: 'purple', parts: [[circle(50, 50, 42), 'c'], ['M36 38 C36 26 44 20 52 20 C62 20 68 28 66 36 C64 44 52 46 52 58 L52 62', null, 'white', 2.4], [circle(52, 75, 4.5), 'white', null]] },
  robot: { color: 'blue', parts: [
    ['M50 8 L50 18', null, 'ink', 1.2], [circle(50, 8, 4), 'red'],
    [rect(20, 18, 60, 46, 12), 'white'],
    [rect(28, 28, 44, 24, 8), 'navy'],
    [circle(40, 40, 5) + circle(60, 40, 5), 'cyan', null],
    [rect(12, 32, 8, 18, 3) + rect(80, 32, 8, 18, 3), 'c'],
    [rect(30, 68, 40, 26, 8), 'white'],
    [circle(50, 81, 6), 'c'],
  ] },
  brain: { color: 'pink', parts: [
    ['M50 20 C44 12 30 12 26 22 C14 22 10 34 16 42 C8 50 12 64 22 66 C22 78 36 84 44 78 C46 84 54 84 56 78 C64 84 78 78 78 66 C88 64 92 50 84 42 C90 34 86 22 74 22 C70 12 56 12 50 20 Z', 'c'],
    ['M50 20 L50 80 M30 36 C36 32 40 40 36 46 M70 36 C64 32 60 40 64 46 M28 58 C34 54 40 60 36 66 M72 58 C66 54 60 60 64 66', null, 'ink', 0.9],
  ] },
  bug: { color: 'green', parts: [
    ['M28 38 L14 30 M28 54 L10 54 M28 70 L14 80 M72 38 L86 30 M72 54 L90 54 M72 70 L86 80 M42 18 L34 6 M58 18 L66 6', null, 'ink', 1.2],
    [ellipse(50, 58, 24, 32), 'c'], [circle(50, 24, 12), 'darkgray'], ['M50 30 L50 90', null, 'ink', 0.9],
  ] },
  code: { color: 'blue', parts: [['M34 24 L10 50 L34 76 M66 24 L90 50 L66 76', null, 'c', 2.8], ['M58 16 L42 84', null, 'orange', 2.4]] },
  file: { color: 'white', parts: [['M22 6 L62 6 L80 24 L80 94 L22 94 Z', 'c'], ['M62 6 L62 24 L80 24', null, 'ink', 1], ['M32 42 L70 42 M32 56 L70 56 M32 70 L58 70', null, 'gray', 0.9]] },
  folder: { color: 'gold', parts: [['M8 22 L38 22 L46 30 L92 30 L92 84 L8 84 Z', 'c'], ['M8 40 L92 40', null, 'ink', 0.8]] },
  shield: { color: 'blue', parts: [['M50 6 L86 18 L86 46 C86 70 70 86 50 94 C30 86 14 70 14 46 L14 18 Z', 'c'], ['M34 50 L46 62 L68 36', null, 'white', 2.6]] },
  thumbs_up: { color: 'skin', parts: [[rect(10, 44, 18, 46, 3), 'blue'], ['M28 46 L44 20 C46 12 58 12 57 24 L56 38 L80 38 C89 38 92 47 87 53 C92 58 90 66 84 68 C88 73 85 81 78 82 C80 88 75 92 70 92 L36 92 C31 92 28 89 28 84 Z', 'c']] },
  smile: { color: 'yellow', parts: [[circle(50, 50, 42), 'c'], [ellipse(36, 40, 4.5, 7) + ellipse(64, 40, 4.5, 7), 'ink', null], ['M28 58 C36 76 64 76 72 58', null, 'ink', 1.6]] },
  fire: { color: 'orange', parts: [
    ['M50 94 C26 94 15 74 21 55 C25 43 33 37 35 22 C45 30 50 40 48 50 C54 44 58 36 56 22 C72 36 85 54 81 71 C77 85 66 94 50 94 Z', 'c'],
    ['M50 92 C40 92 34 84 36 74 C38 66 46 62 48 54 C56 62 64 70 62 80 C60 88 56 92 50 92 Z', 'yellow'],
  ] },
  lightning: { color: 'yellow', parts: [['M58 4 L20 54 L45 54 L36 96 L80 40 L54 40 L66 4 Z', 'c']] },
  plane: { color: 'lightblue', parts: [['M50 6 C54 6 56 11 56 18 L56 40 L92 60 L92 69 L56 58 L56 78 L67 86 L67 93 L50 88 L33 93 L33 86 L44 78 L44 58 L8 69 L8 60 L44 40 L44 18 C44 11 46 6 50 6 Z', 'c']] },
  car: { color: 'red', parts: [
    ['M6 66 L6 52 L20 47 L33 31 L65 31 L79 47 L94 52 L94 66 Z', 'c'],
    ['M37 36 L48 36 L48 47 L27 47 Z M53 36 L63 36 L73 47 L53 47 Z', 'lightblue'],
    [circle(27, 67, 10) + circle(73, 67, 10), 'darkgray'], [circle(27, 67, 4) + circle(73, 67, 4), 'lightgray', null],
  ] },
  pin: { color: 'red', parts: [['M50 94 C50 94 20 60 20 38 C20 20 34 8 50 8 C66 8 80 20 80 38 C80 60 50 94 50 94 Z', 'c'], [circle(50, 38, 11), 'white']] },
  hourglass: { color: 'tan', parts: [
    ['M28 10 C28 34 46 42 46 50 C46 58 28 66 28 90 L72 90 C72 66 54 58 54 50 C54 42 72 34 72 10 Z', 'lightblue'],
    ['M36 84 C38 72 46 66 50 64 C54 66 62 72 64 84 Z M38 26 L62 26 C58 36 52 42 50 44 C48 42 42 36 38 26 Z', 'gold', null],
    [rect(20, 4, 60, 8, 3) + rect(20, 88, 60, 8, 3), 'brown'],
  ] },
  eye: { color: 'blue', parts: [['M5 50 C22 22 78 22 95 50 C78 78 22 78 5 50 Z', 'white'], [circle(50, 50, 17), 'c'], [circle(50, 50, 7), 'ink', null], [circle(45, 45, 3), 'white', null]] },
  arrow_right: { color: 'blue', parts: [['M8 38 L56 38 L56 18 L92 50 L56 82 L56 62 L8 62 Z', 'c']] },
  arrow_up: { color: 'green', parts: [['M38 92 L38 44 L18 44 L50 8 L82 44 L62 44 L62 92 Z', 'c']] },
  trend: { color: 'blue', parts: [['M6 86 L34 56 L50 70 L80 34', null, 'c', 3], ['M64 30 L90 22 L84 48 Z', 'c']] },
  trend_down: { color: 'red', parts: [['M6 20 L34 50 L50 36 L80 72', null, 'c', 3], ['M64 76 L90 82 L84 56 Z', 'c']] },
  refresh: { color: 'green', parts: [['M80 46 A30 30 0 1 0 70 70', null, 'c', 2.6], ['M80 26 L82 48 L62 46 Z', 'c']] },
  sparkle: { color: 'yellow', parts: [['M50 6 C54 36 64 46 94 50 C64 54 54 64 50 94 C46 64 36 54 6 50 C36 46 46 36 50 6 Z', 'c'], ['M82 8 C83 15 85 17 92 18 C85 19 83 21 82 28 C81 21 79 19 72 18 C79 17 81 15 82 8 Z', 'c']] },
  network: { color: 'blue', parts: [
    ['M50 50 L18 24 M50 50 L82 22 M50 50 L20 80 M50 50 L84 76 M50 50 L50 12 M18 24 L50 12 M82 22 L84 76', null, 'ink', 0.9],
    [circle(50, 50, 10), 'c'], [circle(18, 24, 8), 'red'], [circle(82, 22, 8), 'orange'], [circle(20, 80, 8), 'green'], [circle(84, 76, 8), 'purple'], [circle(50, 12, 7), 'yellow'],
  ] },
  leaf: { color: 'green', parts: [['M12 88 C12 42 44 14 90 10 C88 56 58 88 12 88 Z', 'c'], ['M12 88 C38 62 58 42 78 22', null, 'ink', 0.9]] },
  drop: { color: 'blue', parts: [['M50 6 C50 6 20 46 20 64 C20 80 34 94 50 94 C66 94 80 80 80 64 C80 46 50 6 50 6 Z', 'c'], ['M34 64 C34 72 38 78 44 80', null, 'white', 1.3]] },
  mic: { color: 'gray', parts: [[rect(37, 6, 26, 52, 13), 'c'], ['M26 44 C26 68 74 68 74 44 M50 66 L50 84 M34 86 L66 86', null, 'ink', 1.4], ['M41 20 L59 20 M41 30 L59 30 M41 40 L59 40', null, 'darkgray', 0.8]] },
  website: { color: 'lightblue', parts: [
    [rect(6, 14, 88, 72, 6), 'white'], ['M6 20 Q6 14 12 14 L88 14 Q94 14 94 20 L94 30 L6 30 Z', 'lightgray'],
    [circle(16, 22, 3) , 'red', null], [circle(25, 22, 3), 'yellow', null], [circle(34, 22, 3), 'green', null],
    [rect(14, 38, 34, 26, 2), 'c'], ['M56 40 L86 40 M56 50 L86 50 M56 60 L78 60 M14 74 L86 74', null, 'gray', 0.9],
  ] },
  wrench: { color: 'gray', parts: [['M64 8 C50 6 40 18 43 31 L10 64 C4 70 13 80 19 74 L52 41 C65 45 77 35 75 21 L64 31 L55 29 L53 20 Z', 'c']] },
  graduation: { color: 'navy', parts: [['M24 46 L24 66 C24 76 76 76 76 66 L76 46', 'c'], ['M50 18 L94 36 L50 54 L6 36 Z', 'c'], ['M86 39 L86 64', null, 'gold', 1.6], [circle(86, 66, 4), 'gold']] },
  medal: { color: 'gold', parts: [['M30 6 L44 46 L56 46 L42 6 Z', 'blue'], ['M70 6 L56 46 L44 46 L58 6 Z', 'red'], [circle(50, 66, 26), 'c'], [star(50, 67, 13, 6, 5), 'white', null]] },
  battery: { color: 'green', parts: [[rect(6, 28, 80, 44, 6), 'white'], [rect(86, 40, 8, 20, 2), 'darkgray'], [rect(12, 34, 48, 32, 3), 'c', null]] },
  wifi: { color: 'blue', parts: [['M14 40 C34 20 66 20 86 40 M26 54 C40 40 60 40 74 54 M38 68 C46 60 54 60 62 68', null, 'c', 2.4], [circle(50, 80, 6), 'c']] },
  link: { color: 'gray', parts: [['M44 60 L60 44', null, 'ink', 1.6], [rect(10, 46, 40, 22, 11) , null, 'c', 2.2], [rect(50, 32, 40, 22, 11), null, 'c', 2.2]] },
  pizza: { color: 'gold', parts: [['M50 92 L14 18 C38 6 62 6 86 18 Z', 'c'], ['M14 18 C38 6 62 6 86 18 L82 26 C60 15 40 15 18 26 Z', 'tan'], [circle(42, 40, 6) + circle(58, 56, 6) + circle(48, 70, 5), 'red']] },
  palette: { color: 'tan', parts: [['M50 8 C24 8 6 28 6 50 C6 74 26 92 48 92 C56 92 58 86 54 80 C50 74 54 68 62 68 L74 68 C86 68 94 60 94 48 C94 26 74 8 50 8 Z', 'c'], [circle(30, 40, 7), 'red'], [circle(46, 26, 7), 'yellow'], [circle(66, 28, 7), 'green'], [circle(78, 46, 7), 'blue'], [circle(26, 62, 7), 'purple']] },
  game: { color: 'darkgray', parts: [['M24 30 L76 30 C88 30 96 44 94 62 C92 78 80 80 72 70 L64 62 L36 62 L28 70 C20 80 8 78 6 62 C4 44 12 30 24 30 Z', 'c'], ['M26 40 L26 54 M19 47 L33 47', null, 'white', 1.6], [circle(70, 42, 4.5), 'red', null], [circle(80, 52, 4.5), 'green', null]] },
  film: { color: 'darkgray', parts: [[rect(10, 18, 80, 64, 4), 'c'], [rect(28, 28, 44, 44, 2), 'lightblue'], [rect(15, 24, 7, 7) + rect(15, 40, 7, 7) + rect(15, 56, 7, 7) + rect(15, 70, 7, 7) + rect(78, 24, 7, 7) + rect(78, 40, 7, 7) + rect(78, 56, 7, 7) + rect(78, 70, 7, 7), 'white', null]] },
  hiking: { color: 'green', parts: [[circle(78, 22, 10), 'yellow'], ['M2 88 L30 40 L46 62 L60 46 L98 88 Z', 'c'], ['M30 40 L36 50 L30 48 L24 52 Z', 'white'], ['M10 94 L90 94', null, 'brown', 1.4]] },
  lotus: { color: 'pink', parts: [
    ['M50 18 C60 32 60 52 50 70 C40 52 40 32 50 18 Z', 'c'],
    ['M50 70 C40 56 26 50 12 50 C16 64 30 72 50 70 Z M50 70 C60 56 74 50 88 50 C84 64 70 72 50 70 Z', 'c'],
    ['M50 70 C38 50 30 40 22 34 C22 50 32 64 50 70 Z M50 70 C62 50 70 40 78 34 C78 50 68 64 50 70 Z', 'lightpurple'],
    ['M20 80 C40 74 60 74 80 80', null, 'teal', 1.2],
  ] },
  handshake: { color: 'skin', parts: [['M6 44 L24 30 L42 36 L58 30 L76 30 L94 44 L80 64 L64 76 C58 80 52 80 48 76 L22 62 Z', 'c'], ['M42 36 L30 50 C34 56 42 54 46 48 L56 42 M48 76 L56 64 M58 72 L64 62 M66 68 L72 58', null, 'ink', 0.9], ['M6 44 L2 36 M94 44 L98 36', null, 'blue', 2.4]] },
  idea_bubble: { color: 'white', parts: [['M50 10 C74 10 90 24 90 42 C90 60 74 74 50 74 C44 74 38 73 33 71 L18 84 L22 66 C14 60 10 52 10 42 C10 24 26 10 50 10 Z', 'c'], ['M38 34 C38 26 44 22 50 22 C58 22 62 28 60 34 C58 40 50 40 50 48', null, 'purple', 1.8], [circle(50, 58, 3.5), 'purple']] },
  podcast: { color: 'purple', parts: [[rect(38, 10, 24, 44, 12), 'c'], ['M26 40 C26 64 74 64 74 40 M50 62 L50 82 M36 84 L64 84', null, 'ink', 1.4], ['M14 28 C10 38 10 48 14 58 M86 28 C90 38 90 48 86 58', null, 'c', 1.4]] },
  question_marks: { color: 'green', parts: [['M14 36 C14 22 24 16 32 16 C42 16 48 24 46 32 C44 40 32 42 32 54 L32 58 M54 36 C54 22 64 16 72 16 C82 16 88 24 86 32 C84 40 72 42 72 54 L72 58', null, 'c', 2.6], [circle(32, 72, 5) + circle(72, 72, 5), 'c']] },
  checkbox: { color: 'green', parts: [[rect(10, 10, 80, 80, 8), 'white'], ['M24 50 L42 68 L78 26', null, 'c', 2.8]] },
  };

  const ICON_ALIASES = {
    idea: 'lightbulb', bulb: 'lightbulb', light_bulb: 'lightbulb', tick: 'check', checkmark: 'check', ok: 'check',
    x: 'cross', no: 'cross', love: 'heart', launch: 'rocket', goal: 'target', bullseye: 'target', schedule: 'calendar',
    date: 'calendar', tasks: 'clipboard', todo: 'clipboard', time: 'clock', settings: 'gear', cog: 'gear', weather: 'cloud',
    user: 'person', people: 'team', group: 'team', message: 'chat', comment: 'chat', email: 'mail', home: 'house',
    award: 'trophy', win: 'trophy', security: 'lock', password: 'key', read: 'book', write: 'pencil', edit: 'pencil',
    computer: 'laptop', storage: 'database', db: 'database', world: 'globe', earth: 'globe', internet: 'globe',
    magnifier: 'search', find: 'search', graph: 'chart', stats: 'chart', analytics: 'chart', dollar: 'money', cash: 'money',
    notification: 'bell', alert: 'warning', photo: 'camera', song: 'music', audio: 'music', cup: 'coffee', present: 'gift',
    nature: 'tree', fruit: 'apple', health: 'apple', gym: 'dumbbell', exercise: 'dumbbell', fitness: 'dumbbell',
    help: 'question', bot: 'robot', ai: 'robot', think: 'brain', mind: 'brain', debug: 'bug', programming: 'code',
    document: 'file', doc: 'file', directory: 'folder', protect: 'shield', like: 'thumbs_up', thumbsup: 'thumbs_up',
    happy: 'smile', hot: 'fire', energy: 'lightning', power: 'lightning', flight: 'plane', travel: 'plane',
    location: 'pin', map: 'pin', wait: 'hourglass', view: 'eye', next: 'arrow_right', up: 'arrow_up', growth: 'trend',
    increase: 'trend', decrease: 'trend_down', cycle: 'refresh', repeat: 'refresh', magic: 'sparkle', new: 'sparkle',
    connections: 'network', graph_nodes: 'network', eco: 'leaf', water: 'drop', microphone: 'mic', web: 'website',
    browser: 'website', tool: 'wrench', tools: 'wrench', education: 'graduation', learn: 'graduation', school: 'graduation',
    badge: 'medal', charge: 'battery', signal: 'wifi', url: 'link', chain: 'link', food: 'pizza', art: 'palette',
    paint: 'palette', gaming: 'game', controller: 'game', movie: 'film', video: 'film', hike: 'hiking', relax: 'lotus',
    meditate: 'lotus', yoga: 'lotus', deal: 'handshake', agreement: 'handshake', partnership: 'handshake',
    brainstorm: 'idea_bubble', broadcast: 'podcast', questions: 'question_marks', done: 'checkbox',
  };

  WB.parseSvgPath = parseSvgPath;
  WB.ICONS = ICONS;
  WB.ICON_ALIASES = ICON_ALIASES;
  WB.iconPaths = { circle, ellipse, rect, star, gear, rays };
})();
