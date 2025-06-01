const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// Listar todos os valores
router.get('/', async (req, res) => {
  try {
    const resultado = await pool.query('SELECT * FROM valorespadroes ORDER BY data_vigencia DESC');
    res.json(resultado.rows);
  } catch (err) {
    console.error('Erro ao listar valores:', err);
    res.status(500).json({ erro: 'Erro interno.' });
  }
});

// Criar novo valor
router.post('/', async (req, res) => {
  const { data_vigencia, data_fim, valor_livre, valor_marmita, valor_kg } = req.body;

  try {
    const resultado = await pool.query(
      `INSERT INTO valorespadroes 
        (data_vigencia, data_fim, valor_livre, valor_marmita, valor_kg) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [data_vigencia, data_fim, valor_livre, valor_marmita, valor_kg]
    );
    res.status(201).json(resultado.rows[0]);
  } catch (err) {
    console.error('Erro ao inserir valor:', err);
    if (err.code === '23505') { // PostgreSQL - unique_violation
      res.status(400).json({ erro: 'Já existe um registro com essa data de vigência.' });
    } else {
      res.status(500).json({ erro: 'Erro interno.' });
    }
  }
});

// Atualizar valor
router.put('/:data_vigencia', async (req, res) => {
  const { data_vigencia } = req.params;
  const { data_fim, valor_livre, valor_marmita, valor_kg } = req.body;

  try {
    const resultado = await pool.query(
      `UPDATE valorespadroes 
       SET data_fim = $1, valor_livre = $2, valor_marmita = $3, valor_kg = $4 
       WHERE data_vigencia = $5 
       RETURNING *`,
      [data_fim, valor_livre, valor_marmita, valor_kg, data_vigencia]
    );
    if (resultado.rowCount === 0) return res.status(404).json({ erro: 'Valor não encontrado.' });
    res.json(resultado.rows[0]);
  } catch (err) {
    console.error('Erro ao atualizar valor:', err);
    res.status(500).json({ erro: 'Erro interno.' });
  }
});

// Remover valor
router.delete('/:data_vigencia', async (req, res) => {
  const { data_vigencia } = req.params;

  try {
    const resultado = await pool.query(
      'DELETE FROM valorespadroes WHERE data_vigencia = $1',
      [data_vigencia]
    );
    if (resultado.rowCount === 0) return res.status(404).json({ erro: 'Valor não encontrado.' });
    res.sendStatus(204);
  } catch (err) {
    console.error('Erro ao remover valor:', err);
    res.status(500).json({ erro: 'Erro interno.' });
  }
});

module.exports = router;
