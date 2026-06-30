/**
 * Database templates — pre-built property and view configurations.
 */

const TEMPLATES = {
  task: {
    name: 'Task',
    icon: '✅',
    properties: [
      { id: 'name', name: 'Task', type: 'text' },
      { id: 'status', name: 'Status', type: 'status', options: ['Not started', 'In progress', 'Done', 'Blocked'] },
      { id: 'priority', name: 'Priority', type: 'priority', options: ['None', 'Low', 'Medium', 'High', 'Urgent'] },
      { id: 'assignee', name: 'Assignee', type: 'person' },
      { id: 'dueDate', name: 'Due Date', type: 'date' },
      { id: 'estimatedTime', name: 'Estimated Time', type: 'estimated-time' },
    ],
    views: [
      { id: 'table-view', type: 'table', name: 'Table', sort: 'priority', sortAsc: false },
      { id: 'board-view', type: 'board', name: 'Board', groupBy: 'status', sort: 'priority', sortAsc: false },
      { id: 'calendar-view', type: 'calendar', name: 'Calendar', sort: 'dueDate', sortAsc: true },
    ],
  },

  meeting: {
    name: 'Meeting',
    icon: '📅',
    properties: [
      { id: 'name', name: 'Meeting', type: 'text' },
      { id: 'date', name: 'Date', type: 'date' },
      { id: 'attendees', name: 'Attendees', type: 'multi-select' },
      { id: 'status', name: 'Status', type: 'status', options: ['Scheduled', 'In progress', 'Completed', 'Cancelled'] },
      { id: 'notes', name: 'Notes', type: 'text' },
    ],
    views: [
      { id: 'table-view', type: 'table', name: 'Table', sort: 'date', sortAsc: true },
      { id: 'calendar-view', type: 'calendar', name: 'Calendar', sort: 'date', sortAsc: true },
    ],
  },

  project: {
    name: 'Project',
    icon: '🚀',
    properties: [
      { id: 'name', name: 'Project', type: 'text' },
      { id: 'status', name: 'Status', type: 'status', options: ['Planning', 'Active', 'On hold', 'Completed', 'Cancelled'] },
      { id: 'owner', name: 'Owner', type: 'person' },
      { id: 'startDate', name: 'Start Date', type: 'date' },
      { id: 'endDate', name: 'End Date', type: 'date' },
      { id: 'priority', name: 'Priority', type: 'priority' },
    ],
    views: [
      { id: 'table-view', type: 'table', name: 'Table', sort: 'priority', sortAsc: false },
      { id: 'board-view', type: 'board', name: 'Board', groupBy: 'status', sort: 'priority', sortAsc: false },
      { id: 'timeline-view', type: 'timeline', name: 'Timeline', sort: 'startDate', sortAsc: true },
    ],
  },

  crm: {
    name: 'CRM',
    icon: '👥',
    properties: [
      { id: 'name', name: 'Contact', type: 'text' },
      { id: 'company', name: 'Company', type: 'text' },
      { id: 'email', name: 'Email', type: 'email' },
      { id: 'phone', name: 'Phone', type: 'phone' },
      { id: 'status', name: 'Stage', type: 'status', options: ['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Closed won', 'Closed lost'] },
      { id: 'value', name: 'Deal Value', type: 'number' },
    ],
    views: [
      { id: 'table-view', type: 'table', name: 'Table', sort: 'value', sortAsc: false },
      { id: 'board-view', type: 'board', name: 'Kanban', groupBy: 'status', sort: 'value', sortAsc: false },
    ],
  },

  bug: {
    name: 'Bug Report',
    icon: '🐛',
    properties: [
      { id: 'name', name: 'Bug', type: 'text' },
      { id: 'severity', name: 'Severity', type: 'select', options: ['Critical', 'High', 'Medium', 'Low'] },
      { id: 'status', name: 'Status', type: 'status', options: ['Reported', 'Triaged', 'In progress', 'Fixed', 'Verified', 'Closed'] },
      { id: 'assignee', name: 'Assignee', type: 'person' },
      { id: 'environment', name: 'Environment', type: 'select', options: ['Production', 'Staging', 'Development'] },
      { id: 'reportedDate', name: 'Reported', type: 'date' },
    ],
    views: [
      { id: 'table-view', type: 'table', name: 'Table', sort: 'severity', sortAsc: false },
      { id: 'board-view', type: 'board', name: 'Board', groupBy: 'status', sort: 'severity', sortAsc: false },
    ],
  },

  docs: {
    name: 'Documentation',
    icon: '📚',
    properties: [
      { id: 'name', name: 'Page', type: 'text' },
      { id: 'category', name: 'Category', type: 'select', options: ['Getting Started', 'Guides', 'API', 'Reference', 'Tutorial'] },
      { id: 'status', name: 'Status', type: 'status', options: ['Draft', 'Review', 'Published', 'Archived'] },
      { id: 'owner', name: 'Owner', type: 'person' },
      { id: 'tags', name: 'Tags', type: 'multi-select' },
      { id: 'lastEdited', name: 'Last Edited', type: 'updated-time' },
    ],
    views: [
      { id: 'table-view', type: 'table', name: 'Table', sort: 'lastEdited', sortAsc: false },
      { id: 'gallery-view', type: 'gallery', name: 'Gallery', sort: 'name', sortAsc: true },
    ],
  },
};

export function getTemplates() {
  return Object.entries(TEMPLATES).map(([id, t]) => ({ id, ...t }));
}

export function getTemplate(id) {
  return TEMPLATES[id] || null;
}

export function applyTemplate(templateId, existingDb = null) {
  const tmpl = TEMPLATES[templateId];
  if (!tmpl) return existingDb;

  const db = existingDb || { properties: [], views: [], rows: [], activeViewId: '' };
  return {
    ...db,
    properties: [...tmpl.properties],
    views: tmpl.views.map(v => ({
      ...v,
      id: v.id + '-' + Date.now().toString(36),
    })),
    activeViewId: db.activeViewId || tmpl.views[0]?.id || 'table-view',
  };
}
