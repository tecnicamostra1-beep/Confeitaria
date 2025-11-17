// client.js — comunica com server.js via Socket.IO
(function(){
  // conectar ao socket (usa origem atual)
  const socket = io({ transports: ['websocket', 'polling'] });

  // elementos
  const ordersList = document.getElementById('ordersList');
  const statusText = document.getElementById('statusText');
  const logList = document.getElementById('logList');
  const localURL = document.getElementById('localURL');

  // exibir URL local (apenas informativo)
  if(localURL){
    localURL.textContent = window.location.origin;
  }

  // enviar pedido (index.html)
  document.querySelectorAll('.order-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.dataset.item;
      const input = btn.parentElement.querySelector('.input-name');
      const name = input && input.value ? input.value.trim() : 'Cliente';
      socket.emit('order:new', { item, name });
      alert(`Pedido enviado: ${item}\nObrigado!`);
      if(input) input.value = '';
    });
  });

  // receber inicial
  socket.on('orders:init', (orders) => {
    renderOrders(orders);
    appendLog('Lista inicial recebida (' + orders.length + ')');
  });

  // receber updates
  socket.on('orders:update', (orders) => {
    renderOrders(orders);
    appendLog('Update recebido (' + orders.length + ')');
  });

  socket.on('connect', () => {
    if(statusText) statusText.textContent = 'Conectado ao servidor';
    appendLog('Socket conectado: ' + socket.id);
  });
  socket.on('disconnect', () => {
    if(statusText) statusText.textContent = 'Desconectado';
    appendLog('Socket desconectado');
  });

  // renderiza pedidos na cozinha (se elementos existem)
  function renderOrders(orders){
    if(!ordersList) return;
    ordersList.innerHTML = '';
    if(orders.length === 0){
      ordersList.innerHTML = '<div class="muted">Sem pedidos no momento</div>';
      return;
    }
    orders.slice().reverse().forEach(o => {
      const div = document.createElement('div');
      div.className = 'order-item';
      div.innerHTML = `
        <div class="order-meta">
          <strong>${o.item}</strong>
          <small>${o.name} • ${o.time}</small>
          <small>Status: <span class="status-text">${o.status}</span></small>
        </div>
        <div class="order-actions">
          <select data-id="${o.id}" class="status-select">
            <option ${o.status==='Aguardando'?'selected':''}>Aguardando</option>
            <option ${o.status==='Em produção'?'selected':''}>Em produção</option>
            <option ${o.status==='Pronto'?'selected':''}>Pronto</option>
          </select>
        </div>
      `;
      ordersList.appendChild(div);
    });

    // ligar selects
    document.querySelectorAll('.status-select').forEach(sel => {
      sel.addEventListener('change', (ev) => {
        const id = sel.dataset.id;
        const status = sel.value;
        socket.emit('order:update', { id, status });
      });
    });
  }

  // botões da cozinha (se presentes)
  const btnMarkAll = document.getElementById('btnMarkAll');
  if(btnMarkAll){
    btnMarkAll.addEventListener('click', () => {
      // marcar todos como Pronto via API (ou emitir múltiplos eventos)
      // vamos buscar lista atual via fetch /api/orders e emitir updates
      fetch('/api/orders').then(r => r.json()).then(list => {
        list.forEach(o => {
          socket.emit('order:update', { id: o.id, status: 'Pronto' });
        });
      });
    });
  }
  const btnClear = document.getElementById('btnClear');
  if(btnClear){
    btnClear.addEventListener('click', () => {
      if(!confirm('Tem certeza que quer limpar todos os pedidos no servidor?')) return;
      fetch('/api/clear', { method: 'POST' }).then(r => r.json()).then(res => {
        appendLog('Servidor: pedidos limpos');
      });
    });
  }

  // log local (apenas UI)
  function appendLog(text){
    if(!logList) return;
    const li = document.createElement('li');
    li.textContent = new Date().toLocaleTimeString() + ' — ' + text;
    logList.prepend(li);
    // manter top 100
    while(logList.children.length > 120) logList.removeChild(logList.lastChild);
  }

})();
