
const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// Criar pagamento
router.post('/', async (req, res) => {
  // Alterado: trocado "cod_pessoa" por "id_pessoa" para bater com o schema
  const { id_pessoa, valor_pago, data, forma } = req.body;
  try {
    // Alterado: "Pagamento" para "pagamentos" e "cod_pessoa" para "id_pessoa"
    await pool.query(
      'INSERT INTO pagamentos (id_pessoa, valor_pago, data, forma) VALUES ($1, $2, $3, $4)',
      [id_pessoa, valor_pago, data, forma]
    );
    res.sendStatus(201); // Alterado para 201 Created, que é mais apropriado
  } catch (err) {
    console.error('Erro ao criar pagamento:', err);
    res.status(500).json({ erro: 'Erro interno.' });
  }
});

// Listar todos os clientes para o select
router.get('/clientes', async (req, res) => {
  try {
    // Alterado: "pessoa" para "pessoas"
    const result = await pool.query(`
      SELECT id_pessoa, nome
      FROM pessoas
      ORDER BY nome
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao listar clientes:', err);
    res.status(500).json({ erro: 'Erro interno.' });
  }
});

// Listar todos os pagamentos
router.get('/', async (req, res) => {
  try {
    // Alterado: "Pagamento" para "pagamentos", "pessoa" para "pessoas" e "cod_pessoa" para "id_pessoa"
    const result = await pool.query(`
      SELECT p.id_pagamento, p.id_pessoa, p.valor_pago, p.data, p.forma,
             pe.nome AS nome_pessoa
      FROM pagamentos p
      JOIN pessoas pe ON p.id_pessoa = pe.id_pessoa
      ORDER BY p.data DESC, p.id_pagamento DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao listar pagamentos:', err);
    res.status(500).json({ erro: 'Erro interno.' });
  }
});

// Listar pagamentos por cliente
router.get('/cliente/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Alterado: "Pagamento" para "pagamentos", "pessoa" para "pessoas" e "cod_pessoa" para "id_pessoa"
    const result = await pool.query(`
      SELECT p.id_pagamento, p.id_pessoa, p.valor_pago, p.data, p.forma,
             pe.nome AS nome_pessoa
      FROM pagamentos p
      JOIN pessoas pe ON p.id_pessoa = pe.id_pessoa
      WHERE p.id_pessoa = $1
      ORDER BY p.data DESC, p.id_pagamento DESC
    `, [id]);
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao listar pagamentos do cliente:', err);
    res.status(500).json({ erro: 'Erro interno.' });
  }
});

// Atualizar pagamento
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  // Alterado: "cod_pessoa" para "id_pessoa"
  const { id_pessoa, valor_pago, data, forma } = req.body;
  try {
    // Alterado: "Pagamento" para "pagamentos" e "cod_pessoa" para "id_pessoa"
    const resultado = await pool.query(
      `UPDATE pagamentos 
       SET id_pessoa = $1, valor_pago = $2, data = $3, forma = $4
       WHERE id_pagamento = $5
       RETURNING *`, // Adicionado RETURNING para confirmar a atualização
      [id_pessoa, valor_pago, data, forma, id]
    );
    if (resultado.rowCount === 0) return res.status(404).json({ erro: 'Pagamento não encontrado.' });
    res.json(resultado.rows[0]);
  } catch (err) {
    console.error('Erro ao atualizar pagamento:', err);
    res.status(500).json({ erro: 'Erro interno.' });
  }
});

// Deletar pagamento
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Alterado: "Pagamento" para "pagamentos"
    const resultado = await pool.query('DELETE FROM pagamentos WHERE id_pagamento = $1', [id]);
    if (resultado.rowCount === 0) return res.status(404).json({ erro: 'Pagamento não encontrado.' });
    res.sendStatus(204); // Alterado para 204 No Content, mais apropriado para DELETE
  } catch (err) {
    console.error('Erro ao deletar pagamento:', err);
    res.status(500).json({ erro: 'Erro interno.' });
  }
});

module.exports = router;
