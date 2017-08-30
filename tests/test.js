/**
 * Created by chaclus on 2017/7/6.
 */
const fs = require('fs');
const moment = require('moment');
const Cmd = require('../lib/cmd');




let testSvnStatus = function () {
    Cmd.spawn('svn', ['status']).then((data) => {
        console.log("data: ", data);
    }).catch((err) => {
        console.error('err: ', err);
    })
};

let testFileStat = () => {
    fs.stat('/Users/chaclus/WebstormProjects/packweb/xx', (err, ret) => {
        console.log('ret: ', ret);
        console.error('err: ', err);
    })
};

let testSpawnCmd = function () {
    Cmd.spawn('ls', [], {cwd: '/Users/chaclus/WebstormProjects/packweb'}).then((data) => {
        console.log("data: ", data);
    }).catch((err) => {
        console.error('err: ', err);
    })
};

let testPromise = () => {

    let fo = (num) => {
        return new Promise((resolve, reject) => {
            if (num && num > 0) {
                resolve(num);
            } else {
                reject(new Error('illegal params '));
            }
        })
    };

    fo(10).then(() => {
        console.log('resolve ...');
    }).catch((err) => {
        console.error('reject ...');
    });
};

let testEndsWith = () => {

    let pth = '/artisan_man/models/ShortVideo.js';
};
/**
 * 测试moment格式化输出
 */
let testMomentFormat = () => {
    console.log('::   ' + moment().format('YYYYMMDDHHmmss'));
};


/**
 * 测试array返回名称
 */
let testTypOfArray = () => {
    let a = ['a', 'b'];
    console.log('array: ' + (typeof a));
};

/**
 * 测试 promise resolve是否可以返回多个参数
 */
let testPromiseReturn = () => {
    let fo = (num) => {
        return new Promise((resolve, reject) => {
            if (num && num > 0) {
                resolve(num, num);
            } else {
                reject(new Error('illegal params '));
            }
        })
    };

    fo(10).then((r1, r2) => {
        console.log('resolve ...');
    }).catch((err) => {
        console.error('reject ...');
    });
};

/**
 * 测试lowdb是否支持 update  obj.obj.filed
 */
let testLowdbUpdate = () => {

    const uuid = require('uuid');
    const lowdb = require('lowdb');

    const COLLECTION_NAME = 'users';

    let User = lowdb('../data/test.json', {storage: require('lowdb/lib/storages/file-async')});
    User.defaults({users: []}).write();

    let save = () => {
        User.get(COLLECTION_NAME).push({
            id: uuid(),
            name: 'aa',
            coins: {
                salary: 100,
                extra_gains: 10
            }
        }).write();
    };

    let updateSalary = () => {
        let ret = User.get(COLLECTION_NAME)
            .find({id: 'e24f8c35-fee1-491b-b013-b7e561ca260c'})
            .get('coins')
            .assign({
                salary: 1000
            })
            .write().then((data) => {
                console.log('data: ', data);
            }).catch((err) => {
                console.error('err: ', err)
            });


        console.log('ret : ', ret);
    };

    let update = () => {
        let ret = User.get(COLLECTION_NAME)
            .find({id: 'e24f8c35-fee1-491b-b013-b7e561ca260c'})
            .assign({
                auto: 1
            })
            .write()
    };
    update();

};



/**
 * 测试从console中获取输出日志
 */
let testGetDataFromConsole = ()=> {
    let replaceConsole = () => {
        console.log = (msg, data) => {
            console.info(msg, data);
        }
    };

    replaceConsole();

    setTimeout(function () {
        console.log('111', {name: 'haha'});
        console.log('111');
        console.log('111');
    }, 1000);
};

let testConsoleLogWrapByLog4j = () => {
    const logger = require('../lib/logger');
    logger.use(null);

    console.log('aaa');
    console.error(new Error('aaa'));
};

let testMd5 = () => {
    const Crypto = require('crypto-js');

    let md5 = Crypto.MD5()
};