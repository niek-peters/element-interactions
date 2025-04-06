import {
  draggable,
  moveTouch,
  moveMouse,
  endMouse,
  endTouch,
  isDragging,
} from "./dragging/draggable.js";
import { dropzone, onDrag, onDrop } from "./dragging/dropzone.js";

document.addEventListener("touchmove", (e) => {
  moveTouch(e);
  if (isDragging())
    for (const touch of e.touches)
      onDrag(
        document.elementsFromPoint(
          touch.clientX,
          touch.clientY
        ) as HTMLElement[]
      );
});
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
document.addEventListener("mousemove", (e) => {
  moveMouse(e);
  if (isDragging())
    onDrag(document.elementsFromPoint(e.clientX, e.clientY) as HTMLElement[]);
});
document.addEventListener("mouseup", (e) => {
  endMouse(e);
  onDrop(document.elementFromPoint(e.clientX, e.clientY) as HTMLElement);
});

export { draggable, dropzone };
