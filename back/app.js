const express = require('express');
const cors = require('cors');
const path = require('path');

const { validarConexao } = require('./db');
const categoriaRoutes = require('./controllers/categoria');
const valoresRoutes = require('./controllers/valoresController');
const indexRoutes = require('./routes/index');
const intemAddRoutes = require('./controllers/itemAddController');


const app = express();

app.use(cors());
app.use(express.json());

validarConexao();

app.use(express.static(path.join(__dirname, '../front')));

app.use('/', indexRoutes);
app.use('/categorias', categoriaRoutes);
app.use('/valores', valoresRoutes);
app.use('/itemadicional', intemAddRoutes);



app.listen(3000, () => {
  console.log('Servidor rodando na porta 3000');
});
