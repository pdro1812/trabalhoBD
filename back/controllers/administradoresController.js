// administradoresController.js
const express = require('express');
const router = express.Router();
const { pool } = require('../db'); // Certifique-se de que o caminho para db.js está correto
const bcrypt = require('bcrypt'); // Importa a biblioteca bcrypt para hash de senhas

const saltRounds = 10; // Número de rounds para o hashing da senha

// Listar todos os administradores
router.get('/', async (req, res) => {
  try {
    const resultado = await pool.query('SELECT cpf, nome, email FROM administradores ORDER BY nome ASC');
    res.json(resultado.rows);
  } catch (err) {
    console.error('Erro ao listar administradores:', err);
    res.status(500).json({ erro: 'Erro interno do servidor ao listar administradores.' });
  }
});

// Obter um administrador por CPF
router.get('/:cpf', async (req, res) => {
  const { cpf } = req.params;
  try {
    const resultado = await pool.query('SELECT cpf, nome, email FROM administradores WHERE cpf = $1', [cpf]);
    if (resultado.rowCount === 0) {
      return res.status(404).json({ erro: 'Administrador não encontrado.' });
    }
    res.json(resultado.rows[0]);
  } catch (err) {
    console.error('Erro ao buscar administrador por CPF:', err);
    res.status(500).json({ erro: 'Erro interno do servidor ao buscar administrador.' });
  }
});

// Criar novo administrador
router.post('/', async (req, res) => {
  const { cpf, nome, email, senha } = req.body;

  // Verifica se todos os campos obrigatórios foram fornecidos
  if (!cpf || !nome || !email || !senha) {
    return res.status(400).json({ erro: 'Todos os campos (CPF, nome, email, senha) são obrigatórios.' });
  }

  try {
    // Gera o hash da senha antes de armazenar no banco de dados
    const senhaHash = await bcrypt.hash(senha, saltRounds);

    const resultado = await pool.query(
      `INSERT INTO administradores
        (cpf, nome, email, senha)
       VALUES ($1, $2, $3, $4)
       RETURNING cpf, nome, email`, // Retorna apenas dados não sensíveis
      [cpf, nome, email, senhaHash]
    );
    res.status(201).json(resultado.rows[0]);
  } catch (err) {
    console.error('Erro ao inserir administrador:', err);
    if (err.code === '23505') { // PostgreSQL - unique_violation (CPF já existe)
      res.status(400).json({ erro: 'Já existe um administrador com este CPF.' });
    } else {
      res.status(500).json({ erro: 'Erro interno do servidor ao criar administrador.' });
    }
  }
});

// Atualizar administrador
router.put('/:cpf', async (req, res) => {
  const { cpf } = req.params;
  const { nome, email, senha } = req.body;

  let query = 'UPDATE administradores SET ';
  const params = [];
  let paramIndex = 1;
  const updates = [];

  if (nome !== undefined) {
    updates.push(`nome = $${paramIndex++}`);
    params.push(nome);
  }
  if (email !== undefined) {
    updates.push(`email = $${paramIndex++}`);
    params.push(email);
  }
  if (senha !== undefined) {
    // Gera o hash da nova senha se ela for fornecida
    const senhaHash = await bcrypt.hash(senha, saltRounds);
    updates.push(`senha = $${paramIndex++}`);
    params.push(senhaHash);
  }

  if (updates.length === 0) {
    return res.status(400).json({ erro: 'Nenhum campo para atualizar foi fornecido.' });
  }

  query += updates.join(', ') + ` WHERE cpf = $${paramIndex} RETURNING cpf, nome, email`;
  params.push(cpf);

  try {
    const resultado = await pool.query(query, params);
    if (resultado.rowCount === 0) {
      return res.status(404).json({ erro: 'Administrador não encontrado.' });
    }
    res.json(resultado.rows[0]);
  } catch (err) {
    console.error('Erro ao atualizar administrador:', err);
    res.status(500).json({ erro: 'Erro interno do servidor ao atualizar administrador.' });
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
    res.sendStatus(204); // Resposta de sucesso sem conteúdo
  } catch (err) {
    console.error('Erro ao remover administrador:', err);
    res.status(500).json({ erro: 'Erro interno do servidor ao remover administrador.' });
  }
});

module.exports = router;
