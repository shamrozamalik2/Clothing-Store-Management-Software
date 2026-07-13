'use strict';

const { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } = require('../config/constants');

function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, parseInt(query.limit, 10) || DEFAULT_PAGE_SIZE)
  );
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

function buildPaginationMeta(total, page, limit) {
  const totalPages = Math.ceil(total / limit);
  return {
    total,
    page,
    limit,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

module.exports = { parsePagination, buildPaginationMeta };
