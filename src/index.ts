type Position = [number, number];

type DragSettings = { ghost?: boolean };
type DragState = {
  startPos: Position;
  startMouse: Position;
  startTranslate: Position;
};

const draggables = new Map<HTMLElement, DragSettings>();
const dragging = new Map<HTMLElement, DragState>();

export function draggable(el: HTMLElement, settings: DragSettings) {
  draggables.set(el, settings);

  el.classList.add("draggable");

  const startF = (e: PointerEvent) => start(el, e);
  const moveF = (e: PointerEvent) => move(el, e);
  const endF = (e: PointerEvent) => end(el, e);
  el.addEventListener("pointerdown", startF);
  el.addEventListener("pointermove", moveF);
  el.addEventListener("pointerup", endF);
}

function start(el: HTMLElement, e: PointerEvent) {
  const startTranslate = el.style.translate
    .split(/\s+/)
    .map((part) => parseInt(part.replace("px", "") || "0"));
  while (startTranslate.length < 2) startTranslate.push(0);

  const state: DragState = {
    startPos: [el.offsetLeft, el.offsetTop],
    startMouse: [e.clientX, e.clientY],
    startTranslate: startTranslate as [number, number],
  };
  dragging.set(el, state);
  console.log(state.startTranslate);
}

function move(el: HTMLElement, e: PointerEvent) {
  const state = dragging.get(el);
  if (state === undefined) return;

  el.style.translate = `${
    state.startTranslate[0] + e.clientX - state.startMouse[0]
  }px ${state.startTranslate[1] + e.clientY - state.startMouse[1]}px`;
}

function end(el: HTMLElement, e: PointerEvent) {
  //   const state = dragging.get(el);
  //   if (state === undefined) return;

  dragging.delete(el);
}

// function getTranslateXY(el: HTMLElement): Position {
//   const style = window.getComputedStyle(el);
//   const matrix = new DOMMatrixReadOnly(style.transform);
//   return [matrix.m41, matrix.m42];
// }
