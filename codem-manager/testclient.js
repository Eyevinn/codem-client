#!/usr/bin/env node
var request = require('request');

var job = {  source      : 'http://localhost:8099/trailer.mp4',
             removesource: 0,
             formats     : [ '270p', '360p' ] };

request({method: 'POST', 
         url: 'http://localhost:8099/jobs', 
         form: job},
         function(err, res, body) {
            console.log('I got answer ' + body);
        });
