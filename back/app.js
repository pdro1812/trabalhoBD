const express = require('express');
const cors = require('cors');
const path = require('path');

const { validarConexao } = require('./db');
const categoriaRoutes = require('./controllers/categoria');
const valoresRoutes = require('./controllers/valoresController');
const indexRoutes = require('./routes/index');
const intemAddRoutes = require('./controllers/itemAddController');

const clientesPFController = require('./controllers/clientesPFController');
const clientesPJController = require('./controllers/clientesPJController');



const app = express();

app.use(cors());
app.use(express.json());

validarConexao();

app.use(express.static(path.join(__dirname, '../front')));

app.use('/', indexRoutes);
app.use('/categorias', categoriaRoutes);
app.use('/valores', valoresRoutes);
app.use('/itemadicional', intemAddRoutes);
app.get('/clientes/pf', clientesPFController.listar);
app.post('/clientes/pf', clientesPFController.criar);
app.delete('/clientes/pf/:id', clientesPFController.deletar);

app.post('/clientes/pj', clientesPJController.adicionarEmpresa);
app.get('/clientes/pj', clientesPJController.listarEmpresas);
app.delete('/clientes/pj/:id', clientesPJController.excluirEmpresa);
app.put('/clientes/pj/:id', clientesPJController.atualizarEmpresa);



app.listen(3000, () => {
  console.log('Servidor rodando na porta 3000');
});
