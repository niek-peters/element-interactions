import { onDrag } from "./dropzone.js";
import {
  scrollDown,
  scrollLeft,
  scrollRight,
  scrollUp,
  stopHorizontal,
  stopVertical,
} from "./scrolling.js";

type Position = [number, number];

type DragSettings = {
  ghost?: true;
  cursor?: string;
  bounds?: HTMLElement;
  unlockDimensions?: true;
};
type DragState = {
  startPos: Position;
  startMouse: Position;
  startTranslate: Position;
  /** Left, Top, Right, Bottom */
  translationBounds?: [number, number, number, number];
};

const cursorStyle = document.createElement("style");

export const draggables = new Map<HTMLElement, DragSettings>();
export const dragging = new Map<HTMLElement, DragState>();
let singleDragging: [HTMLElement, DragState, DragSettings] | undefined;

const ghosts = new Map<HTMLElement, HTMLElement>();

const order: [HTMLElement, number][] = [];
let orderBase = 0;

/** Distance (in pixels) from bounds edge to start scrolling */
const SCROLL_RANGE = 50;

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

  start(el, pos, settings);

  const cursor =
    ("cursor" in settings && settings.cursor !== undefined
      ? settings.cursor
      : el.computedStyleMap().get("cursor")) || "default";

  cursorStyle.innerHTML = `*{cursor: ${cursor} !important;}`;
  document.head.appendChild(cursorStyle);

  onDrag(document.elementsFromPoint(pos[0], pos[1]) as HTMLElement[]);
}

function startTouch(e: TouchEvent, settings: DragSettings) {
  // console.log("starttouch");
  if (e.cancelable) e.preventDefault();

  const el = e.currentTarget! as HTMLElement;
  if (!draggables.get(el)) return;

  const current = e.targetTouches[0];
  const pos: Position = [current.clientX, current.clientY];

  start(el, pos, settings);

  onDrag(document.elementsFromPoint(pos[0], pos[1]) as HTMLElement[]);
}

export function moveMouse(e: MouseEvent) {
  if (singleDragging === undefined) return;
  // console.log("movemouse");

  const pos: Position = [e.clientX, e.clientY];

  if (pos[0] === 0 || pos[1] === 0) return;

  move(singleDragging[0], pos, singleDragging[1], singleDragging[2]);
}

