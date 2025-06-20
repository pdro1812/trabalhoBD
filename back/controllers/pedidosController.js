const express = require('express');
const router = express.Router();
const { pool } = require('../db'); // Certifique-se que o caminho para seu arquivo de conexão com o banco está correto

// Listar todos os pedidos
router.get('/', async (req, res) => {
  try {
    // Query para selecionar todos os pedidos, ordenados pela data mais recente
    const resultado = await pool.query('SELECT * FROM pedidos ORDER BY data DESC, id_pedido DESC');
    res.json(resultado.rows);
  } catch (err) {
    console.error('Erro ao listar pedidos:', err);
    res.status(500).json({ erro: 'Erro interno ao buscar os pedidos.' });
  }
});

// Listar todos os pedidos com todos os detalhes (pessoas, administrador e itens)
router.get('/completos', async (req, res) => {
  try {
    const query = `
      SELECT 
        p.id_pedido,
        p.id_pessoa,
        pe.nome as nome_pessoa,
        pe.telefone,
        p.tipo_almoco,
        p.data,
        p.valor_total,
        p.categoria_cliente,
        p.status_pagamento,
        p.id_administrador,
        a.nome as nome_administrador,
        COALESCE(
          (SELECT json_agg(json_build_object(
              'id_item', ia.id_item,
              'nome_item', ia.nome_item,
              'valor', ia.valor,
              'quantidade', pi.quantidade
            ))
            FROM pedidos_itens pi
            JOIN itens_adicionais ia ON pi.id_item = ia.id_item
            WHERE pi.id_pedido = p.id_pedido
          ), '[]'::json
        ) as itens
      FROM 
        pedidos p
      LEFT JOIN 
        pessoas pe ON p.id_pessoa = pe.id_pessoa
      LEFT JOIN 
        administradores a ON p.id_administrador = a.cpf
      ORDER BY 
        p.data DESC, p.id_pedido DESC;
    `;
    
    const resultado = await pool.query(query);
    res.json(resultado.rows);

  } catch (err) {
    console.error('Erro ao listar pedidos completos:', err);
    res.status(500).json({ erro: 'Erro interno ao buscar os pedidos completos.' });
  }
});

// Buscar pedidos detalhados com informações das pessoas
router.get('/detalhados', async (req, res) => {
  try {
    const resultado = await pool.query(`
      SELECT 
        p.id_pedido,
        p.id_pessoa,
        pe.nome as nome_pessoa,
        pe.telefone,
        p.tipo_almoco,
        p.data,
        p.valor_total,
        p.categoria_cliente,
        p.status_pagamento,
        p.id_administrador,
        a.nome as nome_administrador
      FROM pedidos p
      LEFT JOIN pessoas pe ON p.id_pessoa = pe.id_pessoa
      LEFT JOIN administradores a ON p.id_administrador = a.cpf
      ORDER BY p.data DESC, p.id_pedido DESC
    `);
    res.json(resultado.rows);
  } catch (err) {
    console.error('Erro ao listar pedidos detalhados:', err);
    res.status(500).json({ erro: 'Erro interno ao buscar os pedidos detalhados.' });
  }
});

// Buscar um pedido específico pelo ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const resultado = await pool.query('SELECT * FROM pedidos WHERE id_pedido = $1', [id]);
    if (resultado.rowCount === 0) {
      return res.status(404).json({ erro: 'Pedido não encontrado.' });
    }
    res.json(resultado.rows[0]);
  } catch (err) {
    console.error('Erro ao buscar pedido:', err);
    res.status(500).json({ erro: 'Erro interno ao buscar o pedido.' });
  }
});

// Criar um novo pedido
router.post('/', async (req, res) => {
  const { 
    id_pessoa, tipo_almoco, data, valor_total, categoria_cliente, 
    status_pagamento, id_administrador, itensAdicionais 
  } = req.body;

  if (!id_pessoa || !tipo_almoco || !data || valor_total === undefined) {
    return res.status(400).json({ message: 'Campos obrigatórios estão faltando.' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const pedidoResult = await client.query(
      `INSERT INTO pedidos (id_pessoa, tipo_almoco, data, valor_total, categoria_cliente, status_pagamento, id_administrador) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id_pedido`,
      [id_pessoa, tipo_almoco, data, valor_total, categoria_cliente, status_pagamento, id_administrador]
    );
    const id_pedido_novo = pedidoResult.rows[0].id_pedido;

    if (itensAdicionais && Array.isArray(itensAdicionais) && itensAdicionais.length > 0) {
      for (const item of itensAdicionais) {
        if (item.id_item && item.quantidade > 0) {
            await client.query(
             'INSERT INTO pedidos_itens (id_pedido, id_item, quantidade) VALUES ($1, $2, $3)',
             [id_pedido_novo, item.id_item, item.quantidade]
           );
        }
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ message: 'Pedido criado com sucesso!', id_pedido: id_pedido_novo });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro ao criar o pedido:', err);
    if (err.code === '23503') {
        res.status(400).json({ message: 'Erro: Um dos itens adicionais não existe.' });
    } else {
        res.status(500).json({ message: 'Erro interno ao criar o pedido.' });
    }
  } finally {
    client.release();
  }
});

// Remover um pedido
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    
    await client.query('DELETE FROM pedidos_itens WHERE id_pedido = $1', [id]);
    
    const resultado = await client.query('DELETE FROM pedidos WHERE id_pedido = $1', [id]);
    
    if (resultado.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ erro: 'Pedido não encontrado.' });
    }
    
    await client.query('COMMIT');
    res.sendStatus(204); 
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro ao remover pedido:', err);
    res.status(500).json({ erro: 'Erro interno ao remover o pedido.' });
  } finally {
    client.release();
  }
});

