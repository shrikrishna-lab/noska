/**
 * WidgetGrid — responsive 4-column dashboard grid with drag-to-reorder
 * (@dnd-kit, handle-restricted so clicks/scroll never conflict).
 */
import React, { useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AnimatePresence } from "framer-motion";
import { useWidgetEngine } from "../engine";
import { getWidgetDefinition } from "../registry";
import { WidgetFrame, SIZE_CLASS } from "./WidgetFrame";
import type { WidgetInstance, WidgetRuntimeContext } from "../types";

function SortableWidget({
  instance,
  ctx,
  onConfigure,
}: {
  instance: WidgetInstance;
  ctx: WidgetRuntimeContext;
  onConfigure: (instanceId: string, config: Record<string, unknown>) => void;
}) {
  const definition = getWidgetDefinition(instance.widgetId);
  const { removeWidget, resizeWidget } = useWidgetEngine();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: instance.id,
    disabled: !definition,
  });

  if (!definition) return null;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={SIZE_CLASS[instance.size]}
    >
      <WidgetFrame
        definition={definition}
        instance={instance}
        ctx={ctx}
        dragging={isDragging}
        dragHandleProps={{ ...attributes, ...listeners }}
        onRemove={() => removeWidget(instance.id)}
        onResize={(size) => resizeWidget(instance.id, size)}
        onConfigure={
          definition.configSchema?.length
            ? (config) => onConfigure(instance.id, config)
            : undefined
        }
      />
    </div>
  );
}

export function WidgetGrid({
  widgets,
  ctx,
  onConfigure,
}: {
  widgets: WidgetInstance[];
  ctx: WidgetRuntimeContext;
  onConfigure: (instanceId: string, config: Record<string, unknown>) => void;
}) {
  const { reorderWidgets } = useWidgetEngine();
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragStart = (event: DragStartEvent) => setActiveId(String(event.active.id));
  const onDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    reorderWidgets(String(active.id), String(over.id));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <SortableContext items={widgets.map((w) => w.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <AnimatePresence mode="popLayout">
            {widgets.map((instance) => (
              <SortableWidget key={instance.id} instance={instance} ctx={ctx} onConfigure={onConfigure} />
            ))}
          </AnimatePresence>
        </div>
      </SortableContext>
    </DndContext>
  );
}
