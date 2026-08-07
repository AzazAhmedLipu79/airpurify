const userRepository = require('../repositories/user.repository');
const { parsePagination, buildPaginationMeta } = require('../helpers/pagination');
const { buildWhereClause, buildSortClause } = require('../helpers/queryBuilder');
const { NotFoundError } = require('../utils/errors');

class UserService {
  async getUserById(id) {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new NotFoundError(`User with ID ${id} not found`);
    }
    return user;
  }

  async getAllUsers(queryParams) {
    const { page, limit, offset } = parsePagination(queryParams);

    const allowedFields = {
      role: 'role',
      status: 'status',
      search: 'username',
    };

    const conditions = {
      role: queryParams.role,
      status: queryParams.status,
    };

    if (queryParams.search) {
      conditions.search = { like: queryParams.search };
    }

    const whereClause = buildWhereClause(conditions, allowedFields);
    const sortClause = buildSortClause(queryParams.sort, {
      id: 'id',
      username: 'username',
      created_at: 'created_at',
    }, 'id DESC');

    const { total, rows } = await userRepository.findAll({ offset, limit, whereClause, sortClause });
    const pagination = buildPaginationMeta(total, page, limit);

    return { users: rows, pagination };
  }
}

module.exports = new UserService();
