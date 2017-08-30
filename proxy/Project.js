/**
 * Created by chaclus on 2017/7/14.
 */

const uuid = require('uuid');
const lowdb = require('lowdb');

const COLLECTION_NAME = 'projects';
// persisted using async file storage
let Project = lowdb('./data/project.json', {storage: require('lowdb/lib/storages/file-async')});
Project.defaults({projects: []}).write();


exports.save = function (data) {
    let doc = {
        id: uuid(),
        root_dir: data.root_dir,

        pjt_name: data.pjt_name,
        pjt_url: data.pjt_url,
        pjt_dir: data.pjt_dir,
        pjt_out: data.pjt_out,

        authors: data.authors,
        ignore_dirs: data.ignore_dirs,
        ignore_files: data.ignore_files,
        run_script: data.run_script,

        server_pass: data.server_pass,
        sudo_pass: data.sudo_pass,
        r_deploy_dir: data.r_deploy_dir,
        r_bak_dir: data.r_bak_dir,

        scps: data.scps,
        btime: data.btime,
        etime: data.etime,
        create_at: Date.now(),

        //执行链
        chain: data.chain
    };

    return Project.get(COLLECTION_NAME).push(doc).write();
};

exports.getByQuery = (query) => {
    return Project.get(COLLECTION_NAME)
        .filter(query)
        .take(1)
        .value();
};


exports.getByPage = (query, list, offset,) => {
    return Project.get(COLLECTION_NAME)
        .filter(query)
        .slice(offset, (offset + list))
        .value();
};

exports.getByCount = (query) => {
    return Project.get(COLLECTION_NAME)
        .filter(query)
        .size()
        .value()
};


exports.get = (id) => {
    return Project.get(COLLECTION_NAME).find({id: id}).value();
};


exports.updateById = (id, data) => {
    let doc = {};
    for (let key in data) {
        if (data[key]) {
            doc[key] = data[key];
        }
    }


    return Project.get(COLLECTION_NAME)
        .find({id: id})
        .assign(doc)
        .write()
};


exports.updateChainById = (id, data) => {
    let doc = {};
    for (let key in data) {
        if (data[key]) {
            doc[key] = data[key];
        }
    }
    return Project.get(COLLECTION_NAME)
        .find({id: id})
        .get('chain')
        .assign(doc)
        .write()
};