// db.js
const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'restaurante',
  password: 'postgres',
  port: 5432,
});

async function validarConexao() {
  try {
    await pool.query('SELECT 1');
    console.log('Conexão com o PostgreSQL estabelecida com sucesso!');
  } catch (error) {
    console.error('Erro ao conectar no PostgreSQL:', error);
    process.exit(1);
  }
}

module.exports = { pool, validarConexao };
