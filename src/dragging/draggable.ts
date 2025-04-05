type Position = [number, number];

type DragSettings = { ghost?: boolean; cursor?: string; bounds?: HTMLElement };
type DragState = {
  startPos: Position;
  startMouse: Position;
  startTranslate: Position;
};

const cursorStyle = document.createElement("style");

const draggables = new Map<HTMLElement, DragSettings>();
const dragging = new Map<HTMLElement, DragState>();
let singleDragging: [HTMLElement, DragState] | undefined;

export function draggable(el: HTMLElement, settings: DragSettings = {}) {
  if (draggables.has(el)) return;

  draggables.set(el, settings);

  el.classList.add("draggable");

  const startMouseF = (e: MouseEvent) => startMouse(e, settings);
  const startTouchF = (e: TouchEvent) => startTouch(e, settings);

  el.addEventListener("mousedown", startMouseF);
  el.addEventListener("touchstart", startTouchF);

  return () => {
    if (!draggables.has(el)) return;

    draggables.delete(el);

    el.classList.remove("draggable");

    el.removeEventListener("mousedown", startMouseF);
    el.removeEventListener("touchstart", startTouchF);
  };
}

function startMouse(e: MouseEvent, settings: DragSettings) {
  // console.log("startmouse");
  const el = e.currentTarget! as HTMLElement;
  const pos: Position = [e.clientX, e.clientY];

  const state = start(el, pos, settings);
  singleDragging = [el, state];

  const cursor =
    ("cursor" in settings && settings.cursor !== undefined
      ? settings.cursor
      : el.computedStyleMap().get("cursor")) || "default";

  cursorStyle.innerHTML = `*{cursor: ${cursor} !important;}`;
  document.head.appendChild(cursorStyle);
}

function startTouch(e: TouchEvent, settings: DragSettings) {
  // console.log("starttouch");
  if (e.cancelable) e.preventDefault();

  const el = e.currentTarget! as HTMLElement;
  const current = e.targetTouches[0];
  const pos: Position = [current.clientX, current.clientY];

  const state = start(el, pos, settings);
  dragging.set(el, state);
  singleDragging = [el, state];
}

export function moveMouse(e: MouseEvent) {
  if (singleDragging === undefined) return;
  // console.log("movemouse");

  const el = singleDragging[0];
  const state = singleDragging[1];
  const pos: Position = [e.clientX, e.clientY];

  if (pos[0] === 0 || pos[1] === 0) return;

  move(el, pos, state);
}

export function moveTouch(e: TouchEvent) {
  if (singleDragging === undefined) return;
  // console.log("movetouch");

  for (const touch of e.changedTouches) {
    const el = touch.target as HTMLElement;
    const pos: Position = [touch.clientX, touch.clientY];
    if (dragging.size === 1) move(el, pos, singleDragging[1]);
    else move(el, pos, dragging.get(el)!);
  }
}

export function endMouse(e: MouseEvent) {
  if (singleDragging === undefined) return;
  // console.log("endmouse");

  singleDragging = undefined;
  cursorStyle.remove();
}

export function endTouch(e: TouchEvent) {
  // console.log("endtouch");
  if (singleDragging === undefined) return;
  if (e.cancelable) e.preventDefault();

  const el = e.target! as HTMLElement;

  if (singleDragging[0] === el) singleDragging = undefined;

  dragging.delete(el);
  if (dragging.size !== 0) singleDragging = dragging.entries().next().value;
}

function start(el: HTMLElement, pos: Position, settings: DragSettings) {
  const startTranslate = el.style.translate
    .split(/\s+/)
    .map((part) => parseInt(part.replace("px", "") || "0"));
  while (startTranslate.length < 2) startTranslate.push(0);

  const state: DragState = {
    startPos: [el.offsetLeft, el.offsetTop],
    startMouse: pos,
    startTranslate: startTranslate as [number, number],
  };

  if (!("ghost" in settings) || settings.ghost === false) {
    const styles = getComputedStyle(el);

    if (styles.position !== "fixed" && styles.position !== "absolute") {
      const marginLeft = parseInt(styles.marginLeft);
      const marginTop = parseInt(styles.marginTop);
      state.startTranslate[0] -= marginLeft;
      state.startTranslate[1] -= marginTop;
      el.style.position = "absolute";

      el.style.translate = `${
        state.startTranslate[0] + pos[0] - state.startMouse[0]
      }px ${state.startTranslate[1] + pos[1] - state.startMouse[1]}px`;
    }
  }

  const zIndex = parseInt(el.style.zIndex || "0");
  let found = false;

  for (const el1 of draggables.keys()) {
    if (el === el1) continue;

    const zIndexOther = parseInt(el1.style.zIndex || "0");
    if (zIndex + 1 === zIndexOther) {
      el1.style.zIndex = zIndexOther - 1 + "";
      found = true;
    } else if (zIndex === zIndexOther) found = true;
  }

  if (found) el.style.zIndex = zIndex + 1 + "";

  return state;
}

function move(el: HTMLElement, pos: Position, state: DragState) {
  el.style.translate = `${
    state.startTranslate[0] + pos[0] - state.startMouse[0]
  }px ${state.startTranslate[1] + pos[1] - state.startMouse[1]}px`;
}
