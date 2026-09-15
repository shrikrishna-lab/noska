import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Check, 
  Play, 
  Clock, 
  Pencil, 
  Trash2, 
  X,
  Calendar,
  Sparkles,
  AlertCircle,
  Flag
} from 'lucide-react';
import { TactilePriorityPicker, TactileDuePicker, isTaskOverdue } from './TaskMetaPickers';
import './TactileTaskList.css';

export interface TaskItemData {
  id: string;
  title: string;
  subtitle?: string;
  due?: string;
  priority?: 'urgent' | 'high' | 'medium' | 'low';
  tag?: string;
  status: 'upcoming' | 'in-progress' | 'completed' | 'overdue';
  category?: 'purple' | 'green' | 'amber' | 'blue' | 'rose';
  completed?: boolean;
  time?: string;
  editedAt?: string | number;
  editedBy?: string;
}

export interface OnboardingStepData {
  id: string;
  title: string;
  subtitle?: string;
  due?: string;
  completed: boolean;
  editedAt?: string | number;
}

function formatEditedTime(ts?: string | number) {
  if (!ts) return null;
  const date = typeof ts === 'number' ? new Date(ts) : new Date(ts);
  return date.toLocaleString([], { 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit', 
    minute: '2-digit' 
  });
}

export interface TactileTaskListProps {
  tasks?: TaskItemData[];
  steps?: OnboardingStepData[];
  onToggleTask?: (id: string, completed: boolean) => void;
  onAddTask?: (taskData: Omit<TaskItemData, 'id'>) => void;
  onEditTask?: (id: string, updates: Partial<TaskItemData>) => void;
  onDeleteTask?: (id: string) => void;
  onToggleStep?: (id: string, completed: boolean) => void;
  onAddStep?: (stepData: Omit<OnboardingStepData, 'id'>) => void;
  onEditStep?: (id: string, updates: Partial<OnboardingStepData>) => void;
  onDeleteStep?: (id: string) => void;
  onRemoveTasksSection?: () => void;
  onRemoveGetStarted?: () => void;
  onDeleteBlock?: () => void;
  showTasksSection?: boolean;
  showOnboardingSection?: boolean;
}

