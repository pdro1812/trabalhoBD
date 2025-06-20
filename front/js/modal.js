// modal.js - CORRIGIDO E ATUALIZADO para usar cliente.id_empresa para PJ

// --- Configuração ---
const PRECOS = {
    marmita: 20.00,
    livre: 25.00,
    kg: 55.90
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
let itensAdicionaisSelecionados = []; // Agora armazena { id_item, nome_item, valor, quantidade }

// =================================================================
// FUNÇÕES DO MODAL PRINCIPAL (CLIENTE)
// =================================================================

function abrirClienteModal() {
  if (clienteModal) clienteModal.style.display = 'flex';
}

function fecharClienteModal() {
  if (clienteModal) clienteModal.style.display = 'none';
  // Limpar feedback e reabilitar botões ao fechar, para a próxima vez que abrir
  const feedbackEl = document.getElementById('modal-feedback');
  if (feedbackEl) feedbackEl.innerHTML = '';
  const btnPf = document.getElementById('addOrderBtnPf');
  const btnPj = document.getElementById('addOrderBtnPj');
  if (btnPf) btnPf.disabled = false;
  if (btnPj) btnPj.disabled = false;
}

function preencherEConfigurarModal(cliente) {
    if (!clienteModalDetails || !cliente) return;
    
    itensAdicionaisSelecionados = [];
    clienteModal.dataset.clienteId = cliente.id_pessoa;
    // Armazena o id_empresa do cliente no dataset do modal
    clienteModal.dataset.idEmpresa = cliente.id_empresa || ''; 
    
    clienteModalDetails.innerHTML = `
      <div class="details-grid">
        <div class="client-data"><p><strong>Nome:</strong> ${cliente.nome}</p></div>
        <div class="company-data"><p><strong>Empresa:</strong> ${cliente.nome_empresa || 'Cliente sem vínculo'}</p></div>
      </div>
      <div class="modal-section">
        <h4>Tipo de Refeição</h4>
        <div class="meal-options">
            <label><input type="radio" name="tipo_refeicao" value="marmita" checked> Marmita</label>
            <label><input type="radio" name="tipo_refeicao" value="kg"> Kg</label>
            <label><input type="radio" name="tipo_refeicao" value="livre"> Livre</label>
        </div>
        <div id="kg-quantity-container" class="kg-input" style="display: none; margin-top: 10px;">
            <label for="peso_kg">Peso (kg)</label>
            <input type="number" id="peso_kg" name="peso_kg" step="0.01" placeholder="Ex: 0.550">
        </div>
      </div>

      <div id="resumoPedido"></div>

      <div class="modal-section modal-buttons-container">
         <div>
            <button id="addExtraItemBtn" class="modal-button">Adicionar Itens</button>
         </div>
         <div class="finalizar-buttons">
            <button id="addOrderBtnPf" class="action-button-pf">Finalizar Pedido PF</button>
            <button id="addOrderBtnPj" class="action-button-pj">Finalizar Pedido PJ</button>
         </div>
      </div>
      <div id="modal-feedback" class="modal-feedback"></div>
    `;
    setupClienteModalEventListeners();
    atualizarResumoPedido();
}

function setupClienteModalEventListeners() {
    // Esconde/mostra o campo de peso para refeição por KG
    document.querySelectorAll('input[name="tipo_refeicao"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const kgContainer = document.getElementById('kg-quantity-container');
            kgContainer.style.display = e.target.value === 'kg' ? 'block' : 'none';
            atualizarResumoPedido();
        });
    });

    document.getElementById('peso_kg').addEventListener('input', atualizarResumoPedido);
    document.getElementById('addExtraItemBtn').addEventListener('click', abrirModalItens);

    // Event listeners para os novos botões PF e PJ
    document.getElementById('addOrderBtnPf').addEventListener('click', () => finalizarPedido('PF'));
    document.getElementById('addOrderBtnPj').addEventListener('click', () => finalizarPedido('PJ'));
}

function atualizarResumoPedido() {
    const resumoContainer = document.getElementById('resumoPedido');
    if (!resumoContainer) return;

    const { valorRefeicao } = calcularValorRefeicao();
    const valorItens = itensAdicionaisSelecionados.reduce((acc, item) => acc + (parseFloat(item.valor) * item.quantidade), 0);
    const valorTotal = valorRefeicao + valorItens;

    let itensHtml = itensAdicionaisSelecionados.map(item => {
        const valorLinha = parseFloat(item.valor) * item.quantidade;
        return `<p><span>- ${item.quantidade}x ${item.nome_item}</span> <span>R$ ${valorLinha.toFixed(2)}</span></p>`
    }).join('');

    resumoContainer.innerHTML = `
        <h5>Resumo do Pedido</h5>
        <p><span>Valor Refeição:</span> <strong>R$ ${valorRefeicao.toFixed(2)}</strong></p>
        ${itensAdicionaisSelecionados.length > 0 ? '<h6>Itens Adicionais:</h6>' + itensHtml : ''}
        <hr>
        <p><span>TOTAL:</span> <strong>R$ ${valorTotal.toFixed(2)}</strong></p>
    `;
}

