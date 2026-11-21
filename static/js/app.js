/* Interface behaviour shared by every page: dropdowns, toasts, the bell panel and the search
   palette. The palette reads one small index (dashboard:search_index) once and filters it in
   the browser, so it also works in the static demo. */
  // One dropdown for every list: the native select stays in the form (hidden) and is driven
  // by a button and a listbox in the site's own style. Keyboard: Enter/Space, arrows, Esc.
  (function () {
    const chev = '<svg class="icon chev" aria-hidden="true"><use href="#i-chev"/></svg>';
    document.querySelectorAll("select.input").forEach((select, n) => {
      const box = document.createElement("div");
      box.className = "dd";
      select.parentNode.insertBefore(box, select);
      box.appendChild(select);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "input dd-btn";
      button.setAttribute("aria-haspopup", "listbox");
      button.setAttribute("aria-expanded", "false");
      if (select.getAttribute("aria-label")) button.setAttribute("aria-label", select.getAttribute("aria-label"));
      if (select.id) { button.id = select.id; select.removeAttribute("id"); }
      const list = document.createElement("ul");
      list.className = "dd-list";
      list.setAttribute("role", "listbox");
      list.id = "dd-list-" + n;
      button.setAttribute("aria-controls", list.id);
      [...select.options].forEach((option, i) => {
        const item = document.createElement("li");
        item.setAttribute("role", "option");
        item.textContent = option.textContent;
        item.dataset.index = i;
        list.appendChild(item);
      });
      box.append(button, list);
      let active = select.selectedIndex;
      const items = [...list.children];
      button.innerHTML = "<span></span>" + chev;  // built once: re-rendering inside a click detached its target
      const label = button.firstChild;
      function render() {
        label.textContent = select.options[select.selectedIndex]?.textContent || "";
        items.forEach((item, i) => {
          item.setAttribute("aria-selected", String(i === select.selectedIndex));
          item.toggleAttribute("data-active", i === active);
        });
      }
      function open(state) {
        box.toggleAttribute("data-open", state);
        button.setAttribute("aria-expanded", String(state));
        if (state) { active = select.selectedIndex; render(); items[active]?.scrollIntoView({ block: "nearest" }); }
      }
      function choose(i) {
        select.selectedIndex = i;
        select.dispatchEvent(new Event("change", { bubbles: true }));
        open(false); render(); button.focus();
      }
      button.addEventListener("click", () => open(!box.hasAttribute("data-open")));
      list.addEventListener("click", (event) => { const item = event.target.closest("li"); if (item) choose(Number(item.dataset.index)); });
      button.addEventListener("keydown", (event) => {
        const isOpen = box.hasAttribute("data-open");
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          if (!isOpen) return open(true);
          active = Math.max(0, Math.min(items.length - 1, active + (event.key === "ArrowDown" ? 1 : -1)));
          render(); items[active].scrollIntoView({ block: "nearest" });
        } else if ((event.key === "Enter" || event.key === " ") && isOpen) { event.preventDefault(); choose(active); }
        else if (event.key === "Escape" && isOpen) { event.preventDefault(); open(false); }
      });
      document.addEventListener("click", (event) => { if (event.target.isConnected && !box.contains(event.target)) open(false); });
      render();
    });
  })();

(function () {
  const box = document.querySelector("[data-toasts]");
  if (!box) return;
  const hide = () => box.setAttribute("data-hidden", "");
  box.addEventListener("click", (event) => { if (event.target.closest("[data-close]")) hide(); });
  setTimeout(hide, 7000);
})();

(function () {
  const bell = document.querySelector("[data-bell]");
  const panel = document.querySelector("[data-notif]");
  if (!bell || !panel) return;
  const set = (on) => { panel.toggleAttribute("data-open", on); bell.setAttribute("aria-expanded", String(on)); };
  bell.addEventListener("click", (event) => { event.stopPropagation(); set(!panel.hasAttribute("data-open")); });
  document.addEventListener("click", (event) => { if (!panel.contains(event.target)) set(false); });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") set(false); });
})();

(function () {
  const palette = document.querySelector("[data-palette]");
  if (!palette) return;
  const scrim = document.querySelector("[data-scrim]");
  const input = palette.querySelector("input");
  const body = palette.querySelector("[data-results]");
  const tabs = [...palette.querySelectorAll("[data-tab]")];
  let index = null, tab = "all", active = 0;
  const GROUPS = { object: "объекты", document: "документы", event: "события" };
  const esc = (text) => String(text).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  async function load() {
    if (index) return index;
    const response = await fetch(palette.dataset.index, { credentials: "same-origin" });
    index = response.ok ? await response.json() : { items: [], actions: [] };
    return index;
  }
  function render() {
    const query = input.value.trim().toLowerCase();
    const words = query.split(/\s+/).filter(Boolean);
    const items = index.items.filter((item) => (tab === "all" || item.group === tab) && words.every((word) => item.search.includes(word)));
    let html = "", n = 0;
    for (const group of Object.keys(GROUPS)) {
      const part = items.filter((item) => item.group === group).slice(0, query ? 8 : 4);
      if (!part.length) continue;
      html += `<div class="palette-group">${GROUPS[group]}</div>`;
      for (const item of part) html += `<a class="palette-item" href="${esc(item.url)}" data-i="${n++}"><span>${esc(item.title)}</span><small>${esc(item.note || "открыть")}</small></a>`;
    }
    if (!query && tab === "all" && index.actions.length) {
      html += `<div class="palette-group">предложения</div>`;
      for (const action of index.actions) html += `<a class="palette-item" href="${esc(action.url)}" data-i="${n++}"><span>+&nbsp; ${esc(action.title)}</span><small></small></a>`;
    }
    body.innerHTML = html || `<div class="palette-group">ничего не найдено</div>`;
    active = 0; mark();
  }
  function mark() { body.querySelectorAll("[data-i]").forEach((el) => el.toggleAttribute("data-active", Number(el.dataset.i) === active)); }
  async function open() {
    palette.setAttribute("data-open", ""); scrim.setAttribute("data-open", "");
    input.focus(); await load(); render();
  }
  function close() { palette.removeAttribute("data-open"); scrim.removeAttribute("data-open"); }
  document.querySelectorAll("[data-search-open]").forEach((el) => el.addEventListener("click", open));
  scrim.addEventListener("click", close);
  input.addEventListener("input", () => index && render());
  tabs.forEach((button) => button.addEventListener("click", () => {
    tab = button.dataset.tab;
    tabs.forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
    render(); input.focus();
  }));
  document.addEventListener("keydown", (event) => {
    const isOpen = palette.hasAttribute("data-open");
    if ((event.key === "k" && (event.metaKey || event.ctrlKey)) || (event.key === "/" && !isOpen && !/input|textarea|select/i.test(document.activeElement.tagName))) { event.preventDefault(); open(); return; }
    if (!isOpen) return;
    const links = body.querySelectorAll("[data-i]");
    if (event.key === "Escape") close();
    else if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); active = Math.max(0, Math.min(links.length - 1, active + (event.key === "ArrowDown" ? 1 : -1))); mark(); links[active]?.scrollIntoView({ block: "nearest" }); }
    else if (event.key === "Enter" && links[active]) { event.preventDefault(); location.href = links[active].href; }
  });
})();
