const { pool } = require('../db');

// CREATE - adicionar empresa
const adicionarEmpresa = async (req, res) => {
  try {
    const { nome, cnpj, valorLivre, valorMarmita, valorKilo } = req.body;

    // Insere primeiro na tabela Pessoa
    const pessoaResult = await pool.query(
      'INSERT INTO Pessoa (nome, telefone, valor_devido) VALUES ($1, NULL, 0) RETURNING id_pessoa',
      [nome]
    );

    const idPessoa = pessoaResult.rows[0].id_pessoa;

    // Insere na tabela Empresa
    await pool.query(
      'INSERT INTO Empresa (cod_pessoa, cnpj, valor_livre, valor_marmita, valor_kg) VALUES ($1, $2, $3, $4, $5)',
      [idPessoa, cnpj, valorLivre, valorMarmita, valorKilo]
    );

    res.status(201).json({ message: 'Empresa adicionada com sucesso!' });
  } catch (error) {
    console.error('Erro ao adicionar empresa:', error);
    res.status(500).json({ error: 'Erro ao adicionar empresa' });
  }
};

// READ - listar todas as empresas
const listarEmpresas = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.id_pessoa AS id, p.nome, e.cnpj, e.valor_livre, e.valor_marmita, e.valor_kg
      FROM Pessoa p
      JOIN Empresa e ON p.id_pessoa = e.cod_pessoa
      ORDER BY p.nome
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao listar empresas:', error);
    res.status(500).json({ error: 'Erro ao listar empresas' });
  }
};

// DELETE - excluir empresa
const excluirEmpresa = async (req, res) => {
  try {
    const { id } = req.params;

    // Deleta da tabela Empresa primeiro (por causa da FK)
    await pool.query('DELETE FROM Empresa WHERE cod_pessoa = $1', [id]);

    // Deleta da tabela Pessoa
    await pool.query('DELETE FROM Pessoa WHERE id_pessoa = $1', [id]);

    res.json({ message: 'Empresa excluída com sucesso!' });
  } catch (error) {
    console.error('Erro ao excluir empresa:', error);
    res.status(500).json({ error: 'Erro ao excluir empresa' });
  }
};

// UPDATE - atualizar empresa
const atualizarEmpresa = async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, cnpj, valorLivre, valorMarmita, valorKilo } = req.body;

    // Atualiza tabela Pessoa
    await pool.query('UPDATE Pessoa SET nome = $1 WHERE id_pessoa = $2', [nome, id]);

    // Atualiza tabela Empresa
    await pool.query(
      `UPDATE Empresa SET cnpj = $1, valor_livre = $2, valor_marmita = $3, valor_kg = $4
       WHERE cod_pessoa = $5`,
      [cnpj, valorLivre, valorMarmita, valorKilo, id]
    );

    res.json({ message: 'Empresa atualizada com sucesso!' });
  } catch (error) {
    console.error('Erro ao atualizar empresa:', error);
    res.status(500).json({ error: 'Erro ao atualizar empresa' });
  }
};

module.exports = {
  adicionarEmpresa,
  listarEmpresas,
  excluirEmpresa,
  atualizarEmpresa
};
