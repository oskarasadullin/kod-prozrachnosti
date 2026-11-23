(() => {
  const dialog = document.getElementById("document-upload");
  if (!dialog) return;
  const form = dialog.querySelector("form");
  const picker = form.querySelector("[type=file]");
  const list = form.querySelector("[data-documents]");
  const drop = form.querySelector(".doc-drop");
  const error = form.querySelector('[role="alert"]');
  const submit = form.querySelector("[type=submit]");
  const entries = new Map();
  let busy = false;

  function addFields() {
    const fields = document.getElementById("document-fields").content.firstElementChild.cloneNode(true);
    list.append(fields);
    return fields;
  }
  function refresh() {
    if (!list.children.length) addFields();
    submit.disabled = busy || !entries.size;
  }
  function addFiles(files) {
    if (busy) return;
    error.textContent = "";
    const total = [...entries.values(), ...files];
    if (total.length > 10 || total.reduce((sum, file) => sum + file.size, 0) > 20 * 1024 * 1024) {
      error.textContent = "Можно выбрать до 10 файлов общим размером до 20 МБ.";
      return;
    }
    for (const file of files) {
      if (!file.size || file.size > 5 * 1024 * 1024 || !/\.(pdf|docx|xlsx|jpe?g|png|tiff?)$/i.test(file.name)) {
        error.textContent = file.name + ": допустимы указанные форматы до 5 МБ.";
        return;
      }
    }
    for (const file of files) {
      const fields = entries.size ? addFields() : list.firstElementChild;
      entries.set(fields, file);
      const info = fields.querySelector(".doc-file");
      info.hidden = false;
      info.querySelector("strong").textContent = file.name;
      info.querySelector("small").textContent = (file.size / 1048576).toLocaleString("ru", {maximumFractionDigits: 2}) + " МБ";
      info.querySelector("button").onclick = () => {
        entries.delete(fields);
        fields.remove();
        refresh();
      };
    }
    refresh();
  }
  refresh();
  // one dialog for every page: a card passes its object in data-case, the search palette opens it by #upload
  const caseField = form.querySelector('[name="case"]');
  const open = (caseId) => { caseField.value = caseId || ""; dialog.showModal(); };
  document.querySelectorAll("[data-upload-open]").forEach((button) => button.addEventListener("click", () => open(button.dataset.case)));
  const fromHash = () => {
    if (location.hash !== "#upload") return;
    history.replaceState(null, "", location.pathname + location.search);
    document.querySelector("[data-palette]")?.removeAttribute("data-open");
    document.querySelector("[data-scrim]")?.removeAttribute("data-open");
    open(document.querySelector("[data-upload-open][data-case]")?.dataset.case);
  };
  window.addEventListener("hashchange", fromHash);
  fromHash();
  dialog.querySelector("[data-dismiss]").onclick = () => dialog.close();
  dialog.addEventListener("click", event => { if (event.target === dialog && !busy) dialog.close(); });
  picker.addEventListener("change", () => { addFiles([...picker.files]); picker.value = ""; });
  drop.addEventListener("dragover", event => { event.preventDefault(); drop.classList.add("over"); });
  drop.addEventListener("dragleave", () => drop.classList.remove("over"));
  drop.addEventListener("drop", event => {
    event.preventDefault();
    drop.classList.remove("over");
    addFiles([...event.dataTransfer.files]);
  });
  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (busy || !entries.size) return;
    const data = new FormData(form);
    for (const file of entries.values()) data.append("file", file);
    busy = true;
    form.inert = true;
    refresh();
    try {
      const response = await fetch(form.action, {method: "POST", body: data});
      if (!response.ok || response.redirected) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || "Загрузка не удалась. Проверьте сеанс и попробуйте снова.");
      }
      location.reload();
    } catch (exception) {
      error.textContent = exception.message;
      busy = false;
      form.inert = false;
      refresh();
    }
  });
})();
