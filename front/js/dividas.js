document.addEventListener('DOMContentLoaded', () => {
    // URL base da sua API. Altere se for diferente.
    const API_URL = 'http://localhost:3000/api/dividas';

    // Seletores de elementos da página
    const tabAtivas = document.getElementById('tab-ativas');
    const tabInativas = document.getElementById('tab-inativas');
    const contentAtivas = document.getElementById('content-ativas');
    const contentInativas = document.getElementById('content-inativas');
    
    const tabPf = document.getElementById('tab-pf');
    const tabPj = document.getElementById('tab-pj');
    
    const dataContainer = document.getElementById('data-container');
    const inativasContainer = document.getElementById('inativas-container');
    const loadingIndicator = document.getElementById('loading');

    // Função para formatar valores como moeda (Real Brasileiro)
    const formatCurrency = (value) => {
        return parseFloat(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    // Exibe o indicador de "Carregando..."
    const showLoading = () => loadingIndicator.style.display = 'block';
    const hideLoading = () => loadingIndicator.style.display = 'none';

    // Função para renderizar mensagem quando não há dados
    const renderEmptyMessage = (container, message) => {
        container.innerHTML = `<div class="empty-message">${message}</div>`;
    };
    
    // --- LÓGICA DE RENDERIZAÇÃO ---

    // Renderiza a tabela de Pessoas Físicas com dívidas
    const renderPfTable = (data) => {
        if (!data || data.length === 0) {
            renderEmptyMessage(dataContainer, 'Nenhuma dívida encontrada para Pessoas Físicas.');
            return;
        }
        dataContainer.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Nome</th>
                        <th>Valor Total Devido</th>
                        <th class="actions">Ações</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.map(pessoa => `
                        <tr>
                            <td>${pessoa.nome}</td>
                            <td>${formatCurrency(pessoa.valor_total_devido)}</td>
                            <td class="actions">
                                <button class="pay-button" 
                                        data-id="${pessoa.id_pessoa}" 
                                        data-valor="${pessoa.valor_total_devido}"
                                        data-nome="${pessoa.nome}">
                                    Marcar como Pago
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    };

    // Renderiza a lista de Empresas (PJs) com dívidas
    const renderPjList = (data) => {
        if (!data || data.length === 0) {
            renderEmptyMessage(dataContainer, 'Nenhuma dívida encontrada para Pessoas Jurídicas.');
            return;
        }
        dataContainer.innerHTML = `
            ${data.map(empresa => `
                <div class="company-card">
                    <div class="company-header">${empresa.nome_empresa}</div>
                    ${empresa.pessoas_vinculadas.map(pessoa => `
                        <div class="employee-debt">
                            <div class="employee-info">
                                <span class="employee-name">${pessoa.nome}</span>
                                <span class="employee-value">${formatCurrency(pessoa.valor_devido)}</span>
                            </div>
                            <button class="pay-button" 
                                    data-id="${pessoa.id_pessoa}" 
                                    data-valor="${pessoa.valor_devido}"
                                    data-nome="${pessoa.nome}">
                                Marcar como Pago
                            </button>
                        </div>
                    `).join('')}
                </div>
            `).join('')}
        `;
    };

    // Renderiza a tabela de histórico de dívidas quitadas
    const renderInativasTable = (data) => {
        if (!data || data.length === 0) {
            renderEmptyMessage(inativasContainer, 'Nenhum histórico de pagamento encontrado.');
            return;
        }
        inativasContainer.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Nome</th>
                        <th>Empresa</th>
                        <th>Valor Pago</th>
                        <th>Data do Pedido</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.map(pedido => `
                        <tr>
                            <td>${pedido.nome_pessoa}</td>
                            <td>${pedido.nome_empresa || 'N/A'}</td>
                            <td>${formatCurrency(pedido.valor_total)}</td>
                            <td>${new Date(pedido.data_pedido).toLocaleDateString('pt-BR')}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    };


    // --- LÓGICA DE FETCH (BUSCA DE DADOS NA API) ---

    const fetchActivePF = async () => {
        showLoading();
        dataContainer.innerHTML = '';
        try {
            const response = await fetch(`${API_URL}/ativas/pf`);
            const data = await response.json();
            renderPfTable(data);
        } catch (error) {
            console.error('Erro ao buscar dívidas PF:', error);
            renderEmptyMessage(dataContainer, 'Falha ao carregar dados. Verifique o console.');
        } finally {
            hideLoading();
        }
    };

    const fetchActivePJ = async () => {
        showLoading();
        dataContainer.innerHTML = '';
        try {
            const response = await fetch(`${API_URL}/ativas/pj`);
            const data = await response.json();
            renderPjList(data);
        } catch (error) {
            console.error('Erro ao buscar dívidas PJ:', error);
            renderEmptyMessage(dataContainer, 'Falha ao carregar dados. Verifique o console.');
        } finally {
            hideLoading();
        }
    };

    const fetchInativas = async () => {
        showLoading();
        inativasContainer.innerHTML = '';
         try {
            const response = await fetch(`${API_URL}/inativas`);
            const data = await response.json();
            renderInativasTable(data);
        } catch (error) {
            console.error('Erro ao buscar histórico:', error);
            renderEmptyMessage(inativasContainer, 'Falha ao carregar histórico. Verifique o console.');
        } finally {
            hideLoading();
        }
    };
    
    // --- LÓGICA DE PAGAMENTO ---

    const processPayment = async (pessoaId, valor, nome) => {
        // Confirmação com o usuário
        const confirmation = confirm(`Você confirma o pagamento de ${formatCurrency(valor)} para ${nome}?`);

        if (confirmation) {
            try {
                const response = await fetch(`${API_URL}/pagar`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id_pessoa: pessoaId,
                        valor_pago: valor,
                        forma: 'digital' // Forma de pagamento padrão
                    })
                });

                if (response.ok) {
                    alert('Pagamento processado com sucesso!');
                    // Recarrega a visualização atual para remover a dívida paga
                    if (tabPf.classList.contains('active')) {
                        fetchActivePF();
                    } else {
                        fetchActivePJ();
                    }
                } else {
                    throw new Error('Falha ao processar pagamento no servidor.');
                }
            } catch (error) {
                console.error('Erro ao processar pagamento:', error);
                alert('Ocorreu um erro. O pagamento não foi processado.');
            }
        }
    };


    // --- EVENT LISTENERS (OUVINTES DE EVENTOS) ---

    // Abas principais
    tabAtivas.addEventListener('click', () => {
        tabAtivas.classList.add('active');
        tabInativas.classList.remove('active');
        contentAtivas.style.display = 'block';
        contentInativas.style.display = 'none';
        fetchActivePF(); // Volta para a aba PF por padrão
        tabPf.classList.add('active');
        tabPj.classList.remove('active');
    });

    tabInativas.addEventListener('click', () => {
        tabInativas.classList.add('active');
        tabAtivas.classList.remove('active');
        contentInativas.style.display = 'block';
        contentAtivas.style.display = 'none';
        fetchInativas();
    });

    // Abas secundárias (PF/PJ)
    tabPf.addEventListener('click', () => {
        tabPf.classList.add('active');
        tabPj.classList.remove('active');
        fetchActivePF();
    });

    tabPj.addEventListener('click', () => {
        tabPj.classList.add('active');
        tabPf.classList.remove('active');
        fetchActivePJ();
    });
    
    // Delegação de evento para os botões "Marcar como Pago"
    document.body.addEventListener('click', (event) => {
        if (event.target.classList.contains('pay-button')) {
            const button = event.target;
            const pessoaId = button.dataset.id;
            const valor = button.dataset.valor;
            const nome = button.dataset.nome;
            processPayment(pessoaId, valor, nome);
        }
    });

    // Carga inicial
    fetchActivePF();
});