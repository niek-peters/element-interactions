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
  const dropZone = over.get(draggable);
  if (dropZone === undefined) return;
  over.delete(draggable);

  console.log("dropped", draggable.id, dropZone.id);
}

export function onDrag(draggable: HTMLElement, els: HTMLElement[]) {
  let dropZone: HTMLElement | undefined;
  let foundDraggable = false;
  for (const el of els) {
    if (el === draggable) foundDraggable = true;
    if (dropzones.has(el)) dropZone = el;

    if (foundDraggable && dropZone !== undefined) break;
  }

  // this can happen if an element is bounded and can't be dragged over a dropzone
  if (!foundDraggable) return;

  if (dropZone === undefined) return onDragLeave(draggable);

  const prev = over.get(draggable);

  if (prev === undefined) onDragEnter(draggable, dropZone);
  else if (prev !== dropZone) {
    onDragLeave(draggable);
    onDragEnter(draggable, dropZone);
  }
}