async function finalizarPedido(tipoCliente) { // Agora aceita 'PF' ou 'PJ'
    const feedbackEl = document.getElementById('modal-feedback');
    feedbackEl.innerHTML = '';

    const idAdministrador = '13910188095'; // Ajuste conforme sua realidade (ex: pegar de um login)
    if (!idAdministrador) {
        feedbackEl.textContent = 'Erro: Administrador não identificado.';
        return;
    }

    const { valorRefeicao, tipoRefeicaoLower } = calcularValorRefeicao();
    if (valorRefeicao < 0) {
        feedbackEl.textContent = 'Erro: O peso deve ser um número válido e maior que zero.';
        return;
    }
    const valorItens = itensAdicionaisSelecionados.reduce((acc, item) => acc + (parseFloat(item.valor) * item.quantidade), 0);

    let categoriaClienteValue = null; // Padrão para PF

    // Lógica para definir a categoria_cliente baseada no id_empresa do cliente
    if (tipoCliente === 'PJ') {
        const clienteIdEmpresa = parseInt(clienteModal.dataset.idEmpresa);

        if (isNaN(clienteIdEmpresa) || clienteIdEmpresa <= 0) {
             feedbackEl.textContent = 'Erro: Cliente não possui vínculo com empresa para pedido PJ.';
             // Reabilita apenas o botão PJ se for o caso
             document.getElementById('addOrderBtnPj').disabled = false;
             return;
        }
        categoriaClienteValue = clienteIdEmpresa; // O ID da empresa do cliente será a categoria para PJ
    }
    // Se for PF, categoriaClienteValue permanece null

    const dadosPedido = {
        id_pessoa: parseInt(clienteModal.dataset.clienteId),
        tipo_almoco: tipoRefeicaoLower.charAt(0).toUpperCase() + tipoRefeicaoLower.slice(1),
        data: new Date().toISOString().split('T')[0],
        valor_total: parseFloat((valorRefeicao + valorItens).toFixed(2)),
        categoria_cliente: categoriaClienteValue, // Dinâmico com base no tipoCliente e id_empresa do cliente
        status_pagamento: "Pendente",
        id_administrador: idAdministrador,
        itensAdicionais: itensAdicionaisSelecionados.map(item => ({
            id_item: item.id_item,
            quantidade: item.quantidade
        }))
    };

    // Desabilitar o botão clicado e o outro também para evitar múltiplos envios
    const addBtnPf = document.getElementById('addOrderBtnPf');
    const addBtnPj = document.getElementById('addOrderBtnPj');
    if (addBtnPf) addBtnPf.disabled = true;
    if (addBtnPj) addBtnPj.disabled = true;

    feedbackEl.textContent = 'Finalizando pedido...';

    try {
        const response = await fetch('/pedidos', { // Usando rota relativa
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dadosPedido),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Falha no servidor');
        }

        feedbackEl.textContent = 'Pedido finalizado com sucesso!';
        setTimeout(fecharClienteModal, 1500); // Fecha o modal após sucesso

    } catch (error) {
        console.error('Falha ao finalizar pedido:', error);
        feedbackEl.textContent = `Erro: ${error.message}`;
        // Reabilitar ambos os botões em caso de erro
        if (addBtnPf) addBtnPf.disabled = false;
        if (addBtnPj) addBtnPj.disabled = false;
    }
}

function calcularValorRefeicao() {
    const tipoRefeicaoInput = document.querySelector('input[name="tipo_refeicao"]:checked');
    if (!tipoRefeicaoInput) return { valorRefeicao: 0, tipoRefeicaoLower: '', peso: null };

    const tipoRefeicaoLower = tipoRefeicaoInput.value;
    let valorRefeicao = 0;
    let peso = null;

    if (tipoRefeicaoLower === 'kg') {
        const inputPeso = document.getElementById('peso_kg');
        peso = parseFloat(inputPeso.value);
        if (isNaN(peso) || peso <= 0) return { valorRefeicao: -1 }; // Retorna -1 para indicar erro no peso
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
        const response = await fetch('/itemadicional'); // Usando rota relativa
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

    itensListContainer.innerHTML = itens.map(item => {
        const itemSelecionado = itensAdicionaisSelecionados.find(i => i.id_item === item.id_item);
        const quantidadeAtual = itemSelecionado ? itemSelecionado.quantidade : 0;

        return `
        <div class="item-adicional">
            <label for="item-qty-${item.id_item}">
                ${item.nome_item} (${item.categoria})
                <span class="item-valor">R$ ${parseFloat(item.valor).toFixed(2)}</span>
            </label>
            <input 
                type="number"
                id="item-qty-${item.id_item}"
                class="item-quantity-input"
                min="0"
                value="${quantidadeAtual}"
                data-id-item="${item.id_item}"
                data-nome="${item.nome_item}"
                data-valor="${item.valor}"
            >
        </div>
    `}).join('');
}

function confirmarSelecaoDeItens() {
    itensAdicionaisSelecionados = [];
    document.querySelectorAll('.item-quantity-input').forEach(input => {
        const quantidade = parseInt(input.value, 10);
        if (quantidade > 0) {
            itensAdicionaisSelecionados.push({
                id_item: parseInt(input.dataset.idItem),
                nome_item: input.dataset.nome,
                valor: parseFloat(input.dataset.valor),
                quantidade: quantidade
            });
        }
    });
    fecharModalItens();
    atualizarResumoPedido();
}

// --- Event Listeners Globais ---
if (closeClienteModalBtn) closeClienteModalBtn.addEventListener('click', fecharClienteModal);
if (clienteModal) clienteModal.addEventListener('click', (e) => e.target === clienteModal && fecharClienteModal());

if (closeItensModalBtn) closeItensModalBtn.addEventListener('click', fecharModalItens);
if (confirmarItensBtn) confirmarItensBtn.addEventListener('click', confirmarSelecaoDeItens);
if (itensModal) itensModal.addEventListener('click', (e) => e.target === itensModal && fecharModalItens());

document.addEventListener('keydown', (e) => e.key === "Escape" && (fecharClienteModal(), fecharModalItens()));