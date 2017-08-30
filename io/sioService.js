/**
 * Created by chaclus on 2017/7/17.
 */
const JWT = require('socketio-jwt');

const config = require('../config');
const RtnView = require('../lib/rtnview');

const IOV1 = require('./v1/sio');


module.exports = (app, port) => {
    let server = require('http').createServer(app.callback());

    let ioServer = require('socket.io')(server, {
        log: true,
        "transports": ["websocket", "polling"]
    });

    server.listen(port);
    console.log('start socket server http://127.0.0.1:' + port);

    let io = ioServer.of('/io');

    //handshake authorize
    io.use(JWT.authorize({secret: config.jwt, handshake: true}));

    io.on('connection', (socket) => {
        let token = socket.decoded_token;
        let role = token.role;
        let room = token.room_name;


        //socket listen
        socket.join(token.room_name);
        socket.on('enter', (data) => {
            console.log('socket enter, role: ' + role);
            socket.emit('success', RtnView.success());
        });

        socket.on('tar', (data) => {
            if (role === 'manager') {
                socket.broadcast.to(room).emit('tar', data);
            }
        });

        socket.on('up', (data) => {
            if (role === 'manager') {
                socket.broadcast.to(room).emit('up', data);
            }
        });

        socket.on('bak', (data) => {
            if (role === 'manager') {
                socket.broadcast.to(room).emit('bak', data);
            }
        });

        socket.on('deploy', (data) => {
            if (role === 'manager') {
                socket.broadcast.to(room).emit('deploy', data);
            }
        });

        socket.on('init', (data) => {
            if (role === 'manager') {
                socket.broadcast.to(room).emit('init', data);
            }
        });


        socket.on('success', (data) => {
            socket.broadcast.to(room).emit('mgr', data);
        });

        socket.on('log', (data) => {
            if(data) {
                data.role = role;
            }
            socket.broadcast.to(room).emit('log', data);
        });
    });
};