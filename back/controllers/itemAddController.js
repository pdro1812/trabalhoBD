  const express = require('express');
  const router = express.Router();
  const { pool } = require('../db');

  router.post('/', async (req, res) => {
    const { cod_categoria, nome_item, valor } = req.body;
    try {
      await pool.query(
        'INSERT INTO itemadicional (cod_categoria, nome_item, valor) VALUES ($1, $2, $3)',
        [cod_categoria, nome_item, valor]
      );
      res.sendStatus(200);
    } catch (err) {
      console.error(err);
      res.sendStatus(500);
    }
  });

  router.get('/', async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT i.id_item, i.nome_item, i.valor, c.nome AS categoria
        FROM itemadicional i
        JOIN categoria c ON i.cod_categoria = c.id_categoria
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
    const { nome_item, valor, cod_categoria } = req.body;
    try {
      await pool.query(
        `UPDATE itemadicional 
        SET nome_item = $1, valor = $2, cod_categoria = $3
        WHERE id_item = $4`,
        [nome_item, valor, cod_categoria, id]
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
      await pool.query('DELETE FROM itemadicional WHERE id_item = $1', [id]);
      res.sendStatus(200);
    } catch (err) {
      console.error(err);
      res.sendStatus(500);
    }
  });

  module.exports = router;
