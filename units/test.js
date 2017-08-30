/**
 * Created by chaclus on 2017/7/17.
 */

const assert = require('assert');
const request = require('request');


let ip = '127.0.0.1', port = 3000;
describe('packweb mocha test', () => {
    describe('#/io/token', ()=> {
        it('should return token without err', (done) => {
            request.post({
                url: 'http://' + ip + ':' + port + '/pw/v1/io/token',
                method: 'post',
                headers: {
                    'Content-Type': 'application/json',
                },
                json: {
                    id: 'c7914525-4184-4182-aedb-4421593c5bcf',
                    role: 'worker'
                }
            }, (err, res, ret) => {
                if (ret && ret.data.token) {
                    assert.ok(true);
                    done();
                }
            });
        });
    });
});
