/**
 * Created by chaclus on 2017/7/5.
 */

exports.hello = async function (ctx, next){
    ctx.body = {name: 'Koa', desc: 'Hello Koa'};
};