/* Граф карточки объекта: линии между узлами одного этапа и следующего.
   Узел с data-from="группа" соединяется с каждым узлом data-node="группа" ломаной линией:
   вправо от источника, по вертикали в середине промежутка между колонками, вправо к цели.
   Линии в один промежуток сходятся в один ствол. На узких экранах SVG скрыт, узлы идут лентой. */
(function () {
  const box = document.querySelector("[data-graph]");
  if (!box) return;
  const svg = box.querySelector(".graph-lines");
  const NS = "http://www.w3.org/2000/svg";
  function draw() {
    svg.replaceChildren();
    if (getComputedStyle(svg).display === "none") return;
    const origin = box.getBoundingClientRect();
    const rect = (el) => {
      const r = el.getBoundingClientRect();
      return { l: r.left - origin.left, r: r.right - origin.left, y: r.top - origin.top + r.height / 2 };
    };
    const dots = new Set();
    box.querySelectorAll("[data-from]").forEach((target) => {
      const t = rect(target);
      const sources = [...box.querySelectorAll(`[data-node="${target.dataset.from}"]`)];
      if (!sources.length) return;
      const right = Math.max(...sources.map((el) => rect(el).r));
      const mid = Math.round((right + t.l) / 2) + 0.5;
      sources.forEach((source) => {
        const s = rect(source);
        const path = document.createElementNS(NS, "path");
        path.setAttribute("d", `M${s.r} ${Math.round(s.y) + 0.5}H${mid}V${Math.round(t.y) + 0.5}H${t.l}`);
        svg.appendChild(path);
        dots.add(source);
      });
    });
    dots.forEach((source) => {
      const s = rect(source);
      const dot = document.createElementNS(NS, "circle");
      dot.setAttribute("cx", s.r + 8);
      dot.setAttribute("cy", Math.round(s.y) + 0.5);
      dot.setAttribute("r", 4);
      svg.appendChild(dot);
    });
  }
  draw();
  new ResizeObserver(draw).observe(box);
  document.fonts?.ready.then(draw);
})();

(function () {
  const input = document.getElementById("doc-file");
  if (input) input.addEventListener("change", () => {
    document.getElementById("doc-file-name").textContent = input.files[0] ? input.files[0].name : "Файл не выбран";
  });
})();
