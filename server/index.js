const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketio(server);
const port = process.env.PORT || 3030;
const peers = io.of('/webrtcPeer');
let connectedPeers = new Map();

app.use(cors());

app.use(express.static(path.join(__dirname, '../react-webrtc/build')));
app.get('/', (re, res) => res.sendFile(path.join(__dirname, '../react-webrtc/build/index.html')));

peers.on('connection', (socket) => {
  connectedPeers.set(socket.id, socket);

  console.log(socket.id);

  socket.emit('connection-success', { succes: socket.id, peerCount: connectedPeers.size });

  const broadcast = () =>
    socket.broadcast.emit('joined-peers', {
      peerCount: connectedPeers.size,
    });
  broadcast();

  const disconnectedPeer = (socketID) =>
    socket.broadcast.emit('peer-disconnected', {
      peerCount: connectedPeers.size,
      socketID: socketID,
    });

  socket.on('disconnect', () => {
    console.log('disconnected');
    connectedPeers.delete(socket.id);
    disconnectedPeer(socket.id);
  });

  socket.on('onlinePeers', (data) => {
    for (const [socketID, _socket] of connectedPeers.entries()) {
      if (socketID !== data.socketID.local) {
        console.log('online-peer', data.socketID, socketID);
        socket.emit('online-peer', socketID);
      }
    }
  });

  socket.on('offer', (data) => {
    for (const [socketID, socket] of connectedPeers.entries()) {
      if (socketID === data.socketID.remote) {
        console.log('Offer', socketID, data.payload.type);
        socket.emit('offer', {
          sdp: data.payload,
          socketID: data.socketID.local,
        });
      }
    }
  });

  socket.on('answer', (data) => {
    for (const [socketID, socket] of connectedPeers.entries()) {
      if (socketID === data.socketID.remote) {
        console.log('Answer', socketID, data.payload.type);
        socket.emit('answer', {
          sdp: data.payload,
          socketID: data.socketID.local,
        });
      }
    }
  });

  // socket.on('offerOrAnswer', (data) => {
  //   for (const [socketID, socket] of connectedPeers.entries()) {
  //     if (socketID !== data.socketID) {
  //       console.log('OfferOrAnswer', socketID, data.payload.type);
  //       socket.emit('offerOrAnswer', data.payload);
  //     }
  //   }
  // });

  socket.on('candidate', (data) => {
    for (const [socketID, socket] of connectedPeers.entries()) {
      if (socketID === data.socketID.remote) {
        console.log('Candidate', socketID, data.payload);
        socket.emit('candidate', {
          candidate: data.payload,
          socketID: data.socketID.local,
        });
      }
    }
  });
});

server.listen(port, () => console.log('Server Running'));
