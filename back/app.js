const express = require('express');
const cors = require('cors');
const path = require('path');

const { validarConexao } = require('./db');

// --- Rotas ---
const indexRoutes = require('./routes/index');
const categoriaRoutes = require('./controllers/categoria');
const valoresRoutes = require('./controllers/valoresController');
const itensAdicionaisRoutes = require('./controllers/itemAddController');
const pagamentoRoutes = require('./controllers/pagamentoController');
const pessoasFisicasRoutes = require('./controllers/clientesPFController');
const pessoasJuridicasRoutes = require('./controllers/clientesPJController');
const pedidosRoutes = require('./controllers/pedidosController'); // LINHA ADICIONADA

const app = express();

app.use(cors());
app.use(express.json());

validarConexao();

// Servir arquivos estáticos do front-end
app.use(express.static(path.join(__dirname, '../front')));

// --- Uso das Rotas ---
app.use('/', indexRoutes);
app.use('/categorias', categoriaRoutes);
app.use('/valores', valoresRoutes);
app.use('/itemadicional', itensAdicionaisRoutes);
app.use('/pagamentos', pagamentoRoutes);
app.use('/clientes/pf', pessoasFisicasRoutes);
app.use('/clientes/pj', pessoasJuridicasRoutes);
app.use('/pedidos', pedidosRoutes);
app.use('/completos', pedidosRoutes); // LINHA ADICIONADA


app.listen(3000, () => {
  console.log('Servidor rodando na porta 3000');
});