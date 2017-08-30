/**
 * Created by chaclus on 2017/7/17.
 */

const JWT = require('jsonwebtoken');
const io = require('socket.io-client');


const config = require('../config');

let getToken = () => {
    return JWT.sign({
        room_name: config.io.default_room_name,
        role: 'manager'
    }, config.jwt, {expiresIn: 60 * 12});
};


exports.connect = () => {
    return new Promise((resolve, reject) => {
        let url = 'http://127.0.0.1:7001/io';

        let token = getToken();
        let socket = io(url, {
            'forceNew': true,
            'transports': ['websocket'],
            query: 'token=' + token
        });

        socket.on('connect', () => {
            console.log('socket connect successfully.');

            socket.emit('enter');
            socket.on('success', (data) => {
                resolve(socket);
            });

            socket.on('error', (err) => {
                reject(err);
            })
        });
    })
};

exports.on = (eventType, socket) => {
    return new Promise((resolve, reject) => {
        socket.on(eventType, (data) => {
            if(socket) {
                socket.close();
            }
            resolve(data);
        });
    });
};

exports.chain = (eventType, socket) => {
    return new Promise((resolve, reject) => {
        socket.on(eventType, (data) => {
            if(data && data.returncode === 200) {
                resolve({
                    data: data,
                    _socket: socket
                });
            }else{
                reject(data);
            }
        });
    });
};
