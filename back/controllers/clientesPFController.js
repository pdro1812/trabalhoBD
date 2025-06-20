const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// Listar todas as pessoas físicas
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        p.id_pessoa,
        p.nome,
        p.telefone,
        p.valor_devido,
        pf.cpf,
        e.id_pessoa AS id_empresa,
        pe.nome AS nome_empresa
      FROM pessoas_fisicas AS pf
      JOIN pessoas AS p ON pf.id_pessoa = p.id_pessoa
      LEFT JOIN empresas AS e ON pf.id_empresa = e.id_pessoa
      LEFT JOIN pessoas AS pe ON e.id_pessoa = pe.id_pessoa
      ORDER BY p.nome
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar pessoas físicas:', error);
    res.status(500).json({ erro: 'Erro interno ao buscar pessoas físicas.' });
  }
});


// NOVA ROTA: Buscar uma pessoa física específica pelo ID
router.get('/:id', async (req, res) => {
    const { id } = req.params; // Este 'id' é o id_pessoa da pessoa física
    try {
        const query = `
            SELECT
                pf.id_pessoa,             -- ID da Pessoa Física
                p_pf.nome AS nome,        -- Nome da Pessoa Física (da tabela 'pessoas')
                p_pf.telefone,            -- Telefone da Pessoa Física
                pf.cpf,                   -- CPF da Pessoa Física
                p_emp.nome AS empresa     -- Nome da empresa vinculada (se existir)
                p_emp.id_pessoa AS empresa_id     -- Nome da empresa vinculada (se existir)
            FROM
                pessoas_fisicas pf
            JOIN
                pessoas p_pf ON pf.id_pessoa = p_pf.id_pessoa -- Junta para pegar os dados da própria Pessoa Física
            LEFT JOIN                         -- Usamos LEFT JOIN para que pessoas sem empresa também sejam retornadas
                pessoas p_emp ON pf.id_empresa = p_emp.id_pessoa -- Junta com 'pessoas' para pegar o NOME da empresa vinculada
            WHERE
                pf.id_pessoa = $1;
        `;
        
        const result = await pool.query(query, [id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Cliente (Pessoa Física) não encontrado.' });
        }
        
        // Retorna o objeto cliente. Se não houver empresa, 'empresa' será null.
        res.json(result.rows[0]); 

    } catch (error) {
        console.error('Erro ao buscar cliente (Pessoa Física) detalhado:', error);
        res.status(500).json({ erro: 'Erro interno ao buscar o cliente.' });
    }
});


// Criar nova pessoa física
router.post('/', async (req, res) => {
  const { nome, cpf, telefone, id_empresa } = req.body;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const resultPessoa = await client.query(
      'INSERT INTO pessoas (nome, telefone, valor_devido) VALUES ($1, $2, 0) RETURNING id_pessoa',
      [nome, telefone]
    );
    const idPessoa = resultPessoa.rows[0].id_pessoa;

    await client.query(
      'INSERT INTO pessoas_fisicas (id_pessoa, id_empresa, cpf) VALUES ($1, $2, $3)',
      [idPessoa, id_empresa, cpf]
    );

    await client.query('COMMIT');

    res.status(201).json({ id_pessoa: idPessoa, nome, mensagem: 'Cliente PF criado com sucesso.' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao criar pessoa física:', error);

    if (error.code === '23503') {
      return res.status(400).json({ erro: 'A empresa informada não existe.' });
    }
    res.status(500).json({ erro: 'Erro interno ao criar cliente PF.' });
  } finally {
    client.release();
  }
});

// Atualizar pessoa física
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { nome, telefone, cpf, id_empresa } = req.body;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        await client.query(
            'UPDATE pessoas SET nome = $1, telefone = $2 WHERE id_pessoa = $3',
            [nome, telefone, id]
        );

        const resultFisica = await client.query(
            'UPDATE pessoas_fisicas SET cpf = $1, id_empresa = $2 WHERE id_pessoa = $3 RETURNING *',
            [cpf, id_empresa, id]
        );

        if (resultFisica.rowCount === 0) {
            throw new Error('Pessoa física não encontrada');
        }

        await client.query('COMMIT');
        res.json(resultFisica.rows[0]);

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erro ao atualizar pessoa física:', error);

        if (error.message === 'Pessoa física não encontrada') {
            return res.status(404).json({ erro: error.message });
        }
        if (error.code === '23503') {
            return res.status(400).json({ erro: 'A empresa informada não existe.' });
        }
        res.status(500).json({ erro: 'Erro interno ao atualizar cliente PF.' });
    } finally {
        client.release();
    }
});


// Deletar pessoa física
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query('DELETE FROM pessoas_fisicas WHERE id_pessoa = $1', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ erro: 'Cliente PF não encontrado.' });
    }

    await client.query('DELETE FROM pessoas WHERE id_pessoa = $1', [id]);

    await client.query('COMMIT');
    res.status(204).send();

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao deletar pessoa física:', error);
    
    if (error.code === '23503') {
        return res.status(409).json({ erro: 'Não é possível deletar. Cliente possui registros associados (pedidos, pagamentos, etc).' });
    }
    res.status(500).json({ erro: 'Erro interno ao deletar cliente PF.' });
  } finally {
    client.release();
  }
});

module.exports = router;