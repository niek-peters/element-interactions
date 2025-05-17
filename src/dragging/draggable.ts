import { onDrag, onDrop } from "./dropzone.js";
import { handleScroll, stopHorizontal, stopVertical } from "./scrolling.js";

const cursorStyle = document.createElement("style");

export const draggables = new Map<HTMLElement, DragSettings>();
export const dragging = new Map<HTMLElement, DragState>();
let singleDragging: [HTMLElement, DragState, DragSettings] | undefined;

const ghosts = new Map<HTMLElement, HTMLElement>();

/** container -> dragging -> last pointer position */
const containerDragging = new Map<HTMLElement, Map<HTMLElement, Position>>();

const order: [HTMLElement, number][] = [];
let orderBase = 0;

export function draggable(el: HTMLElement, settings: DragSettingsInput = {}) {
  if (draggables.has(el)) return;

  const container =
    "bounds" in settings && settings.bounds !== undefined
      ? settings.bounds
      : document.body.parentElement!;
  const scrollContainer =
    container === document.body.parentElement ? window : container;

  const finalSettings: DragSettings = { ...settings, container };

  draggables.set(el, finalSettings);

  el.classList.add("draggable");

  initOrder(el);

  const startMouseF = (e: MouseEvent) => startMouse(e, finalSettings);
  const startTouchF = (e: TouchEvent) => startTouch(e, finalSettings);
  const scrollF = () => {
    for (const [el, pos] of containerDragging.get(container)!)
      move(el, pos, dragging.get(el)!, finalSettings);
  };

  el.addEventListener("mousedown", startMouseF);
  el.addEventListener("touchstart", startTouchF);

  if (!containerDragging.has(container)) {
    containerDragging.set(container, new Map<HTMLElement, Position>());
    scrollContainer.addEventListener("scroll", scrollF);
  }

  const observer = createResizeWatcher(el, container);
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
}

function startTouch(e: TouchEvent, settings: DragSettings) {
  if (e.cancelable) e.preventDefault();

  const el = e.currentTarget! as HTMLElement;
  if (!draggables.get(el)) return;

  const current = e.targetTouches[0];
  const pos: Position = [current.clientX, current.clientY];

  start(el, pos, settings);
}

export function moveMouse(e: MouseEvent) {
  if (singleDragging === undefined) return;

  const pos: Position = [e.clientX, e.clientY];

  if (pos[0] === 0 || pos[1] === 0) return;

  move(singleDragging[0], pos, singleDragging[1], singleDragging[2]);
}

export function moveTouch(e: TouchEvent) {
  if (singleDragging === undefined) return;

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
  end(singleDragging[0]);

  singleDragging = undefined;
  cursorStyle.remove();
}

export function endTouch(e: TouchEvent) {
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
    startScroll: [settings.container.scrollLeft, settings.container.scrollTop],
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
  const rect = el.getBoundingClientRect();

  if (styles.position !== "fixed" && styles.position !== "absolute") {
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
    const boundsRect = settings.bounds.getBoundingClientRect();
    state.translationBounds = [
      boundsRect.left -
        rect.left +
        state.startTranslate[0] -
        settings.bounds.scrollLeft,
      boundsRect.top -
        rect.top +
        state.startTranslate[1] -
        settings.bounds.scrollTop,
      boundsRect.right -
        rect.right +
        state.startTranslate[0] +
        (settings.bounds.scrollWidth -
          settings.bounds.offsetWidth -
          settings.bounds.scrollLeft),
      boundsRect.bottom -
        rect.bottom +
        state.startTranslate[1] +
        (settings.bounds.scrollHeight -
          settings.bounds.offsetHeight -
          settings.bounds.scrollTop),
    ];
  }

  reorder(el);

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
  const others = containerDragging.get(settings.container)!;
  others.set(el, pos);

  let left =
    state.startTranslate[0] +
    pos[0] -
    state.startMouse[0] +
    settings.container.scrollLeft -
    state.startScroll[0];
  let top =
    state.startTranslate[1] +
    pos[1] -
    state.startMouse[1] +
    settings.container.scrollTop -
    state.startScroll[1];

  // bounds
  if (state.translationBounds !== undefined) {
    if (left < state.translationBounds[0]) left = state.translationBounds[0];
    else if (left > state.translationBounds[2])
      left = state.translationBounds[2];

    if (top < state.translationBounds[1]) top = state.translationBounds[1];
    else if (top > state.translationBounds[3]) top = state.translationBounds[3];
  }
  el.style.translate = `${left}px ${top}px`;

  handleScroll(pos, settings);

  onDrag(el, document.elementsFromPoint(pos[0], pos[1]) as HTMLElement[]);
}

function end(el: HTMLElement) {
  const settings = draggables.get(el)!;

  stopVertical(settings.container);
  stopHorizontal(settings.container);

  dragging.delete(el);
  const ghost = ghosts.get(el);
  if (ghost) ghost.remove();

  const others = containerDragging.get(settings.container);
  if (others !== undefined) others.delete(el);

  onDrop(el);
}

function initOrder(draggable: HTMLElement) {
  const zIndex = getComputedStyle(draggable).zIndex;
  const z = zIndex === "auto" ? 0 : parseInt(zIndex);

  order.push([draggable, z]);

  for (let i = order.length - 1; i > 0; i--) {
    if (order[i][1] < order[i - 1][1]) {
      const temp = order[i - 1];
      order[i - 1] = order[i];
      order[i] = temp;
    } else break;
  }

  orderBase = order[order.length - 1][1];
}

function reorder(draggable: HTMLElement) {
  if (order.length >= 2 && order[order.length - 1][0] !== draggable) {
    for (let i = 0; i < order.length - 1; i++) {
      if (order[i][0] === draggable) {
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
}

function createResizeWatcher(draggable: HTMLElement, container: HTMLElement) {
  return new ResizeObserver(() => {
    if (
      !(
        draggable.style.position === "absolute" ||
        draggable.style.position === "fixed"
      )
    )
      return;

    const rect = draggable.getBoundingClientRect();
    const boundsRect = container.getBoundingClientRect();

    const translate = draggable.style.translate
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

    draggable.style.translate = `${translate[0]}px ${translate[1]}px`;
  });
}
