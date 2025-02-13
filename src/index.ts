type Position = [number, number];

type DragSettings = { ghost?: boolean; cursor?: string };
type DragState = {
  startPos: Position;
  startMouse: Position;
  startTranslate: Position;
};

const cursorStyle = document.createElement("style");
cursorStyle.id = "cursor-style";

const draggables = new Map<HTMLElement, DragSettings>();
const dragging = new Map<HTMLElement, DragState>();

document.addEventListener("touchmove", moveTouch);
document.addEventListener("mousemove", moveMouse);
document.addEventListener("mouseup", endMouse);

export function draggable(el: HTMLElement, settings: DragSettings = {}) {
  if (draggables.has(el)) return;

  draggables.set(el, settings);

  el.classList.add("draggable");

  const startMouseF = (e: MouseEvent) => startMouse(e, settings);

  el.addEventListener("mousedown", startMouseF);

  el.addEventListener("touchstart", startTouch);
  el.addEventListener("touchend", endTouch);
  el.addEventListener("touchcancel", endTouch);

  return () => {
    if (!draggables.has(el)) return;

    draggables.delete(el);

    el.classList.remove("draggable");

    el.removeEventListener("mousedown", startMouseF);

    el.removeEventListener("touchstart", startTouch);
    el.removeEventListener("touchend", endTouch);
    el.removeEventListener("touchcancel", endTouch);
  };
}

function startMouse(e: MouseEvent, settings: DragSettings) {
  // console.log("startmouse");
  const el = e.currentTarget! as HTMLElement;
  const pos: Position = [e.clientX, e.clientY];

  start(el, pos);

  const cursor =
    ("cursor" in settings && settings.cursor !== undefined
      ? settings.cursor
      : el.style.cursor) || "default";

  cursorStyle.innerHTML = `*{cursor: ${cursor} !important;}`;
  document.head.appendChild(cursorStyle);
}

function startTouch(e: TouchEvent) {
  // console.log("starttouch");
  if (e.cancelable) e.preventDefault();

  const el = e.currentTarget! as HTMLElement;
  const current = e.targetTouches[0];
  const pos: Position = [current.clientX, current.clientY];

  start(el, pos);
}

function moveMouse(e: MouseEvent) {
  if (dragging.size === 0) return;
  // console.log("movemouse");

  const el = dragging.keys().next().value!;
  const pos: Position = [e.clientX, e.clientY];

  if (pos[0] === 0 || pos[1] === 0) return;

  move(el, pos);
}

function moveTouch(e: TouchEvent) {
  if (dragging.size === 0) return;
  // console.log("movetouch");

  for (const touch of e.changedTouches) {
    const el = touch.target as HTMLElement;
    const pos: Position = [touch.clientX, touch.clientY];

    move(el, pos);
  }
}

function endMouse(e: MouseEvent) {
  if (dragging.size === 0) return;
  // console.log("endmouse");

  const el = dragging.keys().next().value!;

  document.getElementById("cursor-style")!.remove();

  end(el);
}

function endTouch(e: TouchEvent) {
  // console.log("endtouch");
  e.preventDefault();
  const el = e.currentTarget! as HTMLElement;

  end(el);
}

function start(el: HTMLElement, pos: Position) {
  const startTranslate = el.style.translate
    .split(/\s+/)
    .map((part) => parseInt(part.replace("px", "") || "0"));
  while (startTranslate.length < 2) startTranslate.push(0);

  const state: DragState = {
    startPos: [el.offsetLeft, el.offsetTop],
    startMouse: pos,
    startTranslate: startTranslate as [number, number],
  };

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

  dragging.set(el, state);
}

function move(el: HTMLElement, pos: Position) {
  const state = dragging.get(el);
  if (state === undefined) return;

  el.style.translate = `${
    state.startTranslate[0] + pos[0] - state.startMouse[0]
  }px ${state.startTranslate[1] + pos[1] - state.startMouse[1]}px`;
}

function end(el: HTMLElement) {
  dragging.delete(el);
}