export function moveTouch(e: TouchEvent) {
  if (singleDragging === undefined) return;
  // console.log("movetouch");

  for (const touch of e.changedTouches) {
    const el = touch.target as HTMLElement;
    if (!draggables.get(el)) return;

    const pos: Position = [touch.clientX, touch.clientY];
    if (dragging.size === 1)
      move(el, pos, singleDragging[1], singleDragging[2]);
    else move(el, pos, dragging.get(el)!, draggables.get(el)!);
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

  if (dragging.size !== 0) {
    const single = dragging.entries().next().value!;
    singleDragging = [single[0], single[1], draggables.get(single[0])!];
  }
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
    const rect = el.getBoundingClientRect();
    const parentRect = el.parentElement!.getBoundingClientRect();

    state.startTranslate[0] -= parseInt(styles.marginLeft);
    state.startTranslate[1] -= parseInt(styles.marginTop);

    state.startTranslate[0] += rect.left - parentRect.left;
    state.startTranslate[1] += rect.top - parentRect.top;
    el.style.position = "absolute";

    if (!("unlockDimensions" in settings)) {
      el.style.setProperty("width", rect.width + "px", "important");
      el.style.setProperty("height", rect.height + "px", "important");
    }

    el.style.translate = `${
      state.startTranslate[0] + pos[0] - state.startMouse[0]
    }px ${state.startTranslate[1] + pos[1] - state.startMouse[1]}px`;
  }

  if ("bounds" in settings && settings.bounds !== undefined) {
    const rect = el.getBoundingClientRect();
    const boundsRect = settings.bounds.getBoundingClientRect();
    state.translationBounds = [
      boundsRect.left -
        rect.left +
        // parseInt(styles.marginLeft) +
        state.startTranslate[0],
      boundsRect.top -
        rect.top +
        // parseInt(styles.marginTop) +
        state.startTranslate[1],
      boundsRect.right -
        rect.right +
        // parseInt(styles.marginRight) +
        state.startTranslate[0],
      boundsRect.bottom -
        rect.bottom +
        // parseInt(styles.marginBottom) +
        state.startTranslate[1],
    ];
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

  dragging.set(el, state);
  singleDragging = [el, state, settings];

  move(el, pos, state, settings);
}

function move(
  el: HTMLElement,
  pos: Position,
  state: DragState,
  settings: DragSettings
) {
  const styles = getComputedStyle(el);

  let left = state.startTranslate[0] + pos[0] - state.startMouse[0];
  let top = state.startTranslate[1] + pos[1] - state.startMouse[1];

  boundedMove(el, left, top, state);

  // autoscroll
  const scrollBounds =
    "bounds" in settings && settings.bounds !== undefined
      ? settings.bounds
      : document.body.parentElement!;
  const boundsRect = scrollBounds.getBoundingClientRect();
  const fixed = styles.position === "fixed";
  // can scroll vertically
  if (scrollBounds.scrollHeight > scrollBounds.clientHeight) {
    // can scroll up
    if (
      scrollBounds.scrollTop > 0 &&
      pos[1] - Math.max(0, boundsRect.top) < SCROLL_RANGE
    )
      scrollUp(scrollBounds);
    // can scroll down
    else if (
      Math.ceil(scrollBounds.scrollTop) <
        scrollBounds.scrollHeight - scrollBounds.clientHeight &&
      Math.min(window.innerHeight, boundsRect.bottom) - pos[1] < SCROLL_RANGE
    )
      scrollDown(scrollBounds);
    else stopVertical(scrollBounds);
  }
  // can scroll horizontally
  if (scrollBounds.scrollWidth > scrollBounds.clientWidth) {
    // can scroll left
    if (
      scrollBounds.scrollLeft > 0 &&
      pos[0] - Math.max(0, boundsRect.left) < SCROLL_RANGE
    )
      scrollLeft(scrollBounds);
    // can scroll right
    if (
      Math.ceil(scrollBounds.scrollLeft) <
        scrollBounds.scrollWidth - scrollBounds.clientWidth &&
      Math.min(window.innerWidth, boundsRect.right) - pos[0] < SCROLL_RANGE
    ) 
      scrollRight(scrollBounds);
  }
}

function boundedMove(
  el: HTMLElement,
  left: number,
  top: number,
  state: DragState
) {
  // bounds
  if (state.translationBounds !== undefined) {
    if (left < state.translationBounds[0]) left = state.translationBounds[0];
    else if (left > state.translationBounds[2])
      left = state.translationBounds[2];

    if (top < state.translationBounds[1]) top = state.translationBounds[1];
    else if (top > state.translationBounds[3]) top = state.translationBounds[3];
  }
  el.style.translate = `${left}px ${top}px`;
}

// function boundedMoveBy(
//   el: HTMLElement,
//   amount: Position,
//   state: DragState,
//   styles: CSSStyleDeclaration
// ) {
//   console.log("juh", amount);
//   const parts = styles.translate.split(/\s+/);
//   const left = parseInt(parts[0]) + amount[0];
//   const top = parseInt(parts[1]) + amount[1];

//   boundedMove(el, left, top, state);
// }

function end(el: HTMLElement) {
  const settings = draggables.get(el)!;
  const scrollBounds =
    "bounds" in settings && settings.bounds !== undefined
      ? settings.bounds
      : document.body.parentElement!;

  stopVertical(scrollBounds);
  stopHorizontal(scrollBounds);

  dragging.delete(el);
  const ghost = ghosts.get(el);
  if (ghost) ghost.remove();
}

export function isDragging() {
  return singleDragging !== undefined;
}
