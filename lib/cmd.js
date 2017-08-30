/**
 * Created by chaclus on 2017/7/14.
 */
const Spawn = require('child_process').spawn;

exports.spawn = (cmd, arg, opt, nortn) => {
    return new Promise((resolve, reject) => {
        if(!cmd) {
            return reject(new Error('cmd must be not null'));
        }
        let _opt = opt ? opt : {};
        let show = nortn ? nortn : false;   //是否输出命令执行过程，且不返回data内容

        let outData = [], errData = [];
        let child = Spawn(cmd, arg, _opt);

        child.on('error', function (err) {
            return reject(err);
        });

        child.stdout.on('data', (data) => {
            if (show) {
                console.log('spawn:::' + data);
            } else {
                outData.push(data);
            }
        });

        child.stderr.on('data', (data) => {
            errData.push(data);
        });

        child.on('close', (code, signal) => {
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
