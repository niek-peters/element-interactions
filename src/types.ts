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
  startScroll: Position;
  /** Left, Top, Right, Bottom */
  translationBounds?: [number, number, number, number];
  fixed: boolean;
};
