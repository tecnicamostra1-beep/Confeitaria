// server.js — versão para deploy (Express + Socket.IO)
// Uso local: node server.js
// Uso online: Railway, Render, Fly.io

const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const { Server } = require('socket.io');
const fs = require('fs');

const PORT = process.env.PORT || 3000;
const ORDERS_FILE = path.join(__dirname, 'orders.json');

// === Express + CORS ===
const app = express();
app.use(cors());
app.use(express.json());

// serve a pasta PUBLIC
app.use(express.static(path.join(__dirname, 'public')));

// === Servidor HTTP + WebSocket ===
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

// === Persistência dos pedidos ===
function loadOrders(){
  try {
    if(fs.existsSync(ORDERS_FILE)){
      const raw = fs.readFileSync(ORDERS_FILE, 'utf8');
      return JSON.parse(raw || '[]');
    }
  } catch(e){ console.error('Erro loadOrders', e); }
  return [];
}

function saveOrders(orders){
  try {
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf8');
  } catch(e){ console.error('Erro saveOrders', e); }
}

let orders = loadOrders();

// === API REST ===
app.get('/api/orders', (req, res) => {
  return res.json(orders);
});

app.post('/api/clear', (req, res) => {
  orders = [];
  saveOrders(orders);
  io.emit('orders:update', orders);
  return res.json({ ok: true });
});

// === Socket.IO ===
io.on('connection', (socket) => {
  console.log('Socket conectado:', socket.id);

  socket.emit('orders:init', orders);

  socket.on('order:new', (payload) => {
    const order = {
      id: 'o' + Date.now() + Math.floor(Math.random()*900),
      item: payload.item,
      name: payload.name || 'Cliente',
      qty: payload.qty || 1,
      status: 'Aguardando',
      time: new Date().toLocaleString()
    };
    orders.push(order);
    saveOrders(orders);
    io.emit('orders:update', orders);
    console.log('Pedido novo:', order);
  });

  socket.on('order:update', (data) => {
    const idx = orders.findIndex(o => o.id === data.id);
    if(idx > -1){
      orders[idx].status = data.status;
      saveOrders(orders);
      io.emit('orders:update', orders);
      console.log('Pedido atualizado:', orders[idx]);
    }
  });

  socket.on('disconnect', () => {
    console.log('Socket desconectado:', socket.id);
  });
});

// === Iniciar servidor ===
server.listen(PORT, () => {
  console.log(`Servidor ONLINE na porta: ${PORT}`);
});
