/**
 * Created by chaclus on 2017/7/14.
 */


exports.err301 = () => {
    return {
        returncode: 301,
        data: {}
    }
};

exports.err303 = () => {
    return {
        returncode: 303,
        data: {}
    }
};

exports.success = (data) => {
    return {
        returncode: 200,
        data: data ? data : {}
    }
};



exports.sucPage = (data) => {
    return {
        returncode: 200,
        data: {
            limit: data.limit,
            offset: data.offset,
            list: data.list
        }
    };
};