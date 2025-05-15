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

type DragSettingsInput = Omit<DragSettings, "container">;
type DragSettings = {
  ghost?: true;
  cursor?: string;
  bounds?: HTMLElement;
  unlockDimensions?: true;
  container: HTMLElement;
};
type DragState = {
  startPos: Position;
  startMouse: Position;
  startTranslate: Position;
  /** Left, Top, Right, Bottom */
  translationBounds?: [number, number, number, number];
  fixed: boolean;
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

export function draggable(el: HTMLElement, settings: DragSettingsInput = {}) {
  if (draggables.has(el)) return;

  const container =
    "bounds" in settings && settings.bounds !== undefined
      ? settings.bounds
      : document.body.parentElement!;

  const finalSettings: DragSettings = { ...settings, container };

  draggables.set(el, finalSettings);

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

  const startMouseF = (e: MouseEvent) => startMouse(e, finalSettings);
  const startTouchF = (e: TouchEvent) => startTouch(e, finalSettings);

  el.addEventListener("mousedown", startMouseF);
  el.addEventListener("touchstart", startTouchF);

  const observer = new ResizeObserver(() => {
    if (!(el.style.position === "absolute" || el.style.position === "fixed"))
      return;

    const rect = el.getBoundingClientRect();
    const boundsRect = container.getBoundingClientRect();

    const translate = el.style.translate
      .split(/\s+/)
      .map((part) => parseInt(part.replace("px", "") || "0"));
    while (translate.length < 2) translate.push(0);

    const rightOvershoot =
      rect.right -
      boundsRect.left -
      container.scrollWidth +
      container.scrollLeft;
    let leftOvershoot = boundsRect.left - rect.left - container.scrollLeft;
    if (rightOvershoot + leftOvershoot > 0) leftOvershoot = 0;

    const bottomOvershoot =
      rect.bottom -
      boundsRect.top -
      container.scrollHeight +
      container.scrollTop;
    let topOvershoot = boundsRect.top - rect.top - container.scrollTop;
    if (bottomOvershoot + topOvershoot > 0) topOvershoot = 0;

    translate[0] -= Math.max(0, rightOvershoot);
    translate[0] += Math.max(0, leftOvershoot);
    translate[1] -= Math.max(0, bottomOvershoot);
    translate[1] += Math.max(0, topOvershoot);

    el.style.translate = `${translate[0]}px ${translate[1]}px`;
  });
  observer.observe(container);

  return () => {
    if (!draggables.has(el)) return;

    draggables.delete(el);

    el.classList.remove("draggable");

    el.removeEventListener("mousedown", startMouseF);
    el.removeEventListener("touchstart", startTouchF);

    observer.unobserve(container);
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
    fixed: el.style.position === "fixed",
  };

  if ("ghost" in settings) {
    const ghost = el.cloneNode(true) as HTMLElement;
    ghosts.set(el, ghost);
    if (ghost.id.length) ghost.id += "-ghost";
    el.insertAdjacentElement("afterend", ghost);

    const zIndex = el.style.zIndex;
    ghost.style.zIndex =
      zIndex === "auto" ? "-1" : (parseInt(zIndex) - 1).toString();
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
        state.startTranslate[0] -
        settings.bounds.scrollLeft,
      boundsRect.top -
        rect.top +
        // parseInt(styles.marginTop) +
        state.startTranslate[1] -
        settings.bounds.scrollTop,
      boundsRect.right -
        rect.right +
        // parseInt(styles.marginRight) +
        state.startTranslate[0] +
        (settings.bounds.scrollWidth -
          settings.bounds.offsetWidth -
          settings.bounds.scrollLeft),
      boundsRect.bottom -
        rect.bottom +
        // parseInt(styles.marginBottom) +
        state.startTranslate[1] +
        (settings.bounds.scrollHeight -
          settings.bounds.offsetHeight -
          settings.bounds.scrollTop),
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
  const boundsRect = settings.container.getBoundingClientRect();
  const fixed = styles.position === "fixed";
  // can scroll vertically
  if (settings.container.scrollHeight > settings.container.clientHeight) {
    // can scroll up
    if (
      settings.container.scrollTop > 0 &&
      pos[1] - Math.max(0, boundsRect.top) < SCROLL_RANGE
    )
      scrollUp(settings.container);
    // can scroll down
    else if (
      Math.ceil(settings.container.scrollTop) <
        settings.container.scrollHeight - settings.container.clientHeight &&
      Math.min(window.innerHeight, boundsRect.bottom) - pos[1] < SCROLL_RANGE
    )
      scrollDown(settings.container);
    else stopVertical(settings.container);
  }
  // can scroll horizontally
  if (settings.container.scrollWidth > settings.container.clientWidth) {
    // can scroll left
    if (
      settings.container.scrollLeft > 0 &&
      pos[0] - Math.max(0, boundsRect.left) < SCROLL_RANGE
    )
      scrollLeft(settings.container);
    // can scroll right
    if (
      Math.ceil(settings.container.scrollLeft) <
        settings.container.scrollWidth - settings.container.clientWidth &&
      Math.min(window.innerWidth, boundsRect.right) - pos[0] < SCROLL_RANGE
    )
      scrollRight(settings.container);
  }
}

export function moveBy(el: HTMLElement, amount: Position, state: DragState) {
  const translate = el.style.translate
    .split(/\s+/)
    .map((part) => parseInt(part.replace("px", "") || "0"));
  while (translate.length < 2) translate.push(0);

  let left = translate[0] + amount[0];
  let top = translate[1] + amount[1];

  boundedMove(el, left, top, state);
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

function end(el: HTMLElement) {
  const settings = draggables.get(el)!;
  const scrollBounds =
    "bounds" in settings && settings.bounds !== undefined
      ? settings.bounds
      : document.body.parentElement!;

  stopVertical(scrollBounds);
  stopHorizontal(scrollBounds);

  // dragging.delete(el);
  const ghost = ghosts.get(el);
  if (ghost) ghost.remove();
}

export function isDragging() {
  return singleDragging !== undefined;
}
