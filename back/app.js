const express = require('express');
const cors = require('cors');
const path = require('path');

const { validarConexao } = require('./db');

// --- Rotas ---
// Mantendo um padrão de nomes para clareza (ex: ...Routes)
const indexRoutes = require('./routes/index');
const categoriaRoutes = require('./controllers/categoria');
const valoresRoutes = require('./controllers/valoresController');
const itensAdicionaisRoutes = require('./controllers/itemAddController'); // Renomeado para consistência
const pagamentoRoutes = require('./controllers/pagamentoController');

// Controller de PF agora é um Router completo
const pessoasFisicasRoutes = require('./controllers/clientesPFController'); // Ajuste o nome do arquivo se necessário

// Controller de PJ (ainda no formato antigo, mantido como está)
const pessoasJuridicasRoutes = require('./controllers/clientesPJController'); // ou o nome que der ao arquivo


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

// ATUALIZADO: Usando o novo router para Pessoas Físicas
// Esta única linha substitui as três anteriores (app.get, app.post, app.delete)
app.use('/clientes/pf', pessoasFisicasRoutes);

app.use('/clientes/pj', pessoasJuridicasRoutes);


app.listen(3000, () => {
  console.log('Servidor rodando na porta 3000');
});
