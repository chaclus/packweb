/**
 * Created by chaclus on 2017/6/26.
 */

const moment = require('moment');

const fs = require('fs');
const exec = require('child_process').exec;
const Spawn = require('child_process').spawn;


const mkdirp = require('mkdirp');
const XmlParse = require('xml2js').parseString;
const EventProxy = require('eventproxy');

let spawn = (cmd, arg, opt, nortn) => {
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



let replace = function (path) {
    return path.replace('////', '/').replace('///', '/').replace('//', '/');
};

let igDir = function (path, dirs) {
    let flag = false;
    if(!path || !dirs || dirs.length === 0) {
        return flag;
    }
    for (let i = 0; i < dirs.length; i++) {
        let dir = dirs[i];
        if (path.startsWith(dir)) {
            flag = true;
            break;
        }
    }
    return flag;
};

let igFile = function (path, files) {
    let flag = false;

    if(!path || !files || files.length === 0) {
        return flag;
    }
    for (let i = 0; i < files.length; i++) {
        let file = files[i];
        if (path.endsWith(file)) {
            flag = true;
            break;
        }
    }
    return flag;
};


/**
 * 查询svn文件，并根据指定规则进行校验
 * @param query
 * @param callback
 */
let findSvnFileByQuery = function (query) {
    return new Promise((resolve, reject) => {
        let pjt_url = query.pjt_url;
        let btime = query.btime;
        let etime = query.etime;

        let authors = query.authors;
        let ignore_dirs = query.ignore_dirs ? query.ignore_dirs.split(',') : [];
        let ignore_files = query.ignore_files ? query.ignore_files.split(',') : [];

        let pjt_name = query.pjt_name;
        let cmd = 'svn log -r ' + '{' + btime + '}:{' + etime + '}' + ' -v --xml';
        spawn('svn', ['log', pjt_url, '-r', '{' + btime + '}:{' + etime + '}', '-v', '--xml']).then((ret) => {
            if (!ret) {
                console.error('failed to spawn cmd: ' + cmd, err);
                reject(err);
            } else {
                console.log('spawn: ' + cmd);
                XmlParse(ret, function (err, ret) {
                    if (err) {
                        console.error('parse xml to obj failure,', err);
                        reject(err);
                    } else {
                        let p_set = new Set();
                        let entries = ret.log.logentry;
                        if(!entries){
                            return reject(new Error('no file commited'));
                        }

                        console.log('files and folder size: ' + entries.length);
                        for (let i = 0; i < entries.length; i++) {
                            let entry = entries[i];
                            let author = entry.author[0];
                            let date = entry.date[0];
                            let paths = entry.paths[0].path;

                            //作者过滤
                            if (authors && authors.length > 0 && authors.lastIndexOf(author) < 0) {
                                continue;
                            }

                            for (let j = 0; j < paths.length; j++) {
                                let path = paths[j];

                                let action = path.$.action;
                                let kind = path.$.kind;
                                let p = path._;

                                //过滤指定文件
                                if (ignore_files && ignore_files.length > 0 && igFile(p, ignore_files)) {
                                    continue;
                                }

                                if (kind !== 'dir') {
                                    let f = p.substring(pjt_name.length + 1, p.length);

                                    //目录过滤
                                    if (ignore_dirs && ignore_dirs.length > 0 && igDir(f, ignore_dirs)) {
                                        continue;
                                    }

                                    if (action === 'D') {
                                        p_set.delete(f)
                                    } else {
                                        p_set.add(f);
                                    }
                                }
                            }
                        }

                        console.log('updated files ' + p_set.size);
                        resolve({paths: Array.from(p_set)});
                    }
                });
            }
        }).catch((err) => {
            console.error('failed to svn query: ' + cmd, err);
            reject(err);
        });
    });
};

//备份
let bak = (data) => {
    let pjt_out = data.pjt_out;
    let build_dir = replace(data.pjt_dir + '/build');
    let bak_dir = replace(build_dir + '/' + moment().format('YYYYMMDDHHmmss'));

    return new Promise((resole, reject) => {
        fs.stat(pjt_out, (err, stat) => {
            if (err) {
                console.log("pjt_out[" + pjt_out + "] was not existed, no files to baked");
                resole();
            } else {

                mkdirp(bak_dir, (err, ret) => {
                    if (err) {
                        console.error('field to create folder[' + bak_dir + ']', err);
                        reject(err);
                    } else {

                        let mv_cmd = 'mv -f ' + pjt_out + ' ' + bak_dir;
                        exec(mv_cmd, (err, stdout, stderr) => {
                            if (err) {
                                console.error('pjt baked err, cmd: ' + mv_cmd, err);
                                reject(err);
                            } else {
                                resole();
                            }
                        });
                    }
                });
            }
        })
    });
};



let copyToPath = function (data, callback) {

    let paths = data.paths; //svn 文件路径

    let pjt_name = data.pjt_name;

    let pjt_dir = data.pjt_dir;
    let pjt_out = data.pjt_out;


    mkdirp(pjt_out, function (err) {
        if (err) {
            console.error('mkdir failed, folder: ' + pjt_out);
            callback(err);
        } else {

            let ep = new EventProxy();
            ep.after('cp', paths.length, function () {
                callback(null, {pjt_name: pjt_name, out_dir: pjt_out})
            });

            //cp to tmp dir
            paths.forEach(function (path) {
                let folder = replace(pjt_out + path.substring(0, path.lastIndexOf('/')));
                mkdirp(folder, function (err) {
                    if (err) {
                        throw new Error('mkdir failed, folder: ' + folder);
                    } else {
                        let writer = fs.createWriteStream(replace(pjt_out + '/' + path));
                        fs.createReadStream(replace(pjt_dir + '/' + path)).pipe(writer);

                        writer.on('err', function (err) {
                            throw new Error('failed to copy file, file: ' + path);
                        });
                        writer.on('close', function (err) {
                            ep.emit('cp');
                        });
                    }
                });
            });
        }
    });
};


let tar = function (data) {
    return new Promise((resolve, reject) => {
        let pjt_name = data.pjt_name;
        let pjt_out = data.pjt_out;
        let pjt_dir = data.pjt_dir;

        let tar_path = pjt_out + '.tar.gz';//{tar_path: pjt_out + '.tar.gz'}
        let cmd = 'tar -zcvf ' + pjt_name + '.tar.gz ' + pjt_name + ', cwd: ' + replace(pjt_dir + '/build');
        spawn('tar', ['-zcvf', pjt_name + '.tar.gz', pjt_name], {cwd: replace(pjt_dir + '/build')}).then((ret) => {
            console.log('spawn cmd: ' + cmd);
            resolve({tar_path: tar_path});
        }).catch((err) => {
            console.error('faild to tar project, cmd: ' + cmd, err);
            reject(err);
        });
    });
};

let scp = function (data, callback) {
    let sudo_pass = data.sudo_pass;
    let tar_path = data.tar_path;
    let server_pass = data.server_pass;

    let scps = data.scps;
    if (!scps || scps.length === 0) {
        callback(null, null);
    }

    scps = scps.split(',');
    let ep = new EventProxy();

    ep.after('finish', scps.length, function () {
        callback(null, 'finish');
    });


    scps.forEach(function (scp) {
        if (scp.lastIndexOf('$path$') < 0) {
            console.error('illegal scp command, eg: sudo scp $path$   centos@192.168.3.30:/tmp/')
            ep.emit('finish');
        } else {

            scp = scp.replace('$path$', tar_path);
            if (sudo_pass) {
                if(scp.lastIndexOf('sudo')  > -1) {
                    scp = scp.replace('sudo', 'echo ' + sudo_pass + ' | sudo -S ');
                }
            }else if(server_pass) {
                scp = 'sshpass -p ' + server_pass + ' ' + scp;
            }

            exec(scp, function (err, stdout, stderr) {
                if (err) {
                    console.error('failed to exec scp command, scp: ' + scp, err);
                } else {
                    console.log('scp command: ' + scp);
                    console.log('stdout: ', stderr);
                    console.log('stderr: ', stderr);
                    ep.emit('finish');
                }
            });
        }
    });
};


let svnCheckOut = (data) => {
    return new Promise((resolve, reject) => {
        let root_dir = data.root_dir;

        let pjt_url = data.pjt_url;
        let pjt_dir = data.pjt_dir;
        let pjt_out = data.pjt_out;

        fs.stat(pjt_out, (err, ret) => {
            if (err) {
                mkdirp(pjt_out, (err) => {
                    if (err) {
                        console.error('mkdir failed, folder: ' + pjt_out, err);
                        return reject(err);
                    } else {
                        let cmd = 'svn checkout ' + pjt_url + ', cwd: ' + root_dir;
                        spawn('svn', ['checkout', pjt_url], {cwd: root_dir}, true).then(() => {
                            console.log('cmd: ' + cmd);
                            resolve();
                        }).catch((err) => {
                            console.error('svn checkout, cmd: ' + cmd, err);
                            reject(err);
                        });
                    }
                });
            } else {
                let cmd = 'svn update , cwd: ' + pjt_dir;
                spawn('svn', ['update'], {cwd: pjt_dir}, true).then(() => {
                    console.log('cmd: ' + cmd);
                    resolve();
                }).catch((err) => {
                    console.error('svn update, cmd: ' + cmd, err);
                    reject(err);
                });
            }
        })
    });
};

let svnUpdate = function (data) {
    return new Promise((resolve, reject) => {
        let pjt_dir = data.pjt_dir;
        let pjt_url = data.pjt_url;

        let u = 'svn cleanup';
        exec(u, {cwd: pjt_dir}, (err, stdout, stderr) => {
            if (err) {
                console.error('failed to clear svn at folder[' + pjt_dir + ']', err);
                return reject(err);
            } else {
                console.log('exec cmd: ' + u);
                console.log('exec stdout: ' + stdout);
                console.log('exec stderr: ' + stderr);

                let cmd = 'svn update';
                spawn('svn', ['update'], {cwd: pjt_dir}, true).then(() => {
                    resolve();
                }).catch((err) => {
                    console.error('failed to update svn at folder[' + pjt_dir + ']', err);
                    return reject(err);
                });
            }
        })
    });
};



/**
 * 解析JSON配置文件
 * @param path
 * @param callback
 */
let readJsonFile = function (path, callback) {
    fs.stat(path, function (err, ret) {
        if(err) {
            callback(err);
        }else{
            fs.readFile(path, 'utf8', function (err, data) {
                if (err){
                    callback(err);
                }else{
                    callback(null, JSON.parse(data));
                }

            });
        }
    });
};

exports.tar = (pjt) => {
    return new Promise((resolve, reject) => {
        let ep = new EventProxy();
        let data = pjt;

        ep.on('svn_update', () => {
            console.log('\r\n');
            console.log('\r\n');
            console.log('#########svn update begin#########');
            svnUpdate(data).then(() => {
                console.log('#########svn update end#########');
                ep.emit('svn_query');
            }).catch((err) => {
                reject(err);
            })
        });


        ep.on('svn_query', function () {
            console.log('\r\n');
            console.log('\r\n');
            console.log('#########svn query begin#########');
            findSvnFileByQuery(data).then((fRet) => {
                console.log('#########svn query end#########');
                if(!fRet || fRet.paths.length === 0) {
                    console.error('no updated svn files.');
                    return resolve();
                }
                data.paths = fRet.paths;
                ep.emit('bak');
            }).catch((err) => {
                reject(err);
            });
        });


        ep.on('bak', () => {
            console.log('\r\n');
            console.log('\r\n');
            console.log('#########bak pjt begin#########');
            bak(data).then(() => {
                console.log('#########bak pjt begin#########');
                ep.emit('cp');
            }).catch((err) => {
                reject(err);
            })
        });



        ep.on('cp', function () {
            console.log('\r\n');
            console.log('\r\n');
            console.log('#########cp begin#########');
            copyToPath(data, function (err, cpRet) {
                if (err || !cpRet) {
                    console.error("cp svn file to out_dir failure.", err);
                    return reject(err);
                } else {

                    console.log('#########cp finish#########');
                    ep.emit('tar_pjt');
                }
            });

        });

        ep.on('tar_pjt', function () {
            console.log('\r\n');
            console.log('\r\n');
            console.log('#########tar project begin#########');
            tar(data).then((ret) => {
                console.log('#########tar project finish#########');
                resolve();
            }).catch((err) => {
                reject(err);
            });
        });


        //begin
        ep.emit('svn_update');
    });
};


exports.up = (pjt) => {
    return new Promise((resolve, reject) => {
        let ep = new EventProxy();
        let data = pjt;

        //tar path
        data.tar_path = pjt.pjt_out + '.tar.gz';

        ep.on('scp_pjt', function () {
            console.log('>>>>>>>scp project begin<<<<<<<<');
            scp(data, function (err, scpRet) {
                if (err || !scpRet) {
                    console.error("scp tar, err: ", err);
                    return reject(err);
                } else {
                    console.log('>>>>>>>scp project finish<<<<<<<<\r\n');
                    resolve();
                }
            });
        });

        ep.emit('scp_pjt');
    });
};


exports.checkout = (data) => {
    return new Promise((resolve, reject) => {
        console.log('\r\n');
        console.log('\r\n');
        console.log('#########check out begin#########');
        svnCheckOut(data).then(() => {
            console.log('#########check out finish#########');
            resolve();
        }).catch((err) => {
            reject(err);
        })
    });
};
