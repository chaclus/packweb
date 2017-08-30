/**
 * Created by chaclus on 2017/7/5.
 */
const cors = require('koa-cors');
const convert = require('koa-convert');
const koaStatic = require('koa-static');
const bodyParser = require('koa-bodyparser');


const Koa = require('koa');

const config = require('./config');
const logger = require('./lib/logger');

let app = new Koa();

app.use(convert(cors()));

//sio server
const server = require('./io/sioService');
server(app, 7001);