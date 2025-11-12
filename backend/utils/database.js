const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: [],
});

module.exports = prisma;

