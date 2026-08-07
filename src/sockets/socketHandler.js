const { Server } = require('socket.io');
const logger = require('../config/logger');

let io = null;

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    logger.info(`WebSocket client connected: ${socket.id}`);

    socket.on('subscribe:device', (deviceId) => {
      socket.join(`device:${deviceId}`);
      logger.debug(`Client ${socket.id} subscribed to device:${deviceId}`);
    });

    socket.on('disconnect', () => {
      logger.info(`WebSocket client disconnected: ${socket.id}`);
    });
  });

  logger.info('WebSocket Socket.IO server initialized.');
  return io;
}

function getSocketIO() {
  return io;
}

module.exports = {
  initSocket,
  getSocketIO,
};