export const TactileTaskList: React.FC<TactileTaskListProps> = ({
  tasks: propTasks,
  steps: propSteps,
  onToggleTask,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onToggleStep,
  onAddStep,
  onEditStep,
  onDeleteStep,
  onRemoveTasksSection,
  onRemoveGetStarted,
  onDeleteBlock,
  showTasksSection = true,
  showOnboardingSection = true,
}) => {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'overdue' | 'completed'>('upcoming');
  const [tasksList, setTasksList] = useState<TaskItemData[]>(propTasks ?? []);
  const [stepsList, setStepsList] = useState<OnboardingStepData[]>(propSteps ?? []);
  
  // Task form state
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSubtitle, setNewSubtitle] = useState('');
  const [newDue, setNewDue] = useState('');
  const [newPriority, setNewPriority] = useState<'urgent' | 'high' | 'medium' | 'low'>('medium');

  // Task inline edit state
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSubtitle, setEditSubtitle] = useState('');
  const [editDue, setEditDue] = useState('');
  const [editPriority, setEditPriority] = useState<'urgent' | 'high' | 'medium' | 'low'>('medium');

  // Step state
  const [isAddingStep, setIsAddingStep] = useState(false);
  const [newStepTitle, setNewStepTitle] = useState('');
  const [newStepSub, setNewStepSub] = useState('');
  const [newStepDue, setNewStepDue] = useState('');
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editStepTitle, setEditStepTitle] = useState('');
  const [editStepSub, setEditStepSub] = useState('');
  const [editStepDue, setEditStepDue] = useState('');
  const [hoveredStepId, setHoveredStepId] = useState<string | null>(null);

  React.useEffect(() => {
    if (propTasks !== undefined) {
      setTasksList(propTasks);
    }
  }, [propTasks]);

  React.useEffect(() => {
    if (propSteps !== undefined) {
      setStepsList(propSteps);
    }
  }, [propSteps]);

  const handleToggle = (id: string) => {
    setTasksList(prev =>
      prev.map(t => {
        if (t.id === id) {
          const nextCompleted = !t.completed;
          onToggleTask?.(id, nextCompleted);
          return {
            ...t,
            completed: nextCompleted,
            status: nextCompleted ? 'completed' : 'upcoming',
            category: nextCompleted ? 'purple' : t.category,
          };
        }
        return t;
      })
    );
  };

  const handleStepToggle = (id: string) => {
    setStepsList(prev =>
      prev.map(s => {
        if (s.id === id) {
          const nextCompleted = !s.completed;
          onToggleStep?.(id, nextCompleted);
          return { ...s, completed: nextCompleted };
        }
        return s;
      })
    );
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const taskData: Omit<TaskItemData, 'id'> = {
      title: newTitle.trim(),
      subtitle: newSubtitle.trim() || undefined,
      due: newDue.trim() || undefined,
      priority: newPriority,
      status: activeTab === 'completed' ? 'completed' : 'upcoming',
      category: activeTab === 'completed' ? 'purple' : activeTab === 'overdue' || newPriority === 'urgent' ? 'rose' : 'green',
      completed: activeTab === 'completed',
    };
    const newTask: TaskItemData = {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      ...taskData,
    };
    setTasksList(prev => [newTask, ...prev]);
    onAddTask?.(taskData);
    setNewTitle('');
    setNewSubtitle('');
    setNewDue('');
    setNewPriority('medium');
    setIsAdding(false);
  };

  const startEditTask = (task: TaskItemData, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTaskId(task.id);
    setEditTitle(task.title);
    setEditSubtitle(task.subtitle || '');
    setEditDue(task.due || '');
    setEditPriority(task.priority || 'medium');
  };

  const saveEditTask = (id: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim()) return;
    const now = Date.now();
    const updates: Partial<TaskItemData> = {
      title: editTitle.trim(),
      subtitle: editSubtitle.trim() || undefined,
      due: editDue.trim() || undefined,
      priority: editPriority,
      category: editPriority === 'urgent' ? 'rose' : undefined,
      editedAt: now,
    };
    setTasksList(prev =>
      prev.map(t => (t.id === id ? { ...t, ...updates } : t))
    );
    onEditTask?.(id, updates);
    setEditingTaskId(null);
  };

  const handleDeleteTaskItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTasksList(prev => prev.filter(t => t.id !== id));
    onDeleteTask?.(id);
  };

  const handleCreateStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStepTitle.trim()) return;
    const stepData: Omit<OnboardingStepData, 'id'> = {
      title: newStepTitle.trim(),
      subtitle: newStepSub.trim() || undefined,
      due: newStepDue.trim() || undefined,
      completed: false,
    };
    const newStep: OnboardingStepData = {
      id: `step-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      ...stepData,
    };
    setStepsList(prev => [...prev, newStep]);
    onAddStep?.(stepData);
    setNewStepTitle('');
    setNewStepSub('');
    setNewStepDue('');
    setIsAddingStep(false);
  };

  const saveEditStep = (id: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!editStepTitle.trim()) return;
    const now = Date.now();
    const updates: Partial<OnboardingStepData> = {
      title: editStepTitle.trim(),
      subtitle: editStepSub.trim() || undefined,
      due: editStepDue.trim() || undefined,
      editedAt: now,
    };
    setStepsList(prev =>
      prev.map(s => (s.id === id ? { ...s, ...updates } : s))
    );
    onEditStep?.(id, updates);
    setEditingStepId(null);
  };

  const handleDeleteStepItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setStepsList(prev => prev.filter(s => s.id !== id));
    onDeleteStep?.(id);
  };

  const filteredTasks = tasksList.filter(t => {
    const isOverdue = isTaskOverdue(t);
    if (activeTab === 'completed') return t.completed;
    if (activeTab === 'overdue') return isOverdue;
    return !t.completed && !isOverdue;
  });

  return (
    <div className="tactile-tasks-container">
      {/* ── CARD 1: My Tasks ── */}
      {showTasksSection && (
        <div className="tactile-card">
          {/* Header Tools Row */}
          <div className="tactile-header-tools">
            <h2 className="tactile-card-title">My Tasks</h2>
            <div className="flex items-center gap-1.5">
              {onRemoveTasksSection && (
                <button
                  type="button"
                  onClick={onRemoveTasksSection}
                  className="tactile-icon-btn"
                  title="Remove Section"
                >
                  <X size={15} />
                </button>
              )}
              {onDeleteBlock && (
                <button
                  type="button"
                  onClick={onDeleteBlock}
                  className="tactile-icon-btn danger"
                  title="Remove Block"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          </div>

        {/* Tab Switcher with Active Pill Underline Indicator */}
        <div className="tactile-tabs-row">
          {(['upcoming', 'overdue', 'completed'] as const).map(tab => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`tactile-tab-btn ${isActive ? 'active' : ''}`}
              >
                <span>{tab.charAt(0).toUpperCase() + tab.slice(1)}</span>
                {isActive && (
                  <motion.div
                    layoutId="tactile-tab-pill-indicator"
                    className="tactile-tab-pill-indicator"
                    transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Create Task Action with Timeline & Priority */}
        <div className="tactile-create-section">
          {isAdding ? (
            <form onSubmit={handleCreateTask} className="tactile-create-form flex-col items-stretch gap-2.5 p-3.5">
              <input
                type="text"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="What needs to be done?"
                autoFocus
                className="tactile-create-input font-medium"
              />
              <input
                type="text"
                value={newSubtitle}
                onChange={e => setNewSubtitle(e.target.value)}
                placeholder="Description / notes (optional)"
                className="tactile-create-input text-xs text-neutral-400"
              />
              <div className="flex items-center justify-between gap-3 pt-1 border-t border-black/[0.05] dark:border-white/[0.07] mt-1">
                <div className="flex items-center gap-2">
                  <TactileDuePicker
                    value={newDue}
                    onChange={setNewDue}
                  />
                  <TactilePriorityPicker
                    value={newPriority}
                    onChange={setNewPriority}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button type="submit" className="tactile-submit-btn">
                    Add Task
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="tactile-cancel-btn"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className="tactile-create-btn"
            >
              <div className="tactile-plus-circle">
                <Plus size={15} strokeWidth={2.4} />
              </div>
              <span className="tactile-create-label">Create Task</span>
            </button>
          )}
        </div>

        {/* Tasks List */}
        <div className="tactile-list">
          <AnimatePresence mode="popLayout" initial={false}>
            {filteredTasks.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="tactile-empty-hint"
              >
                <span>No {activeTab} tasks right now</span>
              </motion.div>
            ) : (
              filteredTasks.map(task => {
                const isPurple = task.completed || task.category === 'purple';
                const isGreen = !task.completed && (task.category === 'green' || !task.category);
                const isAmber = !task.completed && task.category === 'amber';
                const isRose = !task.completed && (task.category === 'rose' || task.priority === 'urgent');
                const isEditingThis = editingTaskId === task.id;

                if (isEditingThis) {
                  return (
                    <form
                      key={task.id}
                      onSubmit={(e) => saveEditTask(task.id, e)}
                      className="tactile-inline-edit-box my-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="Task title"
                        autoFocus
                        className="tactile-edit-input"
                      />
                      <input
                        type="text"
                        value={editSubtitle}
                        onChange={(e) => setEditSubtitle(e.target.value)}
                        placeholder="Description (optional)"
                        className="tactile-edit-subinput"
                      />
                      <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-black/[0.05] dark:border-white/[0.07]">
                        <div className="flex items-center gap-2">
                          <TactileDuePicker
                            value={editDue}
                            onChange={setEditDue}
                          />
                          <TactilePriorityPicker
                            value={editPriority}
                            onChange={setEditPriority}
                          />
                        </div>
                        <div className="tactile-edit-actions">
                          <button type="submit" className="tactile-submit-btn">
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingTaskId(null)}
                            className="tactile-cancel-btn"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </form>
                  );
                }

                return (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.22 }}
                    className="tactile-item-row group"
                    onClick={() => handleToggle(task.id)}
                  >
                    {/* Glowing Tactile Circular Badge */}
                    <div className="tactile-badge-wrapper">
                      {isPurple && (
                        <motion.div
                          whileTap={{ scale: 0.88 }}
                          className="tactile-circle-badge badge-purple"
                        >
                          <Check size={14} strokeWidth={3} className="text-purple-600" />
                        </motion.div>
                      )}

                      {isGreen && (
                        <motion.div
                          whileTap={{ scale: 0.88 }}
                          className="tactile-circle-badge badge-green"
                        >
                          <svg className="tactile-dashed-svg" viewBox="0 0 36 36">
                            <circle
                              cx="18"
                              cy="18"
                              r="15.5"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeDasharray="3 3.5"
                              className="text-emerald-500/70"
                            />
                          </svg>
                          <Check size={12} strokeWidth={2.8} className="text-emerald-600 relative z-10" />
                        </motion.div>
                      )}

                      {isAmber && (
                        <motion.div
                          whileTap={{ scale: 0.88 }}
                          className="tactile-circle-badge badge-amber"
                        >
                          <svg className="tactile-dashed-svg" viewBox="0 0 36 36">
                            <circle
                              cx="18"
                              cy="18"
                              r="15.5"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeDasharray="2.5 3"
                              className="text-amber-500/70"
                            />
                          </svg>
                          <Play size={11} strokeWidth={2.6} className="text-amber-600 ml-0.5 relative z-10 fill-amber-600/30" />
                        </motion.div>
                      )}

                      {isRose && (
                        <motion.div
                          whileTap={{ scale: 0.88 }}
                          className="tactile-circle-badge badge-rose"
                        >
                          <Clock size={13} strokeWidth={2.6} className="text-rose-600" />
                        </motion.div>
                      )}
                    </div>

                    {/* Task Title, Subtitle, Timeline/Due, & Badges */}
                    <div className="tactile-title-container">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`tactile-task-title ${isPurple ? 'completed-purple' : ''}`}>
                          {task.title}
                        </span>

                        {/* Priority Badge */}
                        {task.priority && task.priority !== 'medium' && (
                          <span className={`tactile-priority-badge ${task.priority}`}>
                            {task.priority === 'urgent' ? '🔥 Urgent' : task.priority}
                          </span>
                        )}

                        {/* Timeline / Due Date Badge */}
                        {task.due && (
                          <span className={`tactile-due-badge ${task.priority === 'urgent' ? 'overdue' : ''}`}>
                            <Calendar size={10} />
                            <span>{task.due}</span>
                          </span>
                        )}

                        {/* Edited Badge with Date/Time tooltip */}
                        {task.editedAt && (
                          <span 
                            className="tactile-edited-badge"
                            title={`Last edited: ${formatEditedTime(task.editedAt)}`}
                          >
                            <Clock size={10} />
                            <span>Edited</span>
                          </span>
                        )}
                      </div>

                      {task.subtitle && (
                        <p className="tactile-task-subtitle">{task.subtitle}</p>
                      )}
                    </div>

                    {/* Action Toolbar on Hover */}
                    <div className="tactile-actions-group">
                      <button
                        type="button"
                        onClick={(e) => startEditTask(task, e)}
                        className="tactile-icon-btn"
                        title="Edit task"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteTaskItem(task.id, e)}
                        className="tactile-icon-btn danger"
                        title="Delete task"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </div>
      )}

      {/* ── CARD 2: Get Started / Checklist (Independent & Custom) ── */}
      {showOnboardingSection && (
        <div className="tactile-card">
          <div className="tactile-header-tools">
            <div>
              <h3 className="tactile-card-title-sub">Get Started</h3>
              <p className="tactile-card-desc">Unlock the full potential of your workspace</p>
            </div>
            <div className="flex items-center gap-1.5">
              {onRemoveGetStarted && (
                <button
                  type="button"
                  onClick={onRemoveGetStarted}
                  className="tactile-icon-btn"
                  title="Remove Section"
                >
                  <X size={15} />
                </button>
              )}
              {onDeleteBlock && (
                <button
                  type="button"
                  onClick={onDeleteBlock}
                  className="tactile-icon-btn danger"
                  title="Remove Block"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          </div>

          <div className="tactile-step-list">
            {stepsList.map(step => {
              const isHovered = hoveredStepId === step.id;
              const isEditing = editingStepId === step.id;

              if (isEditing) {
                return (
                  <form
                    key={step.id}
                    onSubmit={(e) => saveEditStep(step.id, e)}
                    className="tactile-inline-edit-box my-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="text"
                      value={editStepTitle}
                      onChange={(e) => setEditStepTitle(e.target.value)}
                      placeholder="Step title"
                      autoFocus
                      className="tactile-edit-input"
                    />
                    <input
                      type="text"
                      value={editStepSub}
                      onChange={(e) => setEditStepSub(e.target.value)}
                      placeholder="Step description"
                      className="tactile-edit-subinput"
                    />
                    <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-black/[0.05] dark:border-white/[0.07]">
                      <input
                        type="text"
                        value={editStepDue}
                        onChange={(e) => setEditStepDue(e.target.value)}
                        placeholder="Timeline / Due date"
                        className="bg-black/[0.04] dark:bg-white/[0.06] rounded-lg px-2 py-1 text-xs text-neutral-700 dark:text-neutral-300 outline-none w-32"
                      />
                      <div className="tactile-edit-actions">
                        <button type="submit" className="tactile-submit-btn">
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingStepId(null)}
                          className="tactile-cancel-btn"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </form>
                );
              }

              return (
                <div
                  key={step.id}
                  onMouseEnter={() => setHoveredStepId(step.id)}
                  onClick={() => handleStepToggle(step.id)}
                  className={`tactile-step-item ${isHovered ? 'hovered' : ''}`}
                >
                  {/* Vertical left orange accent bar on hover/active */}
                  {isHovered && (
                    <motion.div
                      layoutId="tactile-left-accent-line"
                      className="tactile-step-accent-line"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}

                  {/* Circular Check / Inactive Indicator */}
                  <div className="tactile-step-indicator">
                    {step.completed ? (
                      <div className="tactile-dark-check-badge">
                        <Check size={13} strokeWidth={3} className="text-white" />
                      </div>
                    ) : (
                      <div className="tactile-step-empty-circle" />
                    )}
                  </div>

                  {/* Step Title, Subtitle, Due Date, & Badge */}
                  <div className="tactile-step-text-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`tactile-step-title ${step.completed ? 'completed-strike' : ''}`}>
                        {step.title}
                      </span>
                      {step.due && (
                        <span className="tactile-due-badge">
                          <Calendar size={9} />
                          <span>{step.due}</span>
                        </span>
                      )}
                      {step.editedAt && (
                        <span 
                          className="tactile-edited-badge"
                          title={`Last edited: ${formatEditedTime(step.editedAt)}`}
                        >
                          <Clock size={9} />
                          <span>Edited</span>
                        </span>
                      )}
                    </div>
                    {step.subtitle && (
                      <p className="tactile-step-subtitle">{step.subtitle}</p>
                    )}
                  </div>

                  {/* Step Edit & Delete Actions on Hover */}
                  <div className="tactile-actions-group">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingStepId(step.id);
                        setEditStepTitle(step.title);
                        setEditStepSub(step.subtitle || '');
                        setEditStepDue(step.due || '');
                      }}
                      className="tactile-icon-btn"
                      title="Edit step"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteStepItem(step.id, e)}
                      className="tactile-icon-btn danger"
                      title="Delete step"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Step Form / Button */}
          {isAddingStep ? (
            <form onSubmit={handleCreateStep} className="tactile-create-form flex-col items-stretch gap-2 p-3 mt-2">
              <input
                type="text"
                value={newStepTitle}
                onChange={e => setNewStepTitle(e.target.value)}
                placeholder="Step title"
                autoFocus
                className="tactile-create-input font-medium"
              />
              <input
                type="text"
                value={newStepSub}
                onChange={e => setNewStepSub(e.target.value)}
                placeholder="Step description / subtitle"
                className="tactile-create-input text-xs text-neutral-400"
              />
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-black/[0.05] dark:border-white/[0.07]">
                <input
                  type="text"
                  value={newStepDue}
                  onChange={e => setNewStepDue(e.target.value)}
                  placeholder="Timeline (e.g. Day 1)"
                  className="bg-black/[0.04] dark:bg-white/[0.06] rounded-lg px-2 py-1 text-xs text-neutral-700 dark:text-neutral-300 outline-none w-32"
                />
                <div className="flex items-center gap-2">
                  <button type="submit" className="tactile-submit-btn">
                    Add Step
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddingStep(false)}
                    className="tactile-cancel-btn"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setIsAddingStep(true)}
              className="tactile-add-step-btn"
            >
              <Plus size={14} />
              <span>Add Step</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default TactileTaskList;
