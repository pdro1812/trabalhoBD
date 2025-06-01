const express = require('express');
const cors = require('cors');
const path = require('path');

const { validarConexao } = require('./db');
const categoriaRoutes = require('./controllers/categoria');
const indexRoutes = require('./routes/index'); 

const app = express();

app.use(cors());
app.use(express.json());

// Conexão com o banco
validarConexao();

// Servindo arquivos estáticos
app.use(express.static(path.join(__dirname, '../front')));

// Rotas
app.use('/', indexRoutes);          // 👈 rota principal
app.use('/categorias', categoriaRoutes);

// Inicialização do servidor
app.listen(3000, () => {
  console.log('Servidor rodando na porta 3000');
});
