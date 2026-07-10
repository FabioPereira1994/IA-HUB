const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 12;

function hashPassword(senha) {
  return bcrypt.hash(senha, SALT_ROUNDS);
}

function comparePassword(senha, hash) {
  return bcrypt.compare(senha, hash);
}

module.exports = { hashPassword, comparePassword };
