/* Charts of the interface system, drawn as SVG from JSON the page carries:
   <div class="chart" data-chart="bars" data-src="id-of-json-script"></div>.
   Kinds: funnel, polar, bars, line. Axis labels stay in place; hovering shows the value. */
(function () {
  const NS = "http://www.w3.org/2000/svg";
  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const el = (tag, attrs = {}, parent) => {
    const node = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    if (parent) parent.appendChild(node);
    return node;
  };
  const svgOf = (box, w, h) => { box.querySelector("svg")?.remove(); return el("svg", { viewBox: `0 0 ${w} ${h}`, preserveAspectRatio: "none" }, box); };
  function tip(box) {
    let t = box.querySelector(".chart-tip");
    if (!t) { t = document.createElement("div"); t.className = "chart-tip"; box.appendChild(t); }
    return t;
  }
  function show(box, x, y, text) { const t = tip(box); t.textContent = text; t.style.left = x + "px"; t.style.top = y + "px"; t.setAttribute("data-on", ""); }
  function hide(box) { tip(box).removeAttribute("data-on"); }

  /* funnel: stages narrowing left to right, a gradient blue → violet → green */
  function funnel(box, data) {
    const w = box.clientWidth, h = box.clientHeight || 160;
    const svg = svgOf(box, w, h);
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    const defs = el("defs", {}, svg);
    const g = el("linearGradient", { id: "fg", x1: 0, x2: 1 }, defs);
    [["0", "#1b6bf5"], ["0.45", "#6a3df0"], ["0.75", "#18b6d6"], ["1", "#1ec95f"]].forEach(([o, c]) => el("stop", { offset: o, "stop-color": c }, g));
    const max = Math.max(...data.map((d) => d.value), 1);
    const n = data.length, step = w / n, mid = h / 2, top = h * 0.46;
    const half = (v) => Math.max(top * Math.sqrt(v / max), 10);
    let d = `M0 ${mid - half(data[0].value)}`;
    data.forEach((s, i) => {
      const x0 = i * step, x1 = (i + 1) * step, a = half(s.value), b = half((data[i + 1] || s).value);
      d += ` L${x0} ${mid - a} C${x0 + step * 0.55} ${mid - a} ${x1 - step * 0.45} ${mid - b} ${x1} ${mid - b}`;
    });
    for (let i = n - 1; i >= 0; i--) {
      const x0 = i * step, x1 = (i + 1) * step, a = half(data[i].value), b = half((data[i + 1] || data[i]).value);
      d += ` L${x1} ${mid + b} C${x1 - step * 0.45} ${mid + b} ${x0 + step * 0.55} ${mid + a} ${x0} ${mid + a}`;
    }
    el("path", { d: d + "Z", fill: "url(#fg)" }, svg);
    data.forEach((s, i) => {
      if (i) el("line", { x1: i * step, x2: i * step, y1: mid - top, y2: mid + top, stroke: "#fff", "stroke-opacity": 0.7, "stroke-width": 2 }, svg);
      const t = el("text", { x: i * step + step / 2, y: mid + 8, "text-anchor": "middle", fill: "#fff", "fill-opacity": 0.85, "font-size": 22 }, svg);
      t.textContent = s.value;
    });
  }

  /* polar: one sector per category, radius by value, soft category colours */
  function polar(box, data) {
    const size = Math.min(box.clientWidth, box.clientHeight || 240);
    const svg = svgOf(box, size, size);
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    const c = size / 2, R = size / 2 - 6;
    el("circle", { cx: c, cy: c, r: R, fill: "#fff", style: "filter: drop-shadow(0 10px 22px rgba(34,43,51,.12))" }, svg);
    const total = data.reduce((s, d) => s + d.value, 0) || 1;
    const max = Math.max(...data.map((d) => d.value), 1);
    let angle = -Math.PI / 2;
    data.forEach((d) => {
      const sweep = (d.value / total) * Math.PI * 2;
      if (!d.value) return;
      const r = R * (0.55 + 0.4 * d.value / max);
      const a0 = angle + 0.025, a1 = angle + sweep - 0.025;
      const p = (a, rr) => `${c + rr * Math.cos(a)} ${c + rr * Math.sin(a)}`;
      const path = el("path", { d: `M${c} ${c} L${p(a0, r)} A${r} ${r} 0 ${sweep > Math.PI ? 1 : 0} 1 ${p(a1, r)} Z`, fill: d.color }, svg);
      path.addEventListener("mousemove", (e) => { const b = box.getBoundingClientRect(); show(box, e.clientX - b.left, e.clientY - b.top, `${d.label}: ${d.value}`); });
      path.addEventListener("mouseleave", () => hide(box));
      angle += sweep;
    });
    [0.25, 0.42].forEach((k) => el("circle", { cx: c, cy: c, r: R * k, fill: "none", stroke: "#fff", "stroke-opacity": 0.55 }, svg));
  }

  /* bars: rounded columns with a light → strong blue gradient, the strongest one darker */
  function bars(box, data) {
    const w = box.clientWidth, h = box.clientHeight || 260, axis = 36, base = 22;
    const svg = svgOf(box, w, h);
    const defs = el("defs", {}, svg);
    const lg = el("linearGradient", { id: "bg", x1: 0, x2: 0, y1: 0, y2: 1 }, defs);
    el("stop", { offset: 0, "stop-color": "#8fbbe8" }, lg); el("stop", { offset: 1, "stop-color": "#cfe3f8" }, lg);
    const lgs = el("linearGradient", { id: "bgs", x1: 0, x2: 0, y1: 0, y2: 1 }, defs);
    el("stop", { offset: 0, "stop-color": "#1b6fd8" }, lgs); el("stop", { offset: 1, "stop-color": "#7fb2f0" }, lgs);
    const max = Math.max(...data.map((d) => d.value), 1);
    const nice = Math.ceil(max / 5) * 5 || 5;
    const plotW = w - axis, plotH = h - base - 8;
    for (let i = 0; i <= 5; i++) {
      const y = 8 + plotH - (plotH * i) / 5;
      el("line", { x1: 0, x2: plotW, y1: y, y2: y, class: "grid-line" }, svg);
      const t = el("text", { x: w - 4, y: y + 4, "text-anchor": "end", class: "axis" }, svg); t.textContent = Math.round((nice * i) / 5);
    }
    const slot = plotW / data.length, bw = Math.min(64, slot * 0.6);
    const strongest = data.reduce((m, d, i) => (d.value > data[m].value ? i : m), 0);
    data.forEach((d, i) => {
      const bh = (plotH * d.value) / nice, x = i * slot + (slot - bw) / 2, y = 8 + plotH - bh;
      const r = Math.min(10, bw / 2, bh);
      const bar = el("path", { d: `M${x} ${y + bh} V${y + r} Q${x} ${y} ${x + r} ${y} H${x + bw - r} Q${x + bw} ${y} ${x + bw} ${y + r} V${y + bh} Z`, fill: i === strongest ? "url(#bgs)" : "url(#bg)" }, svg);
      const label = el("text", { x: x + bw / 2, y: h - 4, "text-anchor": "middle", class: "axis" }, svg); label.textContent = d.label;
      bar.addEventListener("mouseenter", () => { const sx = box.clientWidth / w; show(box, (x + bw / 2) * sx, y * (box.clientHeight / h), `${d.value} ${d.unit || ""}`.trim()); });
      bar.addEventListener("mouseleave", () => hide(box));
      if (d.url) { bar.style.cursor = "pointer"; bar.addEventListener("click", () => (location.href = d.url)); }
    });
  }

  function draw() {
    document.querySelectorAll("[data-chart]").forEach((box) => {
      const data = JSON.parse(document.getElementById(box.dataset.src).textContent);
      ({ funnel, polar, bars }[box.dataset.chart])(box, data);
    });
  }
  const ready = document.fonts ? document.fonts.ready : Promise.resolve();
  ready.then(draw);
  let pending;
  window.addEventListener("resize", () => { cancelAnimationFrame(pending); pending = requestAnimationFrame(draw); });
})();
