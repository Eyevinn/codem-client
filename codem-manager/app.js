#!/usr/bin/env /usr/local/bin/node
var express = require('express');
var mgr = require('./lib/manager.js');
var stylus = require('stylus');
var nib = require('nib');
var path = require('path');
var logger = require('morgan');
var bodyParser = require('body-parser');
var app = express();

function compile(str, path) {
  return stylus(str)
    .set('filename', path)
    .use(nib());
}

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.set('port', 8099); //TODO read config

// Get log prints in the console
app.use(logger('dev'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended : true}));

// Compile stylus syntax to CSS
app.use(stylus.middleware(
  { src: path.join(__dirname, 'public'),
    compile: compile
  }
));

// To serve any file in that dir?
app.use(express.static(path.join(__dirname, 'public')));

var index = require('./routes/index');
var jobs = require('./routes/jobs');
var codem = require('./routes/codem');

app.use('/',index);
app.use('/jobs',jobs);
app.use('/codem_notify',codem);

var server = app.listen(app.get('port'), function() {});
console.log("Codem manager listening on port " + app.get('port'));

