// modal.js ATUALIZADO E COMPLETO

// --- Configuração ---
const PRECOS = {
    marmita: 20.00, // Substitua pelo valor correto
    livre: 25.00,   // Substitua pelo valor correto
    kg: 55.90       // Substitua pelo valor por kg
};

// --- Seletores dos Modais ---
const clienteModal = document.getElementById('clienteModal');
const clienteModalDetails = document.getElementById('modalClientDetails');
const closeClienteModalBtn = document.getElementById('closeModal');

const itensModal = document.getElementById('itensModal');
const closeItensModalBtn = document.getElementById('closeItensModal');
const confirmarItensBtn = document.getElementById('confirmarItensBtn');
const itensListContainer = document.getElementById('itensListContainer');

// --- Gerenciamento de Estado ---
let cacheItensAdicionais = [];
let itensAdicionaisSelecionados = [];

// =================================================================
// FUNÇÕES DO MODAL PRINCIPAL (CLIENTE)
// =================================================================

function abrirClienteModal() {
  if (clienteModal) clienteModal.style.display = 'flex';
}

function fecharClienteModal() {
  if (clienteModal) clienteModal.style.display = 'none';
}

function preencherEConfigurarModal(cliente) {
    if (!clienteModalDetails || !cliente) return;
    
    // Reseta o estado para um novo pedido
    itensAdicionaisSelecionados = [];
    clienteModal.dataset.clienteId = cliente.id_pessoa;
    
    clienteModalDetails.innerHTML = `
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

      <div id="resumoPedido"></div>

      <div class="modal-section modal-buttons-container">
         <div>
            <button id="addExtraItemBtn" class="modal-button">Adicionar Itens Extras</button>
         </div>
         <div>
            <button id="addOrderBtn" class="action-button-pf">Finalizar Pedido</button>
         </div>
      </div>
      <div id="modal-feedback" class="modal-feedback"></div>
    `;
    setupClienteModalEventListeners();
    atualizarResumoPedido(); // Atualiza a UI com os valores iniciais
}

function setupClienteModalEventListeners() {
    document.querySelectorAll('input[name="tipo_refeicao"], #peso_kg').forEach(el => {
        el.addEventListener('change', atualizarResumoPedido);
        el.addEventListener('keyup', atualizarResumoPedido);
    });
    document.getElementById('addExtraItemBtn').addEventListener('click', abrirModalItens);
    document.getElementById('addOrderBtn').addEventListener('click', finalizarPedido);
}

function atualizarResumoPedido() {
    const resumoContainer = document.getElementById('resumoPedido');
    if (!resumoContainer) return;

    const { valorRefeicao } = calcularValorRefeicao();
    const valorItens = itensAdicionaisSelecionados.reduce((acc, item) => acc + parseFloat(item.valor), 0);
    const valorTotal = valorRefeicao + valorItens;

    let itensHtml = itensAdicionaisSelecionados.map(item => `
        <p><span>- ${item.nome_item}</span> <span>R$ ${parseFloat(item.valor).toFixed(2)}</span></p>
    `).join('');

    resumoContainer.innerHTML = `
        <h5>Resumo do Pedido</h5>
        <p><span>Valor Refeição:</span> <strong>R$ ${valorRefeicao.toFixed(2)}</strong></p>
        ${itensAdicionaisSelecionados.length > 0 ? '<h6>Itens Adicionais:</h6>' + itensHtml : ''}
        <hr>
        <p><span>TOTAL:</span> <strong>R$ ${valorTotal.toFixed(2)}</strong></p>
    `;
}

async function finalizarPedido() {
    const feedbackEl = document.getElementById('modal-feedback');
    feedbackEl.innerHTML = '';

    const idAdministrador = '13910188095'; // Exemplo! Ajuste conforme sua realidade
    if (!idAdministrador) {
        feedbackEl.textContent = 'Erro: Administrador não identificado. Faça login novamente.';
        return;
    }

    const { valorRefeicao, tipoRefeicaoLower, peso } = calcularValorRefeicao();
    if (valorRefeicao < 0) { // Erro de validação do peso
        feedbackEl.textContent = 'Erro: O peso deve ser um número válido e maior que zero.';
        return;
    }
    const valorItens = itensAdicionaisSelecionados.reduce((acc, item) => acc + parseFloat(item.valor), 0);

    const dadosPedido = {
        id_pessoa: parseInt(clienteModal.dataset.clienteId),
        tipo_almoco: tipoRefeicaoLower.charAt(0).toUpperCase() + tipoRefeicaoLower.slice(1),
        data: new Date().toISOString().split('T')[0],
        valor_total: parseFloat((valorRefeicao + valorItens).toFixed(2)),
        categoria_cliente: "Pessoa Física",
        status_pagamento: "Pendente",
        id_administrador: idAdministrador,
        itensAdicionais: itensAdicionaisSelecionados.map(item => item.id_item) // Array de IDs
    };

    const addBtn = document.getElementById('addOrderBtn');
    addBtn.disabled = true;
    feedbackEl.textContent = 'Finalizando pedido...';

    try {
        const response = await fetch('http://localhost:3000/pedidos', { // Endpoint de Pedidos
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dadosPedido),
        });

        if (!response.ok) throw new Error((await response.json()).message || 'Falha no servidor');

        feedbackEl.textContent = 'Pedido finalizado com sucesso!';
        setTimeout(fecharClienteModal, 1500);

    } catch (error) {
        console.error('Falha ao finalizar pedido:', error);
        feedbackEl.textContent = `Erro: ${error.message}`;
        addBtn.disabled = false;
    }
}

