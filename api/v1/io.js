/**
 * Created by chaclus on 2017/7/17.
 */

const JWT          = require('jsonwebtoken');

const config = require('../../config');
const RtnView = require('../../lib/rtnview');
const ProjectProxy = require('../../proxy/Project');

exports.token = async (ctx, next) => {
    await next();
    let req = ctx.request;

    let room_name = req.body.id ? req.body.id : config.io.default_room_name;
    let role = req.body.role;   //boss  worker

    if(!role) {
        console.error('ERR 301 io.token 参数错误, id: ' + id + ', role: ' + role);
        return RtnView.err301();
    }
    let token = JWT.sign({
        room_name: room_name,
        role: role
    }, config.jwt, {expiresIn: '1y'});
    ctx.body = RtnView.success({token: token});

    /*
    let pjt = ProjectProxy.get(id);
    if(pjt) {
        let info = {
            id: pjt.id,
            role: role,
            pjt: pjt
        };
        let token = JWT.sign(info, config.jwt, {expiresIn: 60 * 12});
        ctx.body = RtnView.success({token: token});
    }else{
        console.error('ERR 303 io.token > failed to get pjt by id[' + id + ']');
        ctx.body = RtnView.err303();
    }
    */
};
