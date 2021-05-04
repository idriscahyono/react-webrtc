const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketio(server);
const port = process.env.PORT || 3030;
const peers = io.of('/webrtcPeer');
let connectedPeers = new Map();

app.use(express.static(path.join(__dirname, '../react-webrtc/build')));
app.get('/', (re, res) => res.sendFile(path.join(__dirname, '../react-webrtc/build/index.html')));

peers.on('connection', (socket) => {
  console.log(socket.id);
  socket.emit('connection-success', { succes: socket.id });

  connectedPeers.set(socket.id, socket);

  socket.on('disconnect', () => {
    console.log('disconnected');
    connectedPeers.delete(socket.id);
  });

  socket.on('offerOrAnswer', (data) => {
    for (const [socketID, socket] of connectedPeers.entries()) {
      if (socketID !== data.socketID) {
        console.log('OfferOrAnswer', socketID, data.payload.type);
        socket.emit('offerOrAnswer', data.payload);
      }
    }
  });

  socket.on('candidate', (data) => {
    for (const [socketID, socket] of connectedPeers.entries()) {
      if (socketID !== data.socketID) {
        console.log('Candidate', socketID, data.payload);
        socket.emit('candidate', data.payload);
      }
    }
  });
});

server.listen(port, () => console.log('Server Running'));
