#!/usr/bin/env node
var request = require('request');

//request({method: 'GET', url: 'http://localhost:8099/'}
//        , function(err, res, body) {
//            console.log('I got GET answer ' + body);
//        });

var job = {  source      : 'http://localhost:8099/download/trailer.mp4'
           , formats     : [ '360p', '160p' ]
           , destination : 'http://localhost:8099/upload/'}; //destination currently ignored
request({method: 'POST', url: 'http://localhost:8099/jobs', form: JSON.stringify(job)}
        , function(err, res, body) {
            console.log('I got answer ' + body);
        });
