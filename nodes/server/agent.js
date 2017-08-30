/**
 * Created by chaclus on 2017/7/18.
 */

const mkdirp = require('mkdirp');
const moment = require('moment');
const request = require('request');
const io = require('socket.io-client');
const EventProxy = require('eventproxy');

const logger = require('./logger');

const fs = require('fs');
const path = require('path');
const Spawn = require('child_process').spawn;
const exec = require('child_process').exec;

const ig_path = path.resolve(__dirname, 'exclude.list');

const api_ip = '127.0.0.1', api_port = 7000;
const sio_ip = '127.0.0.1', sio_port = 7001;

class SvnProxy{
    constructor(){

    }

    spawn(cmd, arg, opt, nortn) {
        return new Promise((resolve, reject) => {
            console.log('########## SPAWN ########');
            if (!cmd) {
                return reject(new Error('cmd must be not null'));
            }
            console.log('cmd: ' + cmd);

            let _opt = opt ? opt : {};
            let show = nortn ? nortn : false;   //是否输出命令执行过程，且不返回data内容

            let outData = [], errData = [];
            let child = Spawn(cmd, arg, _opt);

            child.on('error', function (err) {
                return reject(err);
            });

            child.stdout.on('data', (data) => {
                if (show) {
                    console.log(data + '');
                } else {
                    outData.push(data);
                }
            });

            child.stderr.on('data', (data) => {
                errData.push(data);
            });

            child.on('close', (code, signal) => {
                console.log('########## SPAWN ########');

                let outDataStr = outData.join('');
                let errDataStr = errData.join('');

                if (code === 0 && errDataStr === '') {
                    resolve(outDataStr);
                } else {
                    let e = new Error(errDataStr);
                    e.code = code;
                    e.output = errDataStr;
                    reject(e);
                }
            });
        });
    };


    bak(data){
        return new Promise((resolve, reject) => {
            let r_deploy_dir = data.r_deploy_dir;
            let r_bak_dir = data.r_bak_dir;
            let date = moment().format('YYYYMMDD');

            let s_dir = (r_deploy_dir + '/' + data.pjt_name).replace('//', '/');
            let cwd = (r_bak_dir + '/' + date).replace('//', '/');

            console.log('project deploy folder > ' + s_dir);
            console.log('project back folder > ' + cwd);

            mkdirp(cwd, (err) => {
                if (err) {
                    reject(err);
                } else {
                    this.spawn('rsync', ['-av', '--exclude-from', ig_path, s_dir, '.'], {cwd: cwd}, true).then(() => {
                        resolve();
                    }).catch((err) => {
                        reject(err);
                    });
                }
            });
        });
    };


    /**
     * cp tar from tmp folder to deploy folder
     * @param data
     * @returns {Promise}
     */
    cpTar(data){
        return new Promise((resolve, reject) => {
            let r_deploy_dir = data.r_deploy_dir;
            let s_dir = '/tmp/' + data.pjt_name + '.tar.gz';

            let cmd = 'sudo cp -rf ' + s_dir + ' .';
            exec(cmd, {cwd: r_deploy_dir}, function (err, stdout, stderr) {
                if (err) {
                    console.error('failed to exec scp command, scp: ' + cmd, err);
                    return reject(err);
                } else {
                    console.log('cmd command: ' + cmd);
                    console.log('stdout: ', stderr);
                    console.log('stderr: ', stderr);
                    resolve();
                }
            });
        });
    };


    unTar(data){
        return new Promise((resolve, reject) => {
            let r_deploy_dir = data.r_deploy_dir;
            let tar_name = data.pjt_name + '.tar.gz';

            let cmd = 'tar -zxvf ' + tar_name + ', cwd: ' + r_deploy_dir;
            this.spawn('tar', ['-zxvf', tar_name], {cwd: r_deploy_dir}, true)
                .then(() => {
                    console.log('cmd: ' + cmd);
                    resolve();
                })
                .catch((err) => {
                    console.error('field to untar, cmd: ' + cmd, err);
                    reject(err);
                });
        });
    };



