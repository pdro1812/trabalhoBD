const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// Listar todas as empresas (PJ)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        p.id_pessoa,
        p.nome,
        p.telefone,
        e.cnpj,
        e.valor_livre,
        e.valor_marmita,
        e.valor_kg
      FROM pessoas AS p
      JOIN empresas AS e ON p.id_pessoa = e.id_pessoa
      ORDER BY p.nome
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar empresas:', error);
    res.status(500).json({ erro: 'Erro interno ao listar empresas.' });
  }
});

// Criar nova empresa (PJ)
router.post('/', async (req, res) => {
  const { nome, cnpj, telefone, valor_livre, valor_marmita, valor_kg } = req.body;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const pessoaResult = await client.query(
      'INSERT INTO pessoas (nome, telefone) VALUES ($1, $2) RETURNING id_pessoa',
      [nome, telefone]
    );
    const idPessoa = pessoaResult.rows[0].id_pessoa;

    await client.query(
      'INSERT INTO empresas (id_pessoa, cnpj, valor_livre, valor_marmita, valor_kg) VALUES ($1, $2, $3, $4, $5)',
      [idPessoa, cnpj, valor_livre, valor_marmita, valor_kg]
    );
    
    await client.query('COMMIT');
    res.status(201).json({ id_pessoa: idPessoa, nome, mensagem: 'Empresa criada com sucesso!' });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao criar empresa:', error);
    res.status(500).json({ erro: 'Erro interno ao criar empresa.' });
  } finally {
    client.release();
  }
});

// Atualizar empresa (PJ)
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { nome, cnpj, telefone, valor_livre, valor_marmita, valor_kg } = req.body;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const pessoaResult = await client.query(
      'UPDATE pessoas SET nome = $1, telefone = $2 WHERE id_pessoa = $3 RETURNING *',
      [nome, telefone, id]
    );
    
    if (pessoaResult.rowCount === 0) {
      throw new Error('Empresa não encontrada.');
    }

    await client.query(
      'UPDATE empresas SET cnpj = $1, valor_livre = $2, valor_marmita = $3, valor_kg = $4 WHERE id_pessoa = $5',
      [cnpj, valor_livre, valor_marmita, valor_kg, id]
    );

    await client.query('COMMIT');
    res.json({ message: 'Empresa atualizada com sucesso!', ...pessoaResult.rows[0] });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao atualizar empresa:', error);
    if (error.message === 'Empresa não encontrada.') {
        return res.status(404).json({ erro: error.message });
    }
    res.status(500).json({ erro: 'Erro interno ao atualizar empresa.' });
  } finally {
    client.release();
  }
});

// Deletar empresa (PJ)
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const empresaResult = await client.query('DELETE FROM empresas WHERE id_pessoa = $1', [id]);
    
    if (empresaResult.rowCount === 0) {
      return res.status(404).json({ erro: 'Empresa não encontrada.' });
    }

    await client.query('DELETE FROM pessoas WHERE id_pessoa = $1', [id]);

    await client.query('COMMIT');
    res.status(204).send();

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao deletar empresa:', error);
    if (error.code === '23503') {
        return res.status(409).json({ erro: 'Não é possível deletar. Empresa possui funcionários vinculados.' });
    }
    res.status(500).json({ erro: 'Erro interno ao deletar empresa.' });
  } finally {
    client.release();
  }
});

module.exports = router;
