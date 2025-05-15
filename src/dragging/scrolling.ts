/** Scroll Container -> [up, down, left, right] */
const scrollStates = new Map<
  HTMLElement,
  [boolean, boolean, boolean, boolean]
>();

let verticalInterval: number | undefined;
let verticalIteration = 1;
let horizontalInterval: number | undefined;
let horizontalIteration = 1;

// 60 FPS
const ITERATION_INTERVAL = 17;

// accelerate (top speed in 1 second)
function ease(iteration: number) {
  return Math.min(iteration / 2, 30);
}

export function scrollUp(el: HTMLElement) {
  let state = scrollStates.get(el) ?? [false, false, false, false];

  if (state[0]) return;
  if (state[1]) stopVertical(el);
  state[0] = true;
  scrollStates.set(el, state);

  verticalInterval = setInterval(() => {
    el.scrollBy({ top: -ease(verticalIteration) });
    verticalIteration++;
  }, ITERATION_INTERVAL);
}

export function scrollDown(el: HTMLElement) {
  let state = scrollStates.get(el) ?? [false, false, false, false];

  if (state[1]) return;
  if (state[0]) stopVertical(el);
  state[1] = true;
  scrollStates.set(el, state);

  verticalInterval = setInterval(() => {
    el.scrollBy({ top: ease(verticalIteration) });
    verticalIteration++;
  }, ITERATION_INTERVAL);
}

export function scrollLeft(el: HTMLElement) {
  let state = scrollStates.get(el) ?? [false, false, false, false];

  if (state[2]) return;
  if (state[3]) stopHorizontal(el);
  state[2] = true;
  scrollStates.set(el, state);

  horizontalInterval = setInterval(() => {
    el.scrollBy({ left: -ease(horizontalIteration) });
    horizontalIteration++;
  }, ITERATION_INTERVAL);
}

export function scrollRight(el: HTMLElement) {
  let state = scrollStates.get(el) ?? [false, false, false, false];

  if (state[3]) return;
  if (state[2]) stopHorizontal(el);
  state[3] = true;
  scrollStates.set(el, state);

  horizontalInterval = setInterval(() => {
    el.scrollBy({ left: ease(horizontalIteration) });
    horizontalIteration++;
  }, ITERATION_INTERVAL);
}

export function stopVertical(el: HTMLElement) {
  if (verticalInterval === undefined) return;

  let state = scrollStates.get(el) ?? [false, false, false, false];
  state[0] = false;
  state[1] = false;
  scrollStates.set(el, state);

  clearInterval(verticalInterval);
  verticalInterval = undefined;
  verticalIteration = 1;
}

export function stopHorizontal(el: HTMLElement) {
  if (horizontalInterval === undefined) return;

  let state = scrollStates.get(el) ?? [false, false, false, false];
  state[2] = false;
  state[3] = false;
  scrollStates.set(el, state);

  clearInterval(horizontalInterval);
  horizontalInterval = undefined;
  horizontalIteration = 1;
}
