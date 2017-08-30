/**
 * Created by chaclus on 2017/7/14.
 */
const fs = require('fs');
const mkdirp = require('mkdirp');
const EventProxy = require('eventproxy');

const Cmd = require('../../lib/cmd');
const Tool = require('../../lib/tool');
const RtnView = require('../../lib/rtnview');
const SioMgr = require('../../lib/sioMgr');

const ProjectProxy = require('../../proxy/Project');


let init = (data) => {
    let pjt_url = data.pjt_url;
    let root_dir = data.root_dir;

    //pjt_name
    let pjt_name = pjt_url.endsWith('/') ? pjt_url.substring(0, pjt_url.length - 1).split('/').pop() : pjt_url.split('/').pop();
    let pjt_dir = Tool.replace(root_dir + '/' + pjt_name);
    let pjt_out = Tool.replace(pjt_dir + '/build/' + pjt_name);

    let ret = {
        pjt_name: pjt_name,
        pjt_dir: pjt_dir,
        pjt_out: pjt_out,
        pjt_url: pjt_url,
        root_dir: root_dir
    };
    return new Promise((resolve, reject) => {
        SioMgr.connect().then((socket) => {
            socket.emit('init', ret);
            return SioMgr.on('mgr', socket);
        }).then((data) => {
            if (data && data.returncode === 200) {
                resolve(ret);
            }else{
                reject(data);
            }
        }).catch((err) => {
            reject(err);
        })
    });
};

exports.save = async (ctx, next) => {
    await next();

    let req = ctx.request;
    let pjt_url = req.body.pjt_url;

    // let pjt_dir = req.body.pjt_dir;
    // let out_dir = req.body.out_dir;
    let root_dir = req.body.root_dir;

    let authors = req.body.authors;
    let ignore_dirs = req.body.ignore_dirs;
    let ignore_files = req.body.ignore_files;

    let server_pass = req.body.server_pass;
    let sudo_pass = req.body.sudo_pass;

    let r_deploy_dir = req.body.r_deploy_dir;
    let r_bak_dir = req.body.r_bak_dir;
    let run_script = req.body.run_script;

    let scps = req.body.scps;
    let btime = req.body.btime;
    let etime = req.body.etime;

    if (Tool.check([pjt_url, root_dir])) {
        console.error('ERR 301 project.save 参数错误');
        return ctx.body = RtnView.err301();
    }


    await init({pjt_url: pjt_url, root_dir: root_dir}).then((data) => {
        let doc = {
            root_dir: root_dir,
            pjt_url: pjt_url,
            pjt_name: data.pjt_name,
            pjt_dir: data.pjt_dir,
            pjt_out: data.pjt_out,
            authors: authors,
            ignore_dirs: ignore_dirs,
            ignore_files: ignore_files,

            server_pass: server_pass,
            sudo_pass: sudo_pass,
            r_deploy_dir: r_deploy_dir,
            r_bak_dir: r_bak_dir,
            run_script: run_script,

            scps: scps,
            btime: btime,
            etime: etime,

            //直播流程
            chain: {
                tar: 0,
                up: 0,
                bak: 0,
                deploy: 0
            }
        };

        try {
            let pjts = ProjectProxy.getByQuery({pjt_name: data.pjt_name});
            if (pjts.length === 0) {
                let ret = ProjectProxy.save(doc);
            }
            return ctx.body = RtnView.success();
        } catch (err) {
            console.error('ERR 303 project.save > save info', err);
            return ctx.body = RtnView.err303();
        }
    }).catch((err) => {
        if (err && err.returncode) {
            ctx.body = RtnView.err303()
        } else {
            console.error('ERR 303 project.save > init err: ', err);
            ctx.body = RtnView.err303();
        }
    });
};

exports.list = async (ctx, next) => {
    await next();
    let req = ctx.request;

    let offset = req.query.page ? req.query.offset : 0;
    let limit = req.query.size ? req.query.limit : 10;


    let query = {};

    let list = ProjectProxy.getByPage(query, limit, offset);
    ctx.body = RtnView.sucPage({
        offset: offset,
        limit: limit,
        list: list
    });
};

exports.get = async (ctx, next) => {
    await next();
    let req = ctx.request;

    let id = req.query.id;
    let pjt = {};
    if (id) {
        pjt = ProjectProxy.get(id);
        ctx.body = RtnView.success(pjt);
    }else{
        ctx.body = RtnView.err301();
    }
};


exports.update = async (ctx, next) => {
    await next();
    let req = ctx.request;

    let id = req.body.id;
    if(!id){
        console.error('ERR 301 project.update 参数错误');
        return ctx.body = RtnView.err301();
    }

    let data = {
        pjt_url: req.body.pjt_url,
        root_dir: req.body.root_dir,
        run_script: req.body.run_script,

        r_deploy_dir: req.body.r_deploy_dir,
        r_bak_dir: req.body.r_bak_dir,

        server_pass: req.body.server_pass,
        sudo_pass: req.body.sudo_pass,

        authors: req.body.authors,

        ignore_dirs: req.body.ignore_dirs,
        ignore_files: req.body.ignore_files,


        scps: req.body.scps,
        btime: req.body.btime,
        etime: req.body.etime,
    };


    let ret = ProjectProxy.updateById(id, data);
    ctx.body = RtnView.success(ret);
};

exports.tar = async (ctx, next) => {
    await next();
    let req = ctx.request;

    let id = req.body.id;
    if(!id) {
        console.error('ERR 301 project.tar 参数错误');
        return ctx.body = RtnView.err301();
    }

    let pjt = await ProjectProxy.get(id);
    if(pjt) {
        await SioMgr.connect().then((socket) => {
            socket.emit('tar', pjt);
            return SioMgr.on('mgr', socket);
        }).then((data) => {
            console.log('tar: ', data);

            return ProjectProxy.updateChainById(id, {tar: 1});
        }).then((data) => {
            ctx.body = RtnView.success();
        }).catch((err) => {
            console.error('ERR 303 project.tar > connect socket err, id: ' + id, err);
            ctx.body = RtnView.err303();
        });
    }else{
        console.error('ERR 303 project.tar > get pjt is null, id: ' + id);
        ctx.body = RtnView.err303();
    }
};


exports.up = async (ctx, next) => {
    await next();
    let req = ctx.request;

    let id = req.body.id;
    if (!id) {
        console.error('ERR 301 project.tar 参数错误');
        return ctx.body = RtnView.err301();
    }

    let pjt = ProjectProxy.get(id);
    if(pjt) {
        await SioMgr.connect().then((socket) => {
            socket.emit('up', pjt);
            return SioMgr.on('mgr', socket);
        }).then((data) => {
            console.log('up: ', data);

            return ProjectProxy.updateChainById(id, {up: 1});
        }).then(() => {
            ctx.body = RtnView.success();
        }).catch((err) => {
            console.error('ERR 303 project.tar > connect socket err, id: ' + id, err);
            ctx.body = RtnView.err303();
        });
    }else{
        console.error('ERR 303 project.tar > get pjt is null, id: ' + id);
        ctx.body = RtnView.err303();
    }
};


exports.bak = async (ctx, next) => {
    await next();
    let req = ctx.request;

    let id = req.body.id;
    if (!id) {
        console.error('ERR 301 project.bak 参数错误');
        return ctx.body = RtnView.err301();
    }

    let pjt = ProjectProxy.get(id);
    if (pjt) {
        await SioMgr.connect().then((socket) => {
            socket.emit('bak', pjt);
            return SioMgr.on('mgr', socket);
        }).then((data) => {
            console.log('bak: ', data);

            return ProjectProxy.updateChainById(id, {bak: 1});
        }).then(() => {
            ctx.body = RtnView.success();
        }).catch((err) => {
            console.error('ERR 303 project.tar > connect socket err, id: ' + id, err);
            ctx.body = RtnView.err303();
        });
    } else {
        console.error('ERR 303 project.bak > get pjt is null, id: ' + id);
        ctx.body = RtnView.err303();
    }
};

exports.deploy = async (ctx, next) => {
    await next();
    let req = ctx.request;

    let id = req.body.id;
    if (!id) {
        console.error('ERR 301 project.deploy 参数错误');
        return ctx.body = RtnView.err301();
    }

    let pjt = ProjectProxy.get(id);
    if (pjt) {
        await SioMgr.connect().then((socket) => {
            socket.emit('deploy', pjt);
            return SioMgr.on('mgr', socket);
        }).then((data) => {
            console.log('deploy: ', data);

            return ProjectProxy.updateChainById(id, {deploy: 1});
        }).then((chain) => {
            let flag = 1;
            for (let key in chain) {
                if (chain[key] === 0) {
                    flag = 0;
                    break;
                }
            }
            return ProjectProxy.updateById(id, {auto: flag});
        }).then(() => {
            ctx.body = RtnView.success();
        }).catch((err) => {
            console.error('ERR 303 project.deploy > connect socket err, id: ' + id, err);
            ctx.body = RtnView.err303();
        });
    } else {
        console.error('ERR 303 project.deploy > get pjt is null, id: ' + id);
        ctx.body = RtnView.err303();
    }
};



exports.getAll = async (ctx, next) => {
    await next();
    let req = ctx.request;

    let list = ProjectProxy.getByQuery({});
    ctx.body = RtnView.success(list);
};

exports.auto = async (ctx, next) => {
    await next();
    let req = ctx.request;


    let id = req.body.id;
    if (!id) {
        console.error('ERR 301 project.auto 参数错误');
        return ctx.body = RtnView.err301();
    }

    let pjt = ProjectProxy.get(id);
    if (pjt) {
        await SioMgr.connect().then((socket) => {
            socket.emit('tar', pjt);
            return SioMgr.chain('mgr', socket);
        }).then((data) => {
            console.log('tar done, continue ');

            let st = data._socket;
            st.emit('up', pjt);
            return SioMgr.chain('mgr', st);
        }).then((data) => {
            console.log('up done, continue');

            let st = data._socket;
            st.emit('bak', pjt);
            return SioMgr.chain('mgr', st);
        }).then((data) => {
            console.log('bak done, continue ');

            let st = data._socket;
            st.emit('deploy', pjt);
            return SioMgr.chain('mgr', st);
        }).then((data) => {
            console.log('deploy done, all chain was done.');

            let st = data._socket;
            if (st) {
                st.close();
            }

            return ProjectProxy.updateById(id, {auto: 1, last_update_at: Date.now()});
        }).then(() => {
            ctx.body = RtnView.success();
        }).catch((err) => {
            if (pjt.auto && pjt.auto === 1) {
                ProjectProxy.updateById(id, {auto: 0})
            }
            console.error('ERR 303 project.auto > connect socket err, id: ' + id, err);
            if (err.returncode) {
                ctx.body = err;
            } else {
                ctx.body = RtnView.err303();
            }
        });
    } else {
        console.error('ERR 303 project.auto > get pjt is null, id: ' + id);
        ctx.body = RtnView.err303();
    }
};