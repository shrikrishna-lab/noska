/**
 * @typedef {"text"|"number"|"checkbox"|"date"|"select"|"multi-select"|"status"|"priority"|"person"|"relation"|"rollup"|"formula"|"url"|"email"|"phone"|"files"|"created-time"|"updated-time"|"created-by"|"updated-by"|"ai-summary"|"ai-tags"|"estimated-time"|"risk-score"} PropertyType
 */

/**
 * @typedef {Object} PropertyDefinition
 * @property {string} id
 * @property {string} name
 * @property {PropertyType} type
 * @property {string[]} [options] — select/multi-select options
 * @property {Object} [formula] — formula config
 * @property {string} [formula.expression]
 * @property {Object} [rollup] — rollup config
 * @property {string} [rollup.relationPropertyId]
 * @property {string} [rollup.targetPropertyId]
 * @property {"count"|"sum"|"avg"|"min"|"max"|"percent"} [rollup.function]
 * @property {Object} [relation] — relation config
 * @property {string} [relation.databaseId]
 * @property {"one-to-one"|"one-to-many"|"many-to-many"} [relation.type]
 * @property {boolean} [computed] — auto-set by system
 * @property {*} [defaultValue]
 */

/**
 * @typedef {Object} FilterCondition
 * @property {string} property
 * @property {"contains"|"not-contains"|"equals"|"not-equals"|"starts-with"|"ends-with"|"is-empty"|"is-not-empty"|"greater-than"|"less-than"|"between"|"before"|"after"|"is"|"is-before"|"is-after"|"is-checked"|"is-unchecked"} operator
 * @property {string} value
 */

/**
 * @typedef {Object} FilterConfig — spec-style flat filters
 * @property {"and"|"or"} operator
 * @property {Array<{ columnId: string, condition: string, value?: string }>} conditions
 */

/**
 * @typedef {Object} SortConfig — spec-style sort entry
 * @property {string} columnId
 * @property {"ascending"|"descending"} direction
 */

/**
 * @typedef {Object} FilterGroup
 * @property {"and"|"or"} op
 * @property {FilterCondition[]} conditions
 * @property {FilterGroup[]} groups
 */

/**
 * @typedef {Object} ViewDefinition
 * @property {string} id
 * @property {"table"|"board"|"calendar"|"timeline"|"gallery"|"list"|"graph"|"mind-map"} type
 * @property {string} name
 * @property {string} [sort] — legacy single sort property
 * @property {boolean} [sortAsc] — legacy sort direction
 * @property {string} [filter] — legacy filter string
 * @property {FilterGroup} [filterGroup] — legacy nested filter group
 * @property {FilterConfig} [filters] — spec-style flat filters (Phase 4)
 * @property {SortConfig[]} [sorts] — spec-style sort array (Phase 4)
 * @property {string} [groupBy] — property id for board grouping
 * @property {string[]} [hiddenProperties]
 * @property {number} [columnWidths] — map of property id to width
 * @property {Object} [layout] — view-specific layout options
 */

/**
 * @typedef {Object} DatabaseRow
 * @property {string} id
 * @property {string} name
 * @property {string} [icon]
 * @property {string} [cover]
 * @property {Object.<string, *>} [props] — dynamic property values keyed by property id
 * @property {Array<{id:string, type:string, text:string}>} [pageBlocks]
 * @property {string} [createdAt]
 * @property {string} [updatedAt]
 * @property {string} [createdBy]
 * @property {string} [updatedBy]
 */

/**
 * @typedef {Object} DatabaseSchema
 * @property {PropertyDefinition[]} properties
 * @property {ViewDefinition[]} views
 * @property {DatabaseRow[]} rows
 * @property {string} activeViewId
 */

export const PROPERTY_TYPES = {
  text:        { id: 'text',        label: 'Text',        icon: 'Aa',      category: 'basic' },
  number:      { id: 'number',      label: 'Number',      icon: '#',       category: 'basic' },
  checkbox:    { id: 'checkbox',    label: 'Checkbox',    icon: '☑',       category: 'basic' },
  date:        { id: 'date',        label: 'Date',        icon: '📅',       category: 'basic' },
  select:      { id: 'select',      label: 'Select',      icon: '▼',       category: 'basic' },
  'multi-select': { id: 'multi-select', label: 'Multi Select', icon: '🏷', category: 'basic' },
  status:      { id: 'status',      label: 'Status',      icon: '⚙',       category: 'advanced' },
  priority:    { id: 'priority',    label: 'Priority',    icon: '⚡',       category: 'advanced' },
  person:      { id: 'person',      label: 'Person',      icon: '👤',       category: 'advanced' },
  relation:    { id: 'relation',    label: 'Relation',    icon: '🔗',       category: 'advanced' },
  rollup:      { id: 'rollup',      label: 'Rollup',      icon: '📊',       category: 'advanced' },
  formula:     { id: 'formula',     label: 'Formula',     icon: '𝑓',        category: 'advanced' },
  url:         { id: 'url',         label: 'URL',          icon: '🔗',       category: 'basic' },
  email:       { id: 'email',       label: 'Email',       icon: '✉',       category: 'basic' },
  phone:       { id: 'phone',       label: 'Phone',       icon: '📞',       category: 'basic' },
  files:       { id: 'files',       label: 'Files',       icon: '📎',       category: 'advanced' },
  'created-time': { id: 'created-time', label: 'Created Time', icon: '⏰', category: 'auto' },
  'updated-time': { id: 'updated-time', label: 'Updated Time', icon: '🕐', category: 'auto' },
  'created-by':   { id: 'created-by',   label: 'Created By',   icon: '👤', category: 'auto' },
  'updated-by':   { id: 'updated-by',   label: 'Updated By',   icon: '👥', category: 'auto' },
  'ai-summary':   { id: 'ai-summary',   label: 'AI Summary',   icon: '🤖', category: 'ai' },
  'ai-tags':      { id: 'ai-tags',      label: 'AI Tags',     icon: '🏷', category: 'ai' },
  'estimated-time': { id: 'estimated-time', label: 'Estimated Time', icon: '⏱', category: 'ai' },
  'risk-score':    { id: 'risk-score',   label: 'Risk Score',   icon: '⚠', category: 'ai' },
};

export const DEFAULT_STATUS_OPTIONS = ['Not started', 'In progress', 'Done', 'Blocked'];
export const DEFAULT_PRIORITY_OPTIONS = ['None', 'Low', 'Medium', 'High', 'Urgent'];

export const VIEW_TYPES = [
  { id: 'table',    label: 'Table',    icon: '⊞' },
  { id: 'board',    label: 'Board',    icon: '⊟' },
  { id: 'calendar', label: 'Calendar', icon: '📅' },
  { id: 'timeline', label: 'Timeline', icon: '📈' },
  { id: 'gallery',  label: 'Gallery',  icon: '🖼' },
  { id: 'list',     label: 'List',     icon: '☰' },
  { id: 'graph',    label: 'Graph',    icon: '⚹' },
  { id: 'mind-map', label: 'Mind Map', icon: '🧠' },
];
