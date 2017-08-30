/**
 * Created by chaclus on 2017/7/14.
 */
var _ = require('lodash');


exports.check = function (params) {
    return params.some(function (item) {
        return _.isNull(item) || _.isUndefined(item) || (typeof item === 'string' && _.isEmpty(item));
    })
};


exports.replace = function (path) {
    return path.replace('////', '/').replace('///', '/').replace('//', '/');
};
