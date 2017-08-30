const Log4j = require('log4js');
const util = require('util');

let _socket = null;
Log4j.configure({
    appenders: {
        console: {
            type: 'console',
            filename: 'pk.log'
        },
        file: {
            type: 'file',
            filename: 'pk.log'
        }
    },
    categories: {
        default: {
            appenders: ['console', 'file'], level: 'info'
        }
    }
});


const logger = Log4j.getLogger();
logger.wrapConsoleLog = function(){
    const args = Array.from(arguments);
    const data = util.inspect(args, {
        depth: null,
        color: true
    });
    if (_socket) {
        _socket.emit('log', {level: 'info', content: data});
    }
    logger.info(args);
};

logger.wrapConsoleErr = function(){
    const args = Array.from(arguments);
    const data = util.inspect(args, {
        depth: null,
        color: true
    });
    if (_socket) {
        _socket.emit('log', {level: 'error', content: data});
    }
    logger.error(args);
};


console.log = logger.wrapConsoleLog.bind(logger);
console.error = logger.wrapConsoleErr.bind(logger);

let use = (socket) => {
    _socket = socket;
};

exports.use = use;
