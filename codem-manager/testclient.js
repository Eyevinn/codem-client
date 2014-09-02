#!/usr/bin/env node
var request = require('request');

//request({method: 'GET', url: 'http://localhost:8099/'}
//        , function(err, res, body) {
//            console.log('I got GET answer ' + body);
//        });

var job = { 'source'      : '/Users/fred/trailer.mp4'
           ,'destination' : '/tmp/fredo'};
request({method: 'POST', url: 'http://localhost:8099/', form: JSON.stringify(job)}
        , function(err, res, body) {
            console.log('I got answer ' + body);
        });
console.log("I'm here");