// Adicionar ou substituir TODOS os itens de um pedido
router.post('/:id/itens', async (req, res) => {
  const { id } = req.params;
  const { itens } = req.body; // Esperado: array de objetos {id_item, quantidade}

  if (!itens || !Array.isArray(itens)) {
    return res.status(400).json({ erro: 'Campo itens deve ser um array.' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const pedidoExiste = await client.query('SELECT id_pedido FROM pedidos WHERE id_pedido = $1', [id]);
    if (pedidoExiste.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ erro: 'Pedido não encontrado.' });
    }

    await client.query('DELETE FROM pedidos_itens WHERE id_pedido = $1', [id]);

    for (const item of itens) {
      await client.query(
        'INSERT INTO pedidos_itens (id_pedido, id_item, quantidade) VALUES ($1, $2, $3)',
        [id, item.id_item, item.quantidade]
      );
    }

    await client.query('COMMIT');
    res.json({ mensagem: 'Itens adicionados/substituídos com sucesso.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro ao adicionar itens ao pedido:', err);
    if (err.code === '23503') {
      res.status(400).json({ erro: 'Item não encontrado.' });
    } else {
      res.status(500).json({ erro: 'Erro interno ao adicionar itens.' });
    }
  } finally {
    client.release();
  }
});

// Buscar itens de um pedido
router.get('/:id/itens', async (req, res) => {
  const { id } = req.params;
  
  try {
    const resultado = await pool.query(`
      SELECT 
        pi.id_pedido,
        pi.id_item,
        ia.nome_item,
        ia.valor,
        pi.quantidade,
        (ia.valor * pi.quantidade) as valor_total_item
      FROM pedidos_itens pi
      JOIN itens_adicionais ia ON pi.id_item = ia.id_item
      WHERE pi.id_pedido = $1
    `, [id]);
    
    res.json(resultado.rows);
  } catch (err) {
    console.error('Erro ao buscar itens do pedido:', err);
    res.status(500).json({ erro: 'Erro interno ao buscar itens do pedido.' });
  }
});

// ==================================================================
// ==                    NOVAS FUNCIONALIDADES                     ==
// ==================================================================

/**
 * @route   PATCH /:id_pedido/itens/:id_item
 * @desc    Atualizar a quantidade de um item adicional específico em um pedido
 * @access  Private
 * @body    { "quantidade": number }
 */
router.patch('/:id_pedido/itens/:id_item', async (req, res) => {
    const { id_pedido, id_item } = req.params;
    const { quantidade } = req.body;

    // Validação
    if (!quantidade || isNaN(quantidade) || Number(quantidade) <= 0) {
        return res.status(400).json({ erro: 'A quantidade é obrigatória e deve ser um número maior que zero.' });
    }

    try {
        const resultado = await pool.query(
            'UPDATE pedidos_itens SET quantidade = $1 WHERE id_pedido = $2 AND id_item = $3',
            [quantidade, id_pedido, id_item]
        );

        if (resultado.rowCount === 0) {
            return res.status(404).json({ erro: 'Item não encontrado neste pedido.' });
        }

        res.json({ mensagem: 'Quantidade do item atualizada com sucesso.' });
    } catch (err) {
        console.error('Erro ao atualizar quantidade do item:', err);
        res.status(500).json({ erro: 'Erro interno ao atualizar a quantidade do item.' });
    }
});

/**
 * @route   DELETE /:id_pedido/itens/:id_item
 * @desc    Remover um item adicional específico de um pedido
 * @access  Private
 */
router.delete('/:id_pedido/itens/:id_item', async (req, res) => {
    const { id_pedido, id_item } = req.params;

    try {
        const resultado = await pool.query(
            'DELETE FROM pedidos_itens WHERE id_pedido = $1 AND id_item = $2',
            [id_pedido, id_item]
        );

        if (resultado.rowCount === 0) {
            return res.status(404).json({ erro: 'Item não encontrado neste pedido para remoção.' });
        }

        res.status(200).json({ mensagem: 'Item removido do pedido com sucesso.' });
    } catch (err) {
        console.error('Erro ao remover item do pedido:', err);
        res.status(500).json({ erro: 'Erro interno ao remover o item do pedido.' });
    }
});


module.exports = router;