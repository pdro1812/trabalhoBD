const express = require('express');
const router = express.Router();
const { pool } = require('../db');

router.post('/', async (req, res) => {
  // Alterado: "cod_categoria" para "id_categoria"
  const { id_categoria, nome_item, valor } = req.body;
  try {
    // Alterado: "itemadicional" para "itens_adicionais" e "cod_categoria" para "id_categoria"
    await pool.query(
      'INSERT INTO itens_adicionais (id_categoria, nome_item, valor) VALUES ($1, $2, $3)',
      [id_categoria, nome_item, valor]
    );
    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

router.get('/', async (req, res) => {
  try {
    // Alterado: "itemadicional" para "itens_adicionais", "categoria" para "categorias" e "cod_categoria" para "id_categoria"
    const result = await pool.query(`
      SELECT i.id_item, i.nome_item, i.valor, c.nome AS categoria
      FROM itens_adicionais i
      JOIN categorias c ON i.id_categoria = c.id_categoria
      ORDER BY i.id_item
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  // Alterado: "cod_categoria" para "id_categoria"
  const { nome_item, valor, id_categoria } = req.body;
  try {
    // Alterado: "itemadicional" para "itens_adicionais" e "cod_categoria" para "id_categoria"
    await pool.query(
      `UPDATE itens_adicionais 
       SET nome_item = $1, valor = $2, id_categoria = $3
       WHERE id_item = $4`,
      [nome_item, valor, id_categoria, id]
    );
    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Alterado: "itemadicional" para "itens_adicionais"
    await pool.query('DELETE FROM itens_adicionais WHERE id_item = $1', [id]);
    res.sendStatus(200);
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

module.exports = router;