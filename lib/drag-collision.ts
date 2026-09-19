import {
  closestCorners,
  pointerWithin,
  type CollisionDetection,
} from "@dnd-kit/core";

// Prefer the card under the pointer; otherwise use the containing lane.
// Keyboard dragging has no pointer, so it uses the translated card's corners.
export const boardCollision: CollisionDetection = (args) => {
  if (!args.pointerCoordinates) return closestCorners(args);
  const hits = pointerWithin(args);
  const card = hits.find(
    (hit) =>
      args.droppableContainers.find((c) => c.id === hit.id)?.data.current
        ?.sortable,
  );
  return card ? [card] : hits;
};
