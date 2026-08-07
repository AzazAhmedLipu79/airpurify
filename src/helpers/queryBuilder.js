function buildWhereClause(conditions = [], allowedFields = {}) {
  const whereParts = [];
  const params = [];

  for (const [key, value] of Object.entries(conditions)) {
    if (value === undefined || value === null || value === '') continue;

    const column = allowedFields[key];
    if (!column) continue;

    if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      if (value.gte !== undefined) {
        whereParts.push(`${column} >= ?`);
        params.push(value.gte);
      }
      if (value.lte !== undefined) {
        whereParts.push(`${column} <= ?`);
        params.push(value.lte);
      }
      if (value.like !== undefined) {
        whereParts.push(`${column} LIKE ?`);
        params.push(`%${value.like}%`);
      }
    } else if (Array.isArray(value)) {
      if (value.length > 0) {
        const placeholders = value.map(() => '?').join(', ');
        whereParts.push(`${column} IN (${placeholders})`);
        params.push(...value);
      }
    } else {
      whereParts.push(`${column} = ?`);
      params.push(value);
    }
  }

  const sql = whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '';
  return { sql, params };
}

function buildSortClause(sortParam, allowedSortFields = {}, defaultSort = 'id DESC') {
  if (!sortParam) return `ORDER BY ${defaultSort}`;

  const parts = sortParam.split(',').map((part) => part.trim());
  const sortClauses = [];

  for (const part of parts) {
    const isDesc = part.startsWith('-');
    const fieldName = isDesc ? part.substring(1) : part;
    const column = allowedSortFields[fieldName];

    if (column) {
      sortClauses.push(`${column} ${isDesc ? 'DESC' : 'ASC'}`);
    }
  }

  return sortClauses.length > 0 ? `ORDER BY ${sortClauses.join(', ')}` : `ORDER BY ${defaultSort}`;
}

module.exports = {
  buildWhereClause,
  buildSortClause,
};
