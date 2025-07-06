const express = require('express');
const router = express.Router();
const { pool } = require('../db'); // Mantendo seu padrão de importação

/**
 * ROTA: GET /api/dividas/ativas/pf
 * OBJETIVO: Retornar Pessoas Físicas (sem empresa) com débitos.
 * LÓGICA ATUALIZADA:
 * 1. Junta 'pedidos' com 'pessoas' para obter o nome do devedor.
 * 2. Filtra pedidos onde 'status_pagamento' é 'pendente' E 'categoria_cliente' é NULO.
 */
router.get('/ativas/pf', async (req, res) => {
  try {
    const query = `
      SELECT
          p.id_pessoa,
          p.nome,
          SUM(ped.valor_total) AS valor_total_devido
      FROM pedidos ped
      JOIN pessoas p ON ped.id_pessoa = p.id_pessoa
      WHERE
          ped.status_pagamento = 'Pendente' AND ped.categoria_cliente IS NULL
      GROUP BY
          p.id_pessoa, p.nome
      ORDER BY
          p.nome;
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao buscar dívidas de PF:', err);
    res.status(500).send('Erro no servidor');
  }
});

/**
 * ROTA: GET /api/dividas/ativas/pj
 * OBJETIVO: Retornar Empresas com a lista de funcionários devedores.
 * LÓGICA ATUALIZADA:
 * 1. Filtra pedidos onde 'status_pagamento' é 'pendente' E 'categoria_cliente' NÃO é NULO.
 * 2. Junta 'pedidos' com 'pessoas' (p_fisica) para obter o nome do funcionário.
 * 3. Junta 'pedidos' com 'pessoas' (p_empresa) usando 'categoria_cliente' para obter o nome da empresa.
 */
router.get('/ativas/pj', async (req, res) => {
  try {
    const query = `
      SELECT
          p_empresa.id_pessoa AS id_empresa,
          p_empresa.nome AS nome_empresa,
          p_fisica.id_pessoa,
          p_fisica.nome AS nome_pessoa,
          SUM(ped.valor_total) AS valor_devido_pessoa
      FROM pedidos ped
      JOIN pessoas p_fisica ON ped.id_pessoa = p_fisica.id_pessoa
      JOIN pessoas p_empresa ON ped.categoria_cliente = p_empresa.id_pessoa
      WHERE
          ped.status_pagamento = 'Pendente' AND ped.categoria_cliente IS NOT NULL
      GROUP BY
          p_empresa.id_pessoa, p_empresa.nome, p_fisica.id_pessoa, p_fisica.nome
      ORDER BY
          nome_empresa, nome_pessoa;
    `;
    const { rows: flatResults } = await pool.query(query);

    const groupedByCompany = flatResults.reduce((acc, row) => {
      if (!acc[row.id_empresa]) {
        acc[row.id_empresa] = {
          id_empresa: row.id_empresa,
          nome_empresa: row.nome_empresa,
          pessoas_vinculadas: []
        };
      }
      acc[row.id_empresa].pessoas_vinculadas.push({
        id_pessoa: row.id_pessoa,
        nome: row.nome_pessoa,
        valor_devido: parseFloat(row.valor_devido_pessoa)
      });
      return acc;
    }, {});

    const finalResponse = Object.values(groupedByCompany);
    res.json(finalResponse);

  } catch (err) {
    console.error('Erro ao buscar dívidas de PJ:', err);
    res.status(500).send('Erro no servidor');
  }
});

/**
 * ROTA: POST /api/dividas/pagar
 * OBJETIVO: Marcar todos os débitos de uma pessoa como pagos.
 * LÓGICA: Nenhuma alteração necessária aqui, a lógica original já está correta.
 */
router.post('/pagar', async (req, res) => {
    const { id_pessoa, valor_pago, forma } = req.body;

    if (!id_pessoa || !valor_pago || !forma) {
        return res.status(400).send('id_pessoa, valor_pago e forma são obrigatórios.');
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const insertPagamentoQuery = `
            INSERT INTO pagamentos (id_pessoa, valor_pago, data, forma) 
            VALUES ($1, $2, NOW(), $3);
        `;
        await client.query(insertPagamentoQuery, [id_pessoa, valor_pago, forma]);

        const updatePedidosQuery = `
            UPDATE pedidos SET status_pagamento = 'quitado' 
            WHERE id_pessoa = $1 AND status_pagamento = 'Pendente';
        `;
        const updateResult = await client.query(updatePedidosQuery, [id_pessoa]);

        if (updateResult.rowCount === 0) {
            console.log(`Nenhum pedido pendente encontrado para a pessoa ${id_pessoa} para atualizar.`);
        }

        await client.query('COMMIT');
        res.status(200).send('Pagamento registrado e dívidas quitadas com sucesso.');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Erro na transação de pagamento:', err);
        res.status(500).send('Erro ao processar pagamento.');
    } finally {
        client.release();
    }
});

/**
 * ROTA: GET /api/dividas/inativas
 * OBJETIVO: Listar todos os pedidos que já foram quitados (histórico).
 * LÓGICA ATUALIZADA:
 * 1. Junta 'pedidos' com 'pessoas' (p_fisica) para pegar o nome do devedor.
 * 2. Usa LEFT JOIN para juntar 'pedidos' com 'pessoas' (p_empresa) através de 'categoria_cliente'.
 * 3. O LEFT JOIN garante que pedidos de PF (categoria_cliente = NULL) apareçam corretamente.
 */
router.get('/inativas', async (req, res) => {
    try {
        const query = `
            SELECT
                ped.id_pedido,
                p_fisica.nome AS nome_pessoa,
                p_empresa.nome AS nome_empresa,
                ped.valor_total,
                ped.data AS data_pedido
            FROM pedidos ped
            JOIN pessoas p_fisica ON ped.id_pessoa = p_fisica.id_pessoa
            LEFT JOIN pessoas p_empresa ON ped.categoria_cliente = p_empresa.id_pessoa
            WHERE ped.status_pagamento = 'quitado'
            ORDER BY ped.data DESC;
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error('Erro ao buscar dívidas inativas:', err);
        res.status(500).send('Erro no servidor');
    }
});

module.exports = router;
