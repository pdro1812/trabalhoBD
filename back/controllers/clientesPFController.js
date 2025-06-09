const { pool } = require('../db');

const clientesPFController = {
  async listar(req, res) {
    try {
      const result = await pool.query(`
        SELECT p.id_pessoa, p.nome, p.telefone, f.cpf, e.cod_pessoa AS cod_empresa
        FROM Pessoa p
        JOIN Fisica f ON p.id_pessoa = f.cod_pessoa
        JOIN Empresa e ON f.cod_empresa = e.cod_pessoa
      `);
      res.json(result.rows);
    } catch (error) {
      console.error(error);
      res.status(500).json({ erro: 'Erro ao buscar clientes PF' });
    }
  },

  async criar(req, res) {
    const { nome, cpf, telefone, empresa } = req.body;

    try {
      // 1. Inserir na tabela Pessoa
      const resultPessoa = await pool.query(
        'INSERT INTO Pessoa (nome, telefone, valor_devido) VALUES ($1, $2, 0) RETURNING id_pessoa',
        [nome, telefone]
      );
      const idPessoa = resultPessoa.rows[0].id_pessoa;

      // 2. Obter o cod_pessoa da Empresa correspondente
      const resultEmpresa = await pool.query(
        'SELECT cod_pessoa FROM Empresa WHERE cod_pessoa = $1',
        [empresa]
      );

      if (resultEmpresa.rows.length === 0) {
        return res.status(400).json({ erro: 'Empresa não encontrada' });
      }

      // 3. Inserir na tabela Fisica
      await pool.query(
        'INSERT INTO Fisica (cod_pessoa, cod_empresa, cpf) VALUES ($1, $2, $3)',
        [idPessoa, empresa, cpf]
      );

      res.status(201).json({ mensagem: 'Cliente PF criado com sucesso' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ erro: 'Erro ao criar cliente PF' });
    }
  },

  async deletar(req, res) {
    const idPessoa = req.params.id;

    try {
      // 1. Deletar da tabela Fisica
      await pool.query('DELETE FROM Fisica WHERE cod_pessoa = $1', [idPessoa]);

      // 2. Deletar da tabela Pessoa
      await pool.query('DELETE FROM Pessoa WHERE id_pessoa = $1', [idPessoa]);

      res.json({ mensagem: 'Cliente PF deletado com sucesso' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ erro: 'Erro ao deletar cliente PF' });
    }
  }
};

module.exports = clientesPFController;
