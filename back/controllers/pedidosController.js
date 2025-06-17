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

  // Criar um novo pedido
  router.post('/', async (req, res) => {
  // O frontend agora enviará um array 'itensAdicionais' com os IDs
  const { 
    id_pessoa, tipo_almoco, data, valor_total, categoria_cliente, 
    status_pagamento, id_administrador, itensAdicionais 
  } = req.body;

  const client = await pool.connect();

  try {
    await client.query('BEGIN'); // Inicia uma transação

    // 1. Insere o pedido principal e obtém o ID do novo pedido
    const pedidoResult = await client.query(
      `INSERT INTO pedidos (id_pessoa, tipo_almoco, data, valor_total, categoria_cliente, status_pagamento, id_administrador) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id_pedido`,
      [id_pessoa, tipo_almoco, data, valor_total, categoria_cliente, status_pagamento, id_administrador]
    );
    const id_pedido_novo = pedidoResult.rows[0].id_pedido;

    // 2. Se houver itens adicionais, insere cada um na tabela de ligação
    if (itensAdicionais && itensAdicionais.length > 0) {
      for (const id_item of itensAdicionais) {
        // Supondo que você tenha uma tabela 'pedidos_itens' com (id_pedido, id_item)
        await client.query(
          'INSERT INTO pedidos_itens (id_pedido, id_item) VALUES ($1, $2)',
          [id_pedido_novo, id_item]
        );
      }
    }

    await client.query('COMMIT'); // Confirma a transação
    res.status(201).json({ message: 'Pedido criado com sucesso!', id_pedido: id_pedido_novo });

  } catch (err) {
    await client.query('ROLLBACK'); // Desfaz a transação em caso de erro
    console.error(err);
    res.status(500).json({ message: 'Erro ao criar o pedido.' });
  } finally {
    client.release();
  }
});

  // Atualizar um pedido existente
  router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { 
      id_pessoa, 
      tipo_almoco, 
      data, 
      valor_total, 
      categoria_cliente, 
      status_pagamento, 
      id_administrador 
    } = req.body;
    
    try {
      const resultado = await pool.query(
        `UPDATE pedidos 
        SET id_pessoa = $1, tipo_almoco = $2, data = $3, valor_total = $4, categoria_cliente = $5, status_pagamento = $6, id_administrador = $7
        WHERE id_pedido = $8 
        RETURNING *`,
        [id_pessoa, tipo_almoco, data, valor_total, categoria_cliente, status_pagamento, id_administrador, id]
      );

      if (resultado.rowCount === 0) {
        return res.status(404).json({ erro: 'Pedido não encontrado.' });
      }
      
      res.json(resultado.rows[0]);
    } catch (err) {
      console.error('Erro ao atualizar pedido:', err);
      if (err.code === '23503') { 
        res.status(400).json({ erro: 'Pessoa ou administrador não encontrado.' });
      } else {
        res.status(500).json({ erro: 'Erro interno ao atualizar o pedido.' });
      }
    }
  });

  // Remover um pedido
  router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      
      // Primeiro remove os itens do pedido (se existirem)
      await client.query('DELETE FROM pedidos_itens WHERE id_pedido = $1', [id]);
      
      // Depois remove o pedido
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

  // Adicionar itens a um pedido
  router.post('/:id/itens', async (req, res) => {
    const { id } = req.params;
    const { itens } = req.body; // Esperado: array de objetos {id_item, quantidade}

    if (!itens || !Array.isArray(itens)) {
      return res.status(400).json({ erro: 'Campo itens deve ser um array.' });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Verifica se o pedido existe
      const pedidoExiste = await client.query('SELECT id_pedido FROM pedidos WHERE id_pedido = $1', [id]);
      if (pedidoExiste.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ erro: 'Pedido não encontrado.' });
      }

      // Remove itens existentes do pedido
      await client.query('DELETE FROM pedidos_itens WHERE id_pedido = $1', [id]);

      // Adiciona os novos itens
      for (const item of itens) {
        await client.query(
          'INSERT INTO pedidos_itens (id_pedido, id_item, quantidade) VALUES ($1, $2, $3)',
          [id, item.id_item, item.quantidade]
        );
      }

      await client.query('COMMIT');
      res.json({ mensagem: 'Itens adicionados com sucesso.' });
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

  module.exports = router;