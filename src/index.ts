import {
  draggable,
  moveTouch,
  moveMouse,
  endMouse,
  endTouch,
} from "./dragging/draggable.js";

document.addEventListener("touchmove", moveTouch);
document.addEventListener("touchend", endTouch);
document.addEventListener("touchcancel", endTouch);
document.addEventListener("mousemove", moveMouse);
document.addEventListener("mouseup", endMouse);

export { draggable };
