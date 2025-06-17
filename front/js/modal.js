// modal.js ATUALIZADO

// --- Configuração de Preços (Responda a PERGUNTA 1 para preencher) ---
const PRECOS = {
    marmita: 20.00, // <-- SUBSTITUA PELO VALOR CORRETO
    livre: 25.00,   // <-- SUBSTITUA PELO VALOR CORRETO
    kg: 55.90       // <-- SUBSTITUA PELO VALOR POR KG
};

// --- Seletores e Funções de Visibilidade do Modal ---
const modal = document.getElementById('clienteModal');
const modalDetails = document.getElementById('modalClientDetails');
const closeModalButton = document.getElementById('closeModal');

function abrirModal() {
  if (modal) modal.style.display = 'flex';
}

function fecharModal() {
  if (modal) modal.style.display = 'none';
}

/**
 * Preenche o modal com dados do cliente e configura eventos.
 * @param {object} cliente - O objeto do cliente selecionado.
 */
function preencherEConfigurarModal(cliente) {
    if (!modalDetails || !cliente) return;
    modal.dataset.clienteId = cliente.id_pessoa;
    
    modalDetails.innerHTML = `
      <div class="details-grid">
        <div class="client-data"><p><strong>Nome:</strong> ${cliente.nome}</p></div>
        <div class="company-data"><p><strong>Empresa:</strong> ${cliente.empresa || 'Cliente sem vínculo'}</p></div>
      </div>
      <div class="modal-section">
        <h4>Tipo de Refeição</h4>
        <div class="meal-options">
            <label><input type="radio" name="tipo_refeicao" value="marmita" checked> Marmita</label>
            <label><input type="radio" name="tipo_refeicao" value="kg"> Kg</label>
            <label><input type="radio" name="tipo_refeicao" value="livre"> Livre</label>
        </div>
        <div id="kg-quantity-container" style="display: none;">
            <label for="peso_kg">Peso (kg)</label>
            <input type="number" id="peso_kg" name="peso_kg" step="0.01" placeholder="Ex: 0.550">
        </div>
      </div>
      <div class="modal-section modal-buttons-container">
         <div></div>
         <div>
            <button id="addOrderBtn" class="action-button-pf">Adicionar Pedido</button>
         </div>
      </div>
      <div id="modal-feedback" class="modal-feedback"></div>
    `;
    setupModalEventListeners(cliente);
}

/**
 * Configura os event listeners para os elementos do modal.
 * @param {object} cliente
 */
function setupModalEventListeners(cliente) {
    document.querySelectorAll('input[name="tipo_refeicao"]').forEach(radio => {
        radio.addEventListener('change', function() {
            document.getElementById('kg-quantity-container').style.display = (this.value === 'kg') ? 'block' : 'none';
        });
    });

    document.getElementById('addOrderBtn').addEventListener('click', adicionarPedido);
}

/**
 * Função principal: Coleta dados, calcula valor e envia para a API.
 */
async function adicionarPedido() {
    const feedbackEl = document.getElementById('modal-feedback');
    feedbackEl.innerHTML = '';

    // --- 1. Obter ID do Administrador (Responda a PERGUNTA 2) ---


    // --- 2. Coletar Dados do Formulário ---
    const id_pessoa = parseInt(modal.dataset.clienteId);
    const tipoRefeicaoLower = document.querySelector('input[name="tipo_refeicao"]:checked').value; // "kg", "livre", "marmita"
    const inputPeso = document.getElementById('peso_kg');
    let valor_total = 0;
    
    // --- 3. Calcular Valor Total ---
    if (tipoRefeicaoLower === 'kg') {
        const peso = parseFloat(inputPeso.value);
        if (isNaN(peso) || peso <= 0) {
            feedbackEl.textContent = 'Erro: O peso deve ser um número válido e maior que zero.';
            feedbackEl.style.color = '#dc3545';
            return;
        }
        valor_total = peso * PRECOS.kg;
    } else {
        valor_total = PRECOS[tipoRefeicaoLower];
    }

    // --- 4. Montar o Objeto de Dados para a API ---
    // Ajustando os dados para bater com o JSON esperado pelo backend
    const dadosPedido = {
        id_pessoa: id_pessoa,
        tipo_almoco: tipoRefeicaoLower.charAt(0).toUpperCase() + tipoRefeicaoLower.slice(1), // Transforma "livre" em "Livre"
        data: new Date().toISOString().split('T')[0], // Formato YYYY-MM-DD
        valor_total: parseFloat(valor_total.toFixed(2)), // Garante 2 casas decimais
        categoria_cliente: "Pessoa Física", // Por enquanto, fixo. Podemos adaptar para PJ depois.
        status_pagamento: "Pendente",
        id_administrador:  '13910188095'
    };

    const addBtn = document.getElementById('addOrderBtn');
    addBtn.disabled = true;
    feedbackEl.textContent = 'Adicionando pedido...';
    feedbackEl.style.color = '#333';

    try {
        // --- 5. Enviar para a API ---
        const response = await fetch('http://localhost:3000/pedidos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(dadosPedido),
        });

        if (!response.ok) {
            const erroData = await response.json().catch(() => ({ message: 'Erro ao processar a resposta do servidor.' }));
            throw new Error(erroData.message || `Erro ${response.status}: Não foi possível adicionar o pedido.`);
        }

        // --- 6. Feedback de Sucesso ---
        feedbackEl.textContent = 'Pedido adicionado com sucesso!';
        feedbackEl.style.color = '#28a745';

        setTimeout(() => {
            fecharModal();
            // Opcional: recarregar a lista de clientes se necessário
            // if (typeof recarregarClientes === 'function') {
            //   recarregarClientes();
            // }
        }, 1500);

    } catch (error) {
        console.error('Falha ao adicionar pedido:', error);
        feedbackEl.textContent = `Erro: ${error.message}`;
        feedbackEl.style.color = '#dc3545';
        addBtn.disabled = false;
    }
}

// --- Event listeners para fechar o modal ---
if (closeModalButton) {
    closeModalButton.addEventListener('click', fecharModal);
}
if (modal) {
    modal.addEventListener('click', (event) => {
      if (event.target === modal) fecharModal();
    });
}
document.addEventListener('keydown', (event) => {
    if (event.key === "Escape") fecharModal();
});