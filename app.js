/**
 * Created by chaclus on 2017/7/5.
 */
const convert = require('koa-convert');
const cors = require('koa-cors');
const koaStatic = require('koa-static');
const bodyParser = require('koa-bodyparser');
const Koa = require('koa');


const config = require('./config');
const Logger = require('./lib/logger');

let app = new Koa();

app.use(convert(cors()));
app.use(bodyParser());

//静态资源
app.use(koaStatic('./views'));
app.use(koaStatic('.'));

let Router = require('./routes/index');
Router.routes(app);


app.listen(config.port, function () {
    console.log('server is listening to http://127.0.0.1:' + config.port);
});


app.on('error', function (err, ctx) {
    console.error('err: ',err);
});