import {
  draggable,
  moveTouch,
  moveMouse,
  endMouse,
  endTouch,
} from "./dragging/draggable.js";
import { dropzone } from "./dragging/dropzone.js";

document.addEventListener("touchmove", moveTouch);
document.addEventListener("mousemove", moveMouse);

document.addEventListener("touchend", endTouch);
document.addEventListener("touchcancel", endTouch);
document.addEventListener("mouseup", endMouse);

export { draggable, dropzone };
