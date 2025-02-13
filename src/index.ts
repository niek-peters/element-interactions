type Position = [number, number];

type DragSettings = { ghost?: boolean };
type DragState = {
  startPos: Position;
  startMouse: Position;
  startTranslate: Position;
};

const draggables = new Map<HTMLElement, DragSettings>();
const dragging = new Map<HTMLElement, DragState>();

document.addEventListener("touchmove", moveTouch);

export function draggable(el: HTMLElement, settings: DragSettings) {
  if (draggables.has(el)) return;

  draggables.set(el, settings);

  el.classList.add("draggable");
  el.draggable = true;

  el.addEventListener("dragstart", startDrag);
  el.addEventListener("mousedown", startMouse);
  el.addEventListener("drag", moveMouse);
  el.addEventListener("dragend", endMouse);
  el.addEventListener("mouseup", endMouse);

  el.addEventListener("touchstart", startTouch);
  el.addEventListener("touchend", endTouch);
  el.addEventListener("touchcancel", endTouch);
}

export function undraggable(el: HTMLElement) {
  if (!draggables.has(el)) return;

  draggables.delete(el);

  el.classList.remove("draggable");
  el.draggable = false;

  el.removeEventListener("dragstart", startDrag);
  el.removeEventListener("mousedown", startMouse);
  el.removeEventListener("drag", moveMouse);
  el.removeEventListener("dragend", endMouse);
  el.removeEventListener("mouseup", endMouse);

  el.removeEventListener("touchstart", startTouch);
  el.removeEventListener("touchend", endTouch);
  el.removeEventListener("touchcancel", endTouch);
}

function startDrag(e: DragEvent) {
  console.log("startdrag");
  const dataTransfer = e.dataTransfer!;
  const canvas = document.createElement("canvas");
  dataTransfer.effectAllowed = "move";
  dataTransfer.setDragImage(canvas, 0, 0);
  canvas.remove();
}

function startMouse(e: MouseEvent) {
  console.log("startmouse");
  const el = e.currentTarget! as HTMLElement;
  const pos: Position = [e.clientX, e.clientY];

  start(el, pos);
}

function startTouch(e: TouchEvent) {
  console.log("starttouch");
  e.preventDefault();

  const el = e.currentTarget! as HTMLElement;
  const current = e.targetTouches[0];
  const pos: Position = [current.clientX, current.clientY];

  start(el, pos);
}

function moveMouse(e: MouseEvent) {
  // if (isTouch() || dragging.size === 0) return;
  if (dragging.size === 0) return;
  console.log("movemouse");

  const el = e.currentTarget! as HTMLElement;
  const pos: Position = [e.clientX, e.clientY];

  if (pos[0] === 0 || pos[1] === 0) return;

  move(el, pos);
}

function moveTouch(e: TouchEvent) {
  if (dragging.size === 0) return;
  console.log("movetouch");

  for (const touch of e.changedTouches) {
    const el = touch.target as HTMLElement;
    const pos: Position = [touch.clientX, touch.clientY];

    move(el, pos);
  }
}

function endMouse(e: MouseEvent) {
  console.log("endmouse", e instanceof DragEvent ? "drag" : "normal");
  const el = e.currentTarget! as HTMLElement;

  end(el);
}

function endTouch(e: TouchEvent) {
  console.log("endtouch");
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