function calcularValorRefeicao() {
    const tipoRefeicaoLower = document.querySelector('input[name="tipo_refeicao"]:checked').value;
    let valorRefeicao = 0;
    let peso = null;

    if (tipoRefeicaoLower === 'kg') {
        const inputPeso = document.getElementById('peso_kg');
        peso = parseFloat(inputPeso.value);
        if (isNaN(peso) || peso <= 0) {
            return { valorRefeicao: -1 }; // Código de erro
        }
        valorRefeicao = peso * PRECOS.kg;
    } else {
        valorRefeicao = PRECOS[tipoRefeicaoLower];
    }
    return { valorRefeicao, tipoRefeicaoLower, peso };
}


// =================================================================
// FUNÇÕES DO MODAL DE ITENS ADICIONAIS
// =================================================================

function abrirModalItens() {
    if (itensModal) itensModal.style.display = 'flex';
    if (cacheItensAdicionais.length > 0) {
        renderizarItensNoModal(cacheItensAdicionais);
    } else {
        fetchItensAdicionais();
    }
}

function fecharModalItens() {
    if (itensModal) itensModal.style.display = 'none';
}

async function fetchItensAdicionais() {
    try {
        const response = await fetch('http://localhost:3000/itemadicional'); // Endpoint de Itens
        if (!response.ok) throw new Error('Erro ao buscar itens');
        const itens = await response.json();
        cacheItensAdicionais = itens;
        renderizarItensNoModal(itens);
    } catch (error) {
        itensListContainer.innerHTML = `<div class="error">${error.message}</div>`;
    }
}

function renderizarItensNoModal(itens) {
    if (itens.length === 0) {
        itensListContainer.innerHTML = '<div class="no-results">Nenhum item adicional cadastrado.</div>';
        return;
    }

    const selectedIds = new Set(itensAdicionaisSelecionados.map(i => i.id_item));

    itensListContainer.innerHTML = itens.map(item => `
        <div class="item-adicional">
            <label>
                <input 
                    type="checkbox" 
                    class="item-checkbox"
                    value="${item.id_item}"
                    data-nome="${item.nome_item}"
                    data-valor="${item.valor}"
                    ${selectedIds.has(item.id_item) ? 'checked' : ''}
                >
                ${item.nome_item} (${item.categoria})
            </label>
            <span class="item-valor">R$ ${parseFloat(item.valor).toFixed(2)}</span>
        </div>
    `).join('');
}

function confirmarSelecaoDeItens() {
    itensAdicionaisSelecionados = []; // Limpa e reconstrói a lista
    document.querySelectorAll('.item-checkbox:checked').forEach(checkbox => {
        itensAdicionaisSelecionados.push({
            id_item: parseInt(checkbox.value),
            nome_item: checkbox.dataset.nome,
            valor: parseFloat(checkbox.dataset.valor)
        });
    });
    fecharModalItens();
    atualizarResumoPedido(); // Atualiza o modal principal com os novos itens e valores
}

// --- Event Listeners Globais ---
if (closeClienteModalBtn) closeClienteModalBtn.addEventListener('click', fecharClienteModal);
if (clienteModal) clienteModal.addEventListener('click', (e) => e.target === clienteModal && fecharClienteModal());

if (closeItensModalBtn) closeItensModalBtn.addEventListener('click', fecharModalItens);
if (confirmarItensBtn) confirmarItensBtn.addEventListener('click', confirmarSelecaoDeItens);
if (itensModal) itensModal.addEventListener('click', (e) => e.target === itensModal && fecharModalItens());

document.addEventListener('keydown', (e) => e.key === "Escape" && (fecharClienteModal(), fecharModalItens()));