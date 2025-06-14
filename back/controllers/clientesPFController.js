const express = require('express');
const router = express.Router();
const { pool } = require('../db');

// Listar todas as pessoas físicas
router.get('/', async (req, res) => {
  try {
    /*
      Lógica de busca corrigida:
      - Traz os dados da pessoa física (p.*, pf.cpf).
      - Junta com a tabela de empresa (via pessoas_fisicas.id_empresa).
      - Junta uma segunda vez com a tabela pessoas (pe.*) para pegar o NOME da empresa.
    */
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

// Criar nova pessoa física
router.post('/', async (req, res) => {
  // Usar id_empresa para clareza
  const { nome, cpf, telefone, id_empresa } = req.body;
  
  // Cliente do pool para usar em uma transação
  const client = await pool.connect();

  try {
    // Inicia a transação
    await client.query('BEGIN');

    // 1. Inserir na tabela 'pessoas' para criar a identidade base.
    // O valor_devido inicial é 0.
    const resultPessoa = await client.query(
      'INSERT INTO pessoas (nome, telefone, valor_devido) VALUES ($1, $2, 0) RETURNING id_pessoa',
      [nome, telefone]
    );
    const idPessoa = resultPessoa.rows[0].id_pessoa;

    // 2. Inserir na tabela 'pessoas_fisicas' para especializar como PF e vincular à empresa.
    // A verificação de existência da empresa é feita pelo próprio DB via Foreign Key.
    await client.query(
      'INSERT INTO pessoas_fisicas (id_pessoa, id_empresa, cpf) VALUES ($1, $2, $3)',
      [idPessoa, id_empresa, cpf]
    );

    // Se tudo deu certo, confirma a transação
    await client.query('COMMIT');

    res.status(201).json({ id_pessoa: idPessoa, nome, mensagem: 'Cliente PF criado com sucesso.' });
  } catch (error) {
    // Se algo deu errado, desfaz a transação
    await client.query('ROLLBACK');
    console.error('Erro ao criar pessoa física:', error);

    // Erro de violação de chave estrangeira (ex: id_empresa não existe)
    if (error.code === '23503') {
      return res.status(400).json({ erro: 'A empresa informada não existe.' });
    }
    res.status(500).json({ erro: 'Erro interno ao criar cliente PF.' });
  } finally {
    // Libera o cliente de volta para o pool
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

        // 1. Atualiza os dados na tabela 'pessoas'
        await client.query(
            'UPDATE pessoas SET nome = $1, telefone = $2 WHERE id_pessoa = $3',
            [nome, telefone, id]
        );

        // 2. Atualiza os dados na tabela 'pessoas_fisicas'
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

    // 1. Deletar da tabela 'pessoas_fisicas' primeiro.
    const result = await client.query('DELETE FROM pessoas_fisicas WHERE id_pessoa = $1', [id]);

    // Se não encontrou ninguém em 'pessoas_fisicas', não é um PF ou já foi deletado.
    if (result.rowCount === 0) {
      return res.status(404).json({ erro: 'Cliente PF não encontrado.' });
    }

    // 2. Deletar da tabela 'pessoas'.
    // ATENÇÃO: Isso pode falhar se houver pedidos ou pagamentos vinculados a essa pessoa.
    // O ideal seria ter uma lógica para tratar esses casos (ex: arquivar em vez de deletar).
    await client.query('DELETE FROM pessoas WHERE id_pessoa = $1', [id]);

    await client.query('COMMIT');
    res.status(204).send(); // Status 204 No Content para sucesso em deleção

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao deletar pessoa física:', error);
    
    // Erro de violação de FK (ex: tem pedidos associados)
    if (error.code === '23503') {
        return res.status(409).json({ erro: 'Não é possível deletar. Cliente possui registros associados (pedidos, pagamentos, etc).' });
    }
    res.status(500).json({ erro: 'Erro interno ao deletar cliente PF.' });
  } finally {
    client.release();
  }
});

module.exports = router;