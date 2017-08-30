/**
 * Created by chaclus on 2017/7/17.
 */

const request = require('request');
const io = require('socket.io-client');

const Pack = require('./index');
const logger = require('./logger');


const api_ip = '127.0.0.1', api_port = 7000;
const sio_ip = '127.0.0.1', sio_port = 7001;

let pjtQuery = () => {
    request({
        url: 'http://' + api_ip + ':' + api_port + '/pw/v1/pjt/all',
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        }
    }, (err, res, ret) =>{
        ret = typeof ret === 'string' ? JSON.parse(ret) : ret;
        if(ret && ret.returncode === 200) {
            let list = ret.data;
            console.log('list: ', list);
        }else{
            console.error('faild to get all project list, ret: ',ret);
        }
    });
};



let getToken = () => {
    return new Promise((resolve, reject) => {
        request({
            url: 'http://' + api_ip + ':' + api_port + '/pw/v1/io/token',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            json: {
                id: 'pw_room',
                role: 'client',
            }
        }, (err, res, ret) => {
            if(err) {
                reject(err);
            }else{
                try{
                    ret = typeof ret === 'string' ? JSON.parse(ret) : ret;
                    if(ret && ret.returncode === 200) {
                        let token = ret.data.token;
                        resolve(token);
                    }else{
                        reject(new Error('failed to get token, ret: ' + JSON.stringify(ret)));
                    }
                }catch(err){
                    reject(new Error('failed to get token, ret: ' + ret));
                }
            }
        })
    })
};

let listenEvent = (socket) => {
    socket.on('disconnect', (reason) => {
        console.log('disconnect > ', reason);
    });
    socket.on('reconnect', (attemptNumber) => {
        console.log('reconnect > ', attemptNumber);
    });
    socket.on('reconnect_error', (err) => {
        console.log('reconnect_error > ', err);
    });
    socket.on('reconnecting', (attemptNumber) => {
        console.log('reconnecting > ', attemptNumber);
    });
    socket.on('connect_timeout', (timeout) => {
        console.log('connect_timeout > ', timeout);
    });
    socket.on('connect_error', (err) => {
        console.log('connect_error > ', err);
    });
    socket.on('error', (err) => {
        console.log('error > ', err);
    });
};

let listen = () => {
    let url = 'http://' + sio_ip + ':' + sio_port + '/io';

    getToken().then((token) => {
        let socket = io(url, {
            'forceNew': true,
            'transports': ['websocket'],
            query: 'token=' + token
        });

        socket.on('connect', () => {
            //wrap console and emit log
            logger.use(socket);

            listenEvent(socket);

            console.log('socket connect successfully.');
            socket.emit('enter');
            socket.on('success', (data) => {
                console.log('success: ', data);
            });

            socket.on('init', (data) => {
                console.log('\r\n');
                console.log('\r\n');
                console.log('~~~~~~~~~~~~~init~~~~~~~~~~~~~~~');
                console.log('>>>>>>get tar msg : ', data);
                Pack.checkout(data).then(() => {
                    socket.emit('success', {returncode: 200, action: 'init'});
                    console.log('>>>>>>>>>>>>>>>>init done.');
                    console.log('~~~~~~~~~~~~~init~~~~~~~~~~~~~~~');
                }).catch((err) => {
                    //ignore
                    socket.emit('success', {returncode: 503, action: 'init'});
                });
            });

            socket.on('tar', (data) => {
                console.log('\r\n');
                console.log('\r\n');
                console.log('~~~~~~~~~~~~~tar~~~~~~~~~~~~~~~');
                console.log('>>>>>>get tar msg : ', data);
                Pack.tar(data).then(() => {
                    socket.emit('success', {returncode: 200, action: 'tar'});
                    console.log('>>>>>>>>>>>>>>>>tar done.');
                    console.log('~~~~~~~~~~~~~tar~~~~~~~~~~~~~~~');
                }).catch((err) => {
                    //ignore
                    socket.emit('success', {returncode: 503, action: 'tar'});
                });
            });

            socket.on('up', (data) => {
                console.log('\r\n');
                console.log('\r\n');
                console.log('~~~~~~~~~~~~~tar~~~~~~~~~~~~~~~');
                console.log('>>>>>>get up msg : ', data);
                Pack.up(data).then(() => {
                    socket.emit('success', {returncode: 200, action: 'up'});
                    console.log('>>>>>>>>>>>>>>>>up done.');
                    console.log('~~~~~~~~~~~~~tar~~~~~~~~~~~~~~~');
                }).catch((err) => {
                    //ignore
                    socket.emit('success', {returncode: 503, action: 'up'});
                });
            });
        });
    }).catch((err) => {
        console.error('get token err,', err);
    })
};

listen();




