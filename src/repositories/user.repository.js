const db = require('../config/database');

class UserRepository {
  async findByEmail(email) {
    const sql = `SELECT * FROM users WHERE email = ? LIMIT 1`;
    const [rows] = await db.query(sql, [email]);
    return rows[0] || null;
  }

  async findByUsername(username) {
    const sql = `SELECT * FROM users WHERE username = ? LIMIT 1`;
    const [rows] = await db.query(sql, [username]);
    return rows[0] || null;
  }

  async findById(id) {
    const sql = `SELECT id, username, email, role, status, created_at, updated_at FROM users WHERE id = ? LIMIT 1`;
    const [rows] = await db.query(sql, [id]);
    return rows[0] || null;
  }

  async create(user) {
    const sql = `
      INSERT INTO users (username, email, password_hash, role, status)
      VALUES (?, ?, ?, ?, ?)
    `;
    const params = [
      user.username,
      user.email,
      user.password_hash,
      user.role || 'viewer',
      user.status || 'active',
    ];
    const [result] = await db.query(sql, params);
    return result.insertId;
  }

  async storeRefreshToken(userId, tokenHash, expiresAt) {
    const sql = `
      INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
      VALUES (?, ?, ?)
    `;
    await db.query(sql, [userId, tokenHash, expiresAt]);
  }

  async findRefreshToken(tokenHash) {
    const sql = `
      SELECT * FROM refresh_tokens
      WHERE token_hash = ? AND revoked_at IS NULL AND expires_at > NOW(3)
      LIMIT 1
    `;
    const [rows] = await db.query(sql, [tokenHash]);
    return rows[0] || null;
  }

  async revokeRefreshToken(tokenHash) {
    const sql = `UPDATE refresh_tokens SET revoked_at = NOW(3) WHERE token_hash = ?`;
    await db.query(sql, [tokenHash]);
  }

  async findAll({ offset, limit, whereClause, sortClause }) {
    const countSql = `SELECT COUNT(*) as total FROM users ${whereClause.sql}`;
    const [countRows] = await db.query(countSql, whereClause.params);
    const total = countRows[0]?.total || 0;

    const dataSql = `
      SELECT id, username, email, role, status, created_at, updated_at
      FROM users
      ${whereClause.sql}
      ${sortClause}
      LIMIT ? OFFSET ?
    `;
    const [rows] = await db.query(dataSql, [...whereClause.params, limit, offset]);

    return { total, rows };
  }
}

module.exports = new UserRepository();
