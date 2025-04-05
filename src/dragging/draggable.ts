type Position = [number, number];

type DragSettings = { ghost?: true; cursor?: string; bounds?: HTMLElement };
type DragState = {
  startPos: Position;
  startMouse: Position;
  startTranslate: Position;
};

const cursorStyle = document.createElement("style");

const draggables = new Map<HTMLElement, DragSettings>();
const dragging = new Map<HTMLElement, DragState>();
let singleDragging: [HTMLElement, DragState] | undefined;

const ghosts = new Map<HTMLElement, HTMLElement>();

const order: [HTMLElement, number][] = [];
let orderBase = 0;

export function draggable(el: HTMLElement, settings: DragSettings = {}) {
  if (draggables.has(el)) return;

  draggables.set(el, settings);

  el.classList.add("draggable");

  const zIndex = getComputedStyle(el).zIndex;
  const z = zIndex === "auto" ? 0 : parseInt(zIndex);

  order.push([el, z]);

  for (let i = order.length - 1; i > 0; i--) {
    if (order[i][1] < order[i - 1][1]) {
      const temp = order[i - 1];
      order[i - 1] = order[i];
      order[i] = temp;
    } else break;
  }

  orderBase = order[order.length - 1][1];

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
  if (!draggables.get(el)) return;

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
  if (!draggables.get(el)) return;

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
    if (!draggables.get(el)) return;

    const pos: Position = [touch.clientX, touch.clientY];
    if (dragging.size === 1) move(el, pos, singleDragging[1]);
    else move(el, pos, dragging.get(el)!);
  }
}

export function endMouse(e: MouseEvent) {
  if (singleDragging === undefined) return;
  // console.log("endmouse");
  end(singleDragging[0]);

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
  end(el);
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

  if ("ghost" in settings) {
    const ghost = el.cloneNode(true) as HTMLElement;
    ghosts.set(el, ghost);
    if (ghost.id.length) ghost.id += "-ghost";
    el.insertAdjacentElement("afterend", ghost);
  }

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

  if (order.length >= 2 && order[order.length - 1][0] !== el) {
    for (let i = 0; i < order.length - 1; i++) {
      if (order[i][0] === el) {
        const temp = order[i];
        order[i] = order[i + 1];
        order[i + 1] = temp;
      }
    }

    const n = order.length - 1;
    // if we can just swap z-indices
    if (order.length === 2) {
      const temp = order[n][1];
      order[n][1] = order[n - 1][1];
      order[n - 1][1] = temp;
    }
    // if we can decrement the z-index of the previous top element
    else if (order[n - 1][1] > order[n - 2][1] + 1) {
      order[n][1] = order[n - 1][1];
      order[n - 1][1] -= 1;
    }
    // if we can decrement the z-index of every other element
    else if (order[0][1] > orderBase) {
      order[n][1] = order[n - 1][1];
      for (let i = 0; i < order.length - 1; i++) {
        order[i][1] -= 1;

        order[i][0].style.setProperty("z-index", order[i][1] + "", "important");
      }
    }
    // else we must increment the z-index of the new top element
    else {
      order[n][1] = order[n - 1][1] + 1;
    }

    order[n][0].style.setProperty("z-index", order[n][1] + "", "important");
    order[n - 1][0].style.setProperty(
      "z-index",
      order[n - 1][1] + "",
      "important"
    );
  }

  return state;
}

function move(el: HTMLElement, pos: Position, state: DragState) {
  el.style.translate = `${
    state.startTranslate[0] + pos[0] - state.startMouse[0]
  }px ${state.startTranslate[1] + pos[1] - state.startMouse[1]}px`;
}

function end(el: HTMLElement) {
  const ghost = ghosts.get(el);
  if (ghost) ghost.remove();
}
