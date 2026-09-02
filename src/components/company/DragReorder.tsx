import React, { useState, useRef, useCallback } from "react"
import { motion } from "framer-motion"
import { GripVertical } from "lucide-react"

interface DragReorderProps {
  items: any[]
  onReorder: (items: any[]) => void
  renderItem: (item: any, index: number, dragHandle: React.ReactNode) => React.ReactNode
  keyExtractor: (item: any) => string
}

export function DragReorder({ items, onReorder, renderItem, keyExtractor }: DragReorderProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)
  const dragNode = useRef<HTMLDivElement>(null)

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = "move"
    // Set drag image
    if (dragNode.current) {
      e.dataTransfer.setDragImage(dragNode.current, 0, 0)
    }
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setOverIndex(index)
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === dropIndex) return

    const newItems = [...items]
    const draggedItem = newItems[draggedIndex]
    newItems.splice(draggedIndex, 1)
    newItems.splice(dropIndex, 0, draggedItem)
    onReorder(newItems)
    setDraggedIndex(null)
    setOverIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setOverIndex(null)
  }

  const dragHandle = (index: number) => (
    <div
      draggable
      onDragStart={e => handleDragStart(e, index)}
      onDragOver={e => handleDragOver(e, index)}
      onDrop={e => handleDrop(e, index)}
      onDragEnd={handleDragEnd}
      className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-[var(--surface-2)] text-[var(--muted)] transition"
    >
      <GripVertical size={12} />
    </div>
  )

  return (
    <div className="space-y-1">
      {items.map((item, index) => (
        <motion.div
          key={keyExtractor(item)}
          layout
          initial={{ opacity: 0 }}
          animate={{
            opacity: draggedIndex === index ? 0.5 : 1,
            scale: overIndex === index ? 1.02 : 1,
          }}
          transition={{ duration: 0.15 }}
          className={`transition-all ${
            overIndex === index && draggedIndex !== index
              ? "border-t-2 border-[var(--accent)]"
              : ""
          }`}
        >
          {renderItem(item, index, dragHandle(index))}
        </motion.div>
      ))}
    </div>
  )
}

// Simple sortable list component
interface SortableListProps {
  items: { id: string; label: string; icon?: React.ReactNode }[]
  onReorder: (ids: string[]) => void
}

export function SortableList({ items, onReorder }: SortableListProps) {
  const [list, setList] = useState(items)
  const dragItem = useRef<number | null>(null)
  const dragOverItem = useRef<number | null>(null)

  const handleDragStart = (index: number) => {
    dragItem.current = index
  }

  const handleDragEnter = (index: number) => {
    dragOverItem.current = index
  }

  const handleDragEnd = () => {
    if (dragItem.current === null || dragOverItem.current === null) return
    if (dragItem.current === dragOverItem.current) return

    const newList = [...list]
    const dragged = newList[dragItem.current]
    newList.splice(dragItem.current, 1)
    newList.splice(dragOverItem.current, 0, dragged)

    dragItem.current = null
    dragOverItem.current = null

    setList(newList)
    onReorder(newList.map(i => i.id))
  }

  return (
    <div className="space-y-0.5">
      {list.map((item, index) => (
        <div
          key={item.id}
          draggable
          onDragStart={() => handleDragStart(index)}
          onDragEnter={() => handleDragEnter(index)}
          onDragEnd={handleDragEnd}
          onDragOver={e => e.preventDefault()}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)]/30 cursor-grab active:cursor-grabbing transition group"
        >
          <GripVertical size={12} className="text-[var(--muted)] opacity-0 group-hover:opacity-100 transition" />
          {item.icon && <span className="text-sm">{item.icon}</span>}
          <span className="text-[12px] text-[var(--text)]">{item.label}</span>
        </div>
      ))}
    </div>
  )
}
