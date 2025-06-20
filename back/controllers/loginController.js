const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const bcrypt = require('bcrypt'); // Garante que bcrypt esteja importado

// Login de administrador
router.post('/', async (req, res) => {
  const { cpf, senha } = req.body;

  if (!cpf || !senha) {
    return res.status(400).json({ erro: 'CPF e senha são obrigatórios.' });
  }

  try {
    // Busca apenas 1 registro com o CPF informado
    const resultado = await pool.query(
      'SELECT cpf, nome, email, senha FROM administradores WHERE cpf = $1',
      [cpf]
    );

    if (resultado.rowCount === 0) {
      return res.status(401).json({ erro: 'CPF ou senha inválidos.' });
    }

    const admin = resultado.rows[0];

    // Compara a senha fornecida com o hash armazenado
    const senhaCorreta = await bcrypt.compare(senha, admin.senha);

    if (!senhaCorreta) {
      return res.status(401).json({ erro: 'CPF ou senha inválidos.' });
    }

    // Login bem-sucedido
    res.status(200).json({
      mensagem: 'Login bem-sucedido.',
      admin: {
        cpf: admin.cpf,
        nome: admin.nome,
        email: admin.email
      }
    });

  } catch (err) {
    console.error('Erro no login:', err);
    res.status(500).json({ erro: 'Erro interno do servidor ao realizar login.' });
  }
});

module.exports = router;
