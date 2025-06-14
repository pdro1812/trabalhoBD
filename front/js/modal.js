// --- LÓGICA DO MODAL ---

// Seleciona os elementos do modal uma única vez
const modal = document.getElementById('clienteModal');
const modalDetails = document.getElementById('modalClientDetails');
const closeModalButton = document.getElementById('closeModal');

// Função para abrir o modal
function abrirModal() {
  if (modal) {
    modal.style.display = 'flex';
  }
}

// Função para fechar o modal
function fecharModal() {
  if (modal) {
    modal.style.display = 'none';
  }
}

// Função para configurar os eventos dos elementos internos do modal
function setupModalEventListeners() {
    const mealTypeRadios = document.querySelectorAll('input[name="tipo_refeicao"]');
    const kgQuantityContainer = document.getElementById('kg-quantity-container');

    if (!mealTypeRadios.length || !kgQuantityContainer) return;

    mealTypeRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.value === 'kg') {
                kgQuantityContainer.style.display = 'block';
            } else {
                kgQuantityContainer.style.display = 'none';
            }
        });
    });
}

// Função para preencher o conteúdo do modal com os dados do cliente e configurar os eventos
function preencherEConfigurarModal(cliente) {
    if (!modalDetails || !cliente) return;

    // Nova estrutura HTML para o modal
    modalDetails.innerHTML = `
      <div class="details-grid">
        <div class="client-data">
          <p><strong>Nome:</strong> ${cliente.nome}</p>
          <p><strong>CPF:</strong> ${cliente.cpf || 'Não informado'}</p>
          <p><strong>Telefone:</strong> ${cliente.telefone || 'Não informado'}</p>
        </div>
        <div class="company-data">
          <p><strong>Empresa (se tiver):</strong></p>
          <p>${cliente.empresa || 'Não informado'}</p>
        </div>
      </div>

      <div class="modal-section">
        <h4>Tipo de Refeição</h4>
        <div class="meal-options">
            <label><input type="radio" name="tipo_refeicao" value="marmita" checked> Marmita</label>
            <label><input type="radio" name="tipo_refeicao" value="kg"> Kg</label>
            <label><input type="radio" name="tipo_refeicao" value="livre"> Livre</label>
        </div>
        <div id="kg-quantity-container" style="display: none;">
            <label for="peso_kg">Quantidade (mostra apenas se for por kg)</label>
            <input type="number" id="peso_kg" name="peso_kg" step="0.01" placeholder="Ex: 0.550">
        </div>
      </div>

      <div class="modal-section modal-buttons-container">
         <div>
            <button class="modal-button">Adicionar item extra</button>
         </div>
         <div>
            <button class="action-button-pf">Adiciona PF</button>
            <button class="action-button-pj">Adiciona PJ</button>
        </div>
      </div>
    `;

    // Configura os eventos para os novos elementos criados dentro do modal
    setupModalEventListeners();
}


// --- Event listeners para fechar o modal ---
if (closeModalButton) {
    closeModalButton.addEventListener('click', fecharModal);
}

if (modal) {
    // Fecha o modal se clicar fora da área de conteúdo
    modal.addEventListener('click', function(event) {
      if (event.target === modal) {
        fecharModal();
      }
    });
}

// Fecha o modal ao pressionar a tecla 'Esc'
document.addEventListener('keydown', function(event) {
    if (event.key === "Escape") {
        fecharModal();
    }
});