import type { KeyboardCoordinateGetter } from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";

// Move between lanes even when adjacent lanes have no cards at the current height.
export function laneKeyboardCoordinates(
  lanes: string[],
): KeyboardCoordinateGetter {
  return (event, args) => {
    if (event.code !== "ArrowRight" && event.code !== "ArrowLeft")
      return sortableKeyboardCoordinates(event, args);
    const { context, currentCoordinates } = args;
    const current =
      context.over?.data.current?.columnId ||
      context.over?.data.current?.lane ||
      context.over?.id;
    const index = lanes.indexOf(String(current));
    const target = lanes[index + (event.code === "ArrowRight" ? 1 : -1)];
    const rect = target ? context.droppableRects.get(target) : undefined;
    if (!rect || !context.collisionRect) return;
    event.preventDefault();
    return {
      x: currentCoordinates.x + rect.left - context.collisionRect.left + 12,
      y: currentCoordinates.y + rect.top - context.collisionRect.top + 55,
    };
  };
}
