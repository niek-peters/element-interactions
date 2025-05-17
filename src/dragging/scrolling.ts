type ScrollState = -1 | 0 | 1;

/** Scroll Container -> [up/down, left/right] */
const scrollStates = new Map<HTMLElement, [ScrollState, ScrollState]>();

let verticalInterval: number | undefined;
let verticalIteration = 1;
let horizontalInterval: number | undefined;
let horizontalIteration = 1;

// 60 FPS
const ITERATION_INTERVAL = 17;

/** Distance (in pixels) from bounds edge to start scrolling */
const SCROLL_RANGE = 50;

// accelerate (top speed in 1 second)
function ease(iteration: number) {
  return Math.min(iteration / 2, 30);
}

export function handleScroll(pos: Position, settings: DragSettings) {
  // autoscroll
  const boundsRect = settings.container.getBoundingClientRect();
  // can scroll vertically
  if (settings.container.scrollHeight > settings.container.clientHeight) {
    // can scroll up
    if (
      settings.container.scrollTop > 0 &&
      pos[1] - Math.max(0, boundsRect.top) < SCROLL_RANGE
    )
      scroll(settings.container, true, false);
    // can scroll down
    else if (
      Math.ceil(settings.container.scrollTop) <
        settings.container.scrollHeight - settings.container.clientHeight &&
      Math.min(window.innerHeight, boundsRect.bottom) - pos[1] < SCROLL_RANGE
    )
      scroll(settings.container, true, true);
    else stopVertical(settings.container);
  }
  // can scroll horizontally
  if (settings.container.scrollWidth > settings.container.clientWidth) {
    // can scroll left
    if (
      settings.container.scrollLeft > 0 &&
      pos[0] - Math.max(0, boundsRect.left) < SCROLL_RANGE
    )
      scroll(settings.container, false, false);
    // can scroll right
    else if (
      Math.ceil(settings.container.scrollLeft) <
        settings.container.scrollWidth - settings.container.clientWidth &&
      Math.min(window.innerWidth, boundsRect.right) - pos[0] < SCROLL_RANGE
    )
      scroll(settings.container, false, true);
    else stopHorizontal(settings.container);
  }
}

function scroll(container: HTMLElement, vertical: boolean, positive: boolean) {
  const states = scrollStates.get(container) ?? [0, 0];

  const dimIndex = vertical ? 0 : 1;
  const state = positive ? 1 : -1;

  if (states[dimIndex] === state) return;
  if (states[dimIndex] === -state) {
    if (vertical) stopVertical(container);
    else stopHorizontal(container);
  }
  states[dimIndex] = state;
  scrollStates.set(container, states);

  if (vertical)
    verticalInterval = setInterval(() => {
      container.scrollBy({ top: state * ease(verticalIteration) });
      verticalIteration++;
    }, ITERATION_INTERVAL);
  else
    horizontalInterval = setInterval(() => {
      container.scrollBy({ left: state * ease(horizontalIteration) });
      horizontalIteration++;
    }, ITERATION_INTERVAL);
}

export function stopVertical(el: HTMLElement) {
  if (verticalInterval === undefined) return;

  let states = scrollStates.get(el) ?? [0, 0];
  states[0] = 0;
  scrollStates.set(el, states);

  clearInterval(verticalInterval);
  verticalInterval = undefined;
  verticalIteration = 1;
}

export function stopHorizontal(el: HTMLElement) {
  if (horizontalInterval === undefined) return;

  let states = scrollStates.get(el) ?? [0, 0];
  states[1] = 0;
  scrollStates.set(el, states);

  clearInterval(horizontalInterval);
  horizontalInterval = undefined;
  horizontalIteration = 1;
}
