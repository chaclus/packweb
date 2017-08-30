/**
 * Created by chaclus on 2017/7/5.
 */

var RouteV1 = require('./route_v1');

var PUB_PATH = '/pw';






exports.routes = function (app) {
    app.use(RouteV1.getRouters(PUB_PATH + '/v1'));
};