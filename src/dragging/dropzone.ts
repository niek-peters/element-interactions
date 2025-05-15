import { draggables, dragging } from "./draggable.js";

export const dropzones = new Set<HTMLElement>();
export const over = new Map<HTMLElement, HTMLElement>();

export function dropzone(el: HTMLElement) {
  dropzones.add(el);
}

export function onDragEnter(draggable: HTMLElement, dropzone: HTMLElement) {
  over.set(draggable, dropzone);

  console.log("enter", draggable.id, dropzone.id);
}

export function onDragLeave(draggable: HTMLElement) {
  const dropZone = over.get(draggable);
  if (dropZone === undefined) return;
  over.delete(draggable);

  console.log("left", draggable.id, dropZone.id);
}

export function onDrop(draggable: HTMLElement) {
  // if (dragging.get(draggable)?.fixed === false) {
  //   draggable.style.position = "absolute";
  // }

  // dragging.delete(draggable);

  const dropZone = over.get(draggable);
  if (dropZone === undefined) return;
  over.delete(draggable);

  console.log("dropped", draggable.id, dropZone.id);
}

export function onDrag(els: HTMLElement[]) {
  let draggable: HTMLElement | undefined;
  let dropZone: HTMLElement | undefined;
  for (const el of els) {
    if (dropzones.has(el)) {
      dropZone = el;
      if (draggable !== undefined) break;
    } else if (dragging.has(el)) {
      draggable = el;
      if (dropZone !== undefined) break;
    }
  }

  if (draggable === undefined) return;

  if (dropZone === undefined) {
    onDragLeave(draggable);
    return;
  }

  const prev = over.get(draggable);

  if (prev === undefined) onDragEnter(draggable, dropZone);
  else if (prev !== dropZone) {
    onDragLeave(draggable);
    onDragEnter(draggable, dropZone);
  }
}
