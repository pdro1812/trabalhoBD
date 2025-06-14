const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// Listar todas as categorias
router.get('/', async (req, res) => {
  try {
    // Alterado: "categoria" para "categorias"
    const resultado = await pool.query('SELECT * FROM categorias ORDER BY id_categoria');
    res.json(resultado.rows);
  } catch (err) {
    console.error('Erro ao listar categorias:', err);
    res.status(500).json({ erro: 'Erro interno.' });
  }
});

// Criar nova categoria
router.post('/', async (req, res) => {
  const { nome } = req.body;

  try {
    // Alterado: "categoria" para "categorias"
    const resultado = await pool.query(
      'INSERT INTO categorias (nome) VALUES ($1) RETURNING *',
      [nome]
    );
    res.status(201).json(resultado.rows[0]);
  } catch (err) {
    console.error('Erro ao inserir categoria:', err);
    res.status(500).json({ erro: 'Erro interno.' });
  }
});

// Atualizar categoria
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { nome } = req.body;

  const idInt = parseInt(id, 10);
  if (isNaN(idInt)) {
    return res.status(400).json({ erro: 'ID inválido.' });
  }

  try {
    // Alterado: "categoria" para "categorias"
    const result = await pool.query(
      'UPDATE categorias SET nome = $1 WHERE id_categoria = $2 RETURNING *',
      [nome, idInt]
    );
    if (result.rowCount === 0) return res.status(404).json({ erro: 'Categoria não encontrada.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao editar categoria:', err);
    res.status(500).json({ erro: 'Erro interno.' });
  }
});
      

// Remover categoria
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Alterado: "categoria" para "categorias"
    const result = await pool.query('DELETE FROM categorias WHERE id_categoria = $1', [id]);
    if (result.rowCount === 0) return res.status(404).json({ erro: 'Categoria não encontrada.' });
    res.sendStatus(204);
  } catch (err) {
    console.error('Erro ao remover categoria:', err);
    res.status(500).json({ erro: 'Erro interno.' });
  }
});


module.exports = router;