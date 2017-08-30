/**
 * Created by chaclus on 2017/7/5.
 */
const Router = require('koa-router');

const Index = require('../api/v1/index');
const Project = require('../api/v1/project');
const IO = require('../api/v1/io');


let paths = {
    '/index'                                : ['get',       Index.hello],
    '/pjt/get'                              : ['get',       Project.get],
    '/pjt/save'                             : ['post',      Project.save],
    '/pjt/list'                             : ['get',       Project.list],
    '/pjt/update'                           : ['post',      Project.update],
    '/pjt/all'                              : ['get',       Project.getAll],
    '/pjt/tar'                              : ['post',      Project.tar],
    '/pjt/up'                               : ['post',      Project.up],
    '/pjt/bak'                              : ['post',      Project.bak],
    '/pjt/deploy'                           : ['post',      Project.deploy],
    '/pjt/auto'                             : ['post',      Project.auto],

    //io
    '/io/token'                             : ['post', IO.token],
};


let filter = async function (ctx, next) {

    // console.log('ctx', ctx);
    await next();
};

exports.getRouters = function (doman) {
    let router = Router({
        prefix: doman
    });

    for (let path in paths) {
        let data = paths[path];

        let mth = data[0];
        let func = data[1];

        console.log('path: ' + path);
        router[mth](path, filter, func);
    }

    return router.routes();
    // app.use(router.routes())
};