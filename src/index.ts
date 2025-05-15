import {
  draggable,
  moveTouch,
  moveMouse,
  endMouse,
  endTouch,
  isDragging,
  draggables,
} from "./dragging/draggable.js";
import { dropzone, onDrag, onDrop } from "./dragging/dropzone.js";

let lastTouchMove: TouchEvent | undefined;
let lastMouseMove: MouseEvent | undefined;

function onTouchMove(e: TouchEvent) {
  lastMouseMove = undefined;
  lastTouchMove = e;
  moveTouch(e);
  if (isDragging())
    for (const touch of e.touches)
      onDrag(
        document.elementsFromPoint(
          touch.clientX,
          touch.clientY
        ) as HTMLElement[]
      );
}

function onMouseMove(e: MouseEvent) {
  lastTouchMove = undefined;
  lastMouseMove = e;
  moveMouse(e);
  if (isDragging())
    onDrag(document.elementsFromPoint(e.clientX, e.clientY) as HTMLElement[]);
}

// export function replayLastMove() {
//   if (lastMouseMove === undefined) {
//     if (lastTouchMove === undefined) return;

//     onTouchMove(lastTouchMove);
//   } else onMouseMove(lastMouseMove);
// }

document.addEventListener("touchmove", onTouchMove);
document.addEventListener("touchend", (e) => {
  endTouch(e);
  for (const touch of e.changedTouches)
    onDrop(
      document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement
    );
});
document.addEventListener("touchcancel", (e) => {
  endTouch(e);
  for (const touch of e.changedTouches)
    onDrop(
      document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement
    );
});
document.addEventListener("mousemove", onMouseMove);
document.addEventListener("mouseup", (e) => {
  endMouse(e);
  onDrop(document.elementFromPoint(e.clientX, e.clientY) as HTMLElement);
});

export { draggable, dropzone };
