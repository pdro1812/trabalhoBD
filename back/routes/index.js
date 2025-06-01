const express = require('express');
const path = require('path');
const router = express.Router();

// Rota padrão que envia a tela principal
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../front/tela_principal.html'));
});

module.exports = router;
