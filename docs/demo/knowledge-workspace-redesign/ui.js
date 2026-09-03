export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
export const icon = (name, className = "") => `<svg class="${className}" aria-hidden="true"><use href="#i-${name}"/></svg>`;

export function toast(message, type = "check") {
  const region = $("#toastRegion");
  const item = document.createElement("div");
  item.className = "toast";
  item.innerHTML = `${icon(type)}<span>${message}</span>`;
  region.append(item);
  item.animate([
    { opacity: 0, transform: "translateY(10px) scale(.96)" },
    { opacity: 1, transform: "none" }
  ], { duration: 260, easing: "cubic-bezier(.2,.75,.25,1)" });
  setTimeout(async () => {
    await item.animate([{ opacity: 1 }, { opacity: 0, transform: "translateY(6px)" }], { duration: 180 }).finished;
    item.remove();
  }, 2600);
}

export function closeLayer(layer) {
  layer.classList.remove("open");
  layer.classList.add("closing");
  setTimeout(() => {
    layer.hidden = true;
    layer.classList.remove("closing");
    layer.innerHTML = "";
  }, 180);
}

export function confirmAction({ title, description, confirmText = "确认", danger = false, onConfirm }) {
  const layer = $("#confirmDialog");
  layer.innerHTML = `
    <section class="dialog-card" role="alertdialog" aria-modal="true" aria-labelledby="confirmTitle">
      <header><span class="dialog-mark ${danger ? "warning" : ""}">${icon(danger ? "warning" : "check")}</span><div><h2 id="confirmTitle">${title}</h2><p>${description}</p></div></header>
      <footer><button class="button quiet" type="button" data-confirm-cancel>取消</button><button class="button ${danger ? "danger" : "primary"}" type="button" data-confirm-ok>${confirmText}</button></footer>
    </section>`;
  layer.hidden = false;
  layer.classList.add("open");
  const cancel = $("[data-confirm-cancel]", layer);
  const okay = $("[data-confirm-ok]", layer);
  cancel.addEventListener("click", () => closeLayer(layer));
  okay.addEventListener("click", async () => {
    okay.disabled = true;
    okay.textContent = "处理中…";
    await new Promise((resolve) => setTimeout(resolve, 520));
    closeLayer(layer);
    onConfirm?.();
  });
  layer.addEventListener("click", (event) => { if (event.target === layer) closeLayer(layer); }, { once: true });
  cancel.focus();
}

export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
