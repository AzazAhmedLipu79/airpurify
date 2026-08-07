const EventEmitter = require('events');

class AppEventEmitter extends EventEmitter {}

const eventEmitter = new AppEventEmitter();
eventEmitter.setMaxListeners(50);

module.exports = eventEmitter;
