/**
 * AI features for the database engine.
 * These call the configured AI provider to generate summaries, tags, etc.
 */

/**
 * Generate an AI summary of a row's content.
 * @param {Object} row
 * @param {Object} [aiApi] - { query: (prompt) => Promise<string> }
 * @returns {Promise<string>}
 */
export async function generateAISummary(row, aiApi) {
  if (!aiApi?.query) return '(AI not configured)';
  try {
    const content = [row.name, ...(row.pageBlocks || []).map(b => b.text)].filter(Boolean).join('\n');
    if (!content.trim()) return '';
    const prompt = `Summarize this in one sentence:\n\n${content.slice(0, 2000)}`;
    return await aiApi.query(prompt);
  } catch {
    return '(AI error)';
  }
}

/**
 * Generate AI tags from row content.
 * @returns {Promise<string[]>}
 */
export async function generateAITags(row, aiApi) {
  if (!aiApi?.query) return [];
  try {
    const content = [row.name, ...(row.pageBlocks || []).map(b => b.text)].filter(Boolean).join('\n');
    if (!content.trim()) return [];
    const prompt = `Generate 3-5 short tags for this content. Return as comma-separated:\n\n${content.slice(0, 1000)}`;
    const result = await aiApi.query(prompt);
    return result.split(',').map(t => t.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Suggest priority level based on content analysis.
 * @returns {Promise<string>}
 */
export async function suggestPriority(row, aiApi) {
  if (!aiApi?.query) return 'Medium';
  try {
    const content = [row.name, ...(row.pageBlocks || []).map(b => b.text)].filter(Boolean).join('\n').slice(0, 500);
    const prompt = `Rate the priority of this task as one word: None, Low, Medium, High, or Urgent.\n\n${content}`;
    const result = await aiApi.query(prompt);
    const valid = ['None', 'Low', 'Medium', 'High', 'Urgent'];
    return valid.find(v => result.includes(v)) || 'Medium';
  } catch {
    return 'Medium';
  }
}

/**
 * Estimate time (in hours) for a task based on content.
 * @returns {Promise<number>}
 */
export async function estimateTime(row, aiApi) {
  if (!aiApi?.query) return 1;
  try {
    const content = [row.name, ...(row.pageBlocks || []).map(b => b.text)].filter(Boolean).join('\n').slice(0, 500);
    const prompt = `Estimate the time needed for this task in hours. Return only a number.\n\n${content}`;
    const result = await aiApi.query(prompt);
    const num = parseFloat(result);
    return isNaN(num) ? 1 : Math.max(0.5, num);
  } catch {
    return 1;
  }
}

/**
 * Compute a risk score (0-10) for a row.
 * @returns {Promise<number>}
 */
export async function computeRiskScore(row, aiApi) {
  if (!aiApi?.query) return 5;
  try {
    const content = [row.name, ...(row.pageBlocks || []).map(b => b.text)].filter(Boolean).join('\n').slice(0, 500);
    const prompt = `Rate the risk level of this task from 0 (lowest) to 10 (highest). Return only a number.\n\n${content}`;
    const result = await aiApi.query(prompt);
    const num = parseFloat(result);
    return isNaN(num) ? 5 : Math.max(0, Math.min(10, num));
  } catch {
    return 5;
  }
}

/**
 * Execute a natural language query against rows.
 * Example: "Show overdue tasks", "Tasks due this week"
 * @param {string} query
 * @param {Object[]} rows
 * @param {Object[]} properties
 * @returns {Promise<Object[]>} filtered/sorted rows
 */
export async function naturalLanguageQuery(query, rows, properties, aiApi) {
  if (!aiApi?.query) return rows;
  try {
    const propList = properties.map(p => `${p.name} (${p.id}, ${p.type})`).join(', ');
    const prompt = `Given these properties: ${propList}\n\nConvert this natural language query into a filter condition:\n"${query}"\n\nReturn only a JSON object with { propertyId, operator, value } or "ALL" if no filter applies.\nOperators: contains, equals, not-equals, greater-than, less-than, before, after, is-empty, is-not-empty`;

    const result = await aiApi.query(prompt);
    let filter;
    try { filter = JSON.parse(result); } catch { return rows; }

    if (filter === 'ALL' || !filter.propertyId) return rows;

    return rows.filter(row => {
      const cell = String(row[filter.propertyId] ?? '');
      switch (filter.operator) {
        case 'equals': return cell.toLowerCase() === (filter.value || '').toLowerCase();
        case 'contains': return cell.toLowerCase().includes((filter.value || '').toLowerCase());
        case 'greater-than': return Number(cell) > Number(filter.value);
        case 'less-than': return Number(cell) < Number(filter.value);
        case 'before': return new Date(cell) < new Date(filter.value);
        case 'after': return new Date(cell) > new Date(filter.value);
        case 'is-empty': return !cell.trim();
        case 'is-not-empty': return !!cell.trim();
        default: return true;
      }
    });
  } catch {
    return rows;
  }
}
