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

module.exports = router;
