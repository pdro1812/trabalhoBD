// administradoresController.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs'); // For password hashing
const { pool } = require('../db'); // Adjust path if db.js is in a different directory

// Listar todos os administradores (sem a senha)
router.get('/', async (req, res) => {
  try {
    const resultado = await pool.query('SELECT nome, cpf, email FROM administradores ORDER BY nome ASC');
    res.json(resultado.rows);
  } catch (err) {
    console.error('Erro ao listar administradores:', err);
    res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
});

// Obter um administrador por CPF (sem a senha)
router.get('/:cpf', async (req, res) => {
  const { cpf } = req.params;
  try {
    const resultado = await pool.query('SELECT nome, cpf, email FROM administradores WHERE cpf = $1', [cpf]);
    if (resultado.rowCount === 0) {
      return res.status(404).json({ erro: 'Administrador não encontrado.' });
    }
    res.json(resultado.rows[0]);
  } catch (err) {
    console.error('Erro ao buscar administrador por CPF:', err);
    res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
});

// Criar novo administrador
router.post('/', async (req, res) => {
  const { nome, cpf, email, senha } = req.body;

  // Validate required fields
  if (!nome || !cpf || !email || !senha) {
    return res.status(400).json({ erro: 'Nome, CPF, Email e Senha são obrigatórios.' });
  }

  // Basic CPF format validation (only numbers for consistency with DB schema)
  if (!/^\d{11}$/.test(cpf)) {
    return res.status(400).json({ erro: 'CPF deve conter 11 dígitos numéricos.' });
  }

  try {
    // Hash da senha
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(senha, salt);

    const resultado = await pool.query(
      `INSERT INTO administradores
        (nome, cpf, email, senha)
       VALUES ($1, $2, $3, $4)
       RETURNING nome, cpf, email`, // Retorne apenas dados seguros
      [nome, cpf, email, hashedPassword]
    );
    res.status(201).json(resultado.rows[0]);
  } catch (err) {
    console.error('Erro ao inserir administrador:', err);
    if (err.code === '23505') { // PostgreSQL unique_violation
      res.status(409).json({ erro: 'Já existe um administrador com este CPF.' });
    } else {
      res.status(500).json({ erro: 'Erro interno do servidor.' });
    }
  }
});

// Atualizar administrador
router.put('/:cpf', async (req, res) => {
  const { cpf } = req.params;
  const { nome, email, senha } = req.body; // Senha é opcional para atualização

  // Build query dynamically for optional password update
  let query = 'UPDATE administradores SET nome = $1, email = $2';
  let values = [nome, email];
  let paramIndex = 3;

  if (senha) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(senha, salt);
    query += `, senha = $${paramIndex}`;
    values.push(hashedPassword);
    paramIndex++;
  }

  query += ` WHERE cpf = $${paramIndex} RETURNING nome, cpf, email`;
  values.push(cpf);

  try {
    const resultado = await pool.query(query, values);

    if (resultado.rowCount === 0) {
      return res.status(404).json({ erro: 'Administrador não encontrado.' });
    }
    res.json(resultado.rows[0]);
  } catch (err) {
    console.error('Erro ao atualizar administrador:', err);
    res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
});

// Remover administrador
router.delete('/:cpf', async (req, res) => {
  const { cpf } = req.params;
  try {
    const resultado = await pool.query(
      'DELETE FROM administradores WHERE cpf = $1',
      [cpf]
    );
    if (resultado.rowCount === 0) {
      return res.status(404).json({ erro: 'Administrador não encontrado.' });
    }
    res.sendStatus(204); // No Content
  } catch (err) {
    console.error('Erro ao remover administrador:', err);
    res.status(500).json({ erro: 'Erro interno do servidor.' });
  }
});

module.exports = router;
