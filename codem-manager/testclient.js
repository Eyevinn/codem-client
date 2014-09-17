#!/usr/bin/env node
var request = require('request');

var job = {  source      : 'http://localhost:8099/download/trailer.mp4'
           , formats     : [ '360p', '160p' ]
           , destination : 'http://localhost:8099/upload/'}; //destination currently ignored

request({method: 'POST', url: 'http://localhost:8099/jobs', form: JSON.stringify(job)}
        , function(err, res, body) {
            console.log('I got answer ' + body);
        });