    pm2Del(data){
        return new Promise((resolve, reject) => {
            let r_deploy_dir = data.r_deploy_dir;
            let app_name = data.run_script.split('.')[0];

            let del_cmd = 'pm2 delete ' + app_name;
            exec(del_cmd, {cwd: r_deploy_dir}, (err, stdout, stderr) => {
                console.log('exec cmd: ' + del_cmd);
                console.log('err: ' + err);
                console.log('stdout: ' + stdout);
                console.log('stderr: ' + stderr);
                resolve();
            });
        });
    };

    pm2Start(data){
        return new Promise((resolve, reject) => {
            let run_script = data.run_script;

            let pjt_name = data.pjt_name;
            let r_deploy_dir = data.r_deploy_dir;

            let pjt_deploy_dir = (r_deploy_dir + '/' + pjt_name).replace('//', '/');

            let cmd = 'pm2 start ' + run_script;
            exec(cmd, {cwd: pjt_deploy_dir}, (err, stdout, stderr) => {
                if (err) {
                    console.error('failed to start pjt, cmd: ' + cmd, err);
                    reject(err);
                } else {

                    console.log('exec cmd: ' + cmd);
                    console.log('stdout: ' + stdout);
                    console.log('stderr: ' + stderr);
                    resolve();
                }
            });
        });
    };


    deploy(data){
        let self = this;
        return new Promise((resolve, reject) => {
            let ep = new EventProxy();


            ep.on('cp', () => {
                console.log('\r\n');
                console.log('\r\n');
                console.log('#########cp begin#########');

                self.cpTar(data).then(() => {
                    console.log('#########cp end#########');
                    ep.emit('untar');
                }).catch((err) => {
                    reject(err);
                })
            });


            ep.on('untar', () => {
                console.log('\r\n');
                console.log('\r\n');
                console.log('#########untar begin#########');

                self.unTar(data).then(() => {
                    console.log('#########untar end#########');
                    ep.emit('pm2_del');
                }).catch((err) => {
                    reject(err);
                });
            });

            ep.on('pm2_del', () => {
                console.log('\r\n');
                console.log('\r\n');
                console.log('#########pm2 del start#########');

                self.pm2Del(data).then(() => {
                    console.log('#########pm2 del end#########');
                    ep.emit('pm2_start');
                })
            });

            ep.on('pm2_start', () => {
                console.log('\r\n');
                console.log('\r\n');
                console.log('#########start start#########');

                self.pm2Start(data).then(() => {
                    console.log('#########start end#########');
                    resolve();
                }).catch((err) => {
                    reject(err);
                })
            });

            ep.emit('cp');
        });
    };
}




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
                role: 'server',
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
            //svn proxy to exec bak and deploy command
            let proxy = new SvnProxy();
            listenEvent(socket);
            console.log('server worker connected.');

            //logger
            logger.use(socket);

            socket.emit('enter');
            socket.on('success', (data) => {
                console.log('server worker join room.');
            });


            socket.on('bak', (data) => {
                console.log('\r\n');
                console.log('~~~~~~~~~~~~~bak~~~~~~~~~~~~~~~');
                console.log('get bak msg : ', data);
                proxy.bak(data).then(() => {
                    socket.emit('success', {returncode: 200, action: 'bak'});
                    console.log('bak ' + data.pjt_name + ' successfully.');
                    console.log('~~~~~~~~~~~~~bak~~~~~~~~~~~~~~~');
                }).catch((err) => {
                    console.error('failed to bak ' + data.pjt_name + ', err: ', err);
                    socket.emit('success', {returncode: 503, action: 'bak'});
                });

            });

            socket.on('deploy', (data) => {
                console.log('\r\n');
                console.log('~~~~~~~~~~~~~deploy~~~~~~~~~~~~~~~');
                console.log('get deploy msg : ', data);
                proxy.deploy(data).then(() => {
                    socket.emit('success', {returncode: 200, action: 'deploy'});
                    console.log('deploy ' + data.pjt_name + ' successfully.');
                    console.log('~~~~~~~~~~~~~deploy~~~~~~~~~~~~~~~');
                }).catch((err) => {
                    console.error('failed to deploy ' + data.pjt_name + ', err: ', err);
                    socket.emit('success', {returncode: 503, action: 'deploy'});
                });

            });
        });
    }).catch((err) => {
        console.error('get token err,', err);
    })
};

listen();