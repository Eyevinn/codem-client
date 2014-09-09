/*
The MIT License (MIT)

Copyright (c) 2014 Exceeds Your Expecations Vinn AB

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var express = require('express')
   ,request = require('request')
   ,     fs = require('fs')
   , FastList = require('fast-list')
   ,builder = require('xmlbuilder')
   ,   temp = require('temp').track(); //TODO Should probably use this

var config = require('./config').load();
var server = null;
var jobqueue = new FastList();


// This needs to be configurable

var transcoders = [ 'http://localhost:8080/jobs'
                   , 'http://127.0.0.1:8080/jobs' ];

exports.launch = function() {
    server = express();
    server.post('/jobs',postNewJobs);
    server.get('/jobs',getTranscoderStatus);
    server.get('/',getTranscoderStatus);

    server.use(express.static(__dirname + '/public',  // While developing -
                {'index': false,                      // host files to transcode
                 'setHeaders': function(res,path){res.attachment(path)}}));

    server.listen(8099,"localhost");
    console.log("I listen");
}

//------ getTranscoderStatus ----------------------------------------------------
getTranscoderStatus = function(req, res) {
    _getTranscoderStatus(function(responses) {
        var body = responses;
        res.setHeader('Content-Type','application/json; charset=utf-8');
        res.end(JSON.stringify(body), 'utf8');
    });
}

function _getTranscoderStatus(callback) {
    var responses = {} , gotten = 0;
    for (var i=0; i<transcoders.length; i++) {
        request(transcoders[i], function(err, res) {
            if (err) {
                console.log(err);
            } else {
                responses[res.request.href] = JSON.parse(res.body);
            }
            if (++gotten == transcoders.length) { //All answers are in
                callback(responses);
            }
        });
    }
}

//------ postNewJobs -----------------------------------------------------------
postNewJobs = function(req, res) {
    var postData = "";
    req.on('data', function(data) { postData += data; });
    req.on('end', function() { processPostedJob(postData, res); } );    
}

processPostedJob = function(postData, res) {
    console.log("Somebody POSTed to me:\n" + postData); 
    var post = JSON.parse(postData);
    var localsource;
    var localdest =  '/tmp/';
    var getsource = request(post.source);
    var basename;
    getsource.on('response', function(res) { 
        var regmatch = res.headers['content-disposition'].match(/attachment; filename="?(([^".]+)\.(mp4|MP4))"?/);
        basename=regmatch[2];
        var suffix=regmatch[3]; // mp4 or MP4
        if (!suffix) { return; }; //FIXME
        localdest += basename + '/';
        fs.mkdir(localdest);
        localsource = localdest + basename + '.mp4';
        console.log("Fetching file to " + localsource);
        res.pipe(fs.createWriteStream(localsource));
    });
    getsource.on('end', function(){
        createSMIL(localsource, basename, localdest);
        enqueJobs({ 'source_file'     : localsource 
                   ,'destination_dir' : localdest
                   ,'file_basename'   : basename}); 
    });
    var body = {};
    body['message'] = "Job hopefully enqueued";
    res.setHeader('Content-Type','application/json; charset=utf-8');
    res.statusCode = 202; //Job accepted
    res.end(JSON.stringify(body), 'utf8');
}

enqueJobs = function(jobinfo) {
    for (key in config.profile) {
        var job = { 'source_file'      : jobinfo.source_file
                   ,'destination_file' : jobinfo.destination_dir + jobinfo.file_basename + '_' + key + '.mp4'
                   ,'encoder_options'  : config.profile[key].encoder };
        jobqueue.push(job);
    }
}

//------ Queue polling ---------------------------------------------------------
//TODO Would be better if the polling could continue directly if there are more jobs in the queue
function tick() {
    if ( jobreq = jobqueue.shift() ) {
        console.log('I picked from the jobqueue ' + JSON.stringify(jobreq));
        _getTranscoderStatus(function(responses) {
            console.log("I got responses " + JSON.stringify(responses));
            var keys = Object.keys(responses);
            keys.sort( function(a,b) { 
                return responses[b].free_slots - responses[a].free_slots; });
            var selected = keys[0];
            if (selected && responses[selected].free_slots > 0) {
                console.log("Sending to " + selected + ' which has ' + responses[selected].free_slots);
                request({  
                    method : 'POST'
                    , url  : selected
                    , form : JSON.stringify(jobreq) } ,
                    function(err, res, body) {
                        var job = JSON.parse(body);
                        console.log(job.message, job.job_id);
                    });
            } else {
                console.log("Nothing available: " + (selected?responses[selected].free_slots:'No transcoder nodes'));
                jobqueue.unshift(jobreq); //Back to front of queue
            }
        });
    }
}
 
var timer = setInterval(tick, 8000);

//------ SMIL creation ---------------------------------------------------------

function getSourceData(probedata) {
    var srcdata = {
        "ext": probedata['fileext']  
    };
    if (probedata['metadata']) {
        srcdata['title'] = probedata['metadata']['title'];
    }
    for (i = 0; i < probedata['streams'].length; i++) {
        var stream = probedata['streams'][i];
        if (stream['codec_type'] == 'video') {
            srcdata['width'] = stream['width'];
            srcdata['height'] = stream['height'];
            srcdata['videobitrate'] = stream['bit_rate'];
        } else if (stream['codec_type'] == 'audio') {
            srcdata['audiobitrate'] = stream['bit_rate'];
        }
    }
    return srcdata;
} 

function createSMIL(localsource,basename,destpath) {
    var probe = require('node-ffprobe');
    probe(localsource, function(err, probedata) {
        var srcdata = getSourceData(probedata);
        var root = builder.create('smil', {version: '1.0', encoding: 'UTF-8', standalone: true}); 
        root.att('title', srcdata['title'] || basename);

        var rootsw = root.ele('body').ele('switch');
        var el = rootsw.ele('video', {'height': srcdata['height'], 'width': srcdata['width'], 'src': basename + '.mp4'});
        el.ele('param', {'name': 'videoBitrate', 'value': srcdata['videobitrate'], 'valuetype': 'data'});
        el.ele('param', {'name': 'audioBitrate', 'value': srcdata['audiobitrate'], 'valuetype': 'data'});

        for (key in config.profile) {
            var p = config.profile[key];
            var h = p['height'];
            var w = p['width'];
            var src = basename + '_' + key + '.mp4';
            var vb = p['video'];
            var ab = p['audio'];

            el = rootsw.ele('video', {'height': h, 'width': w, 'src': src});
            el.ele('param', {'name': 'videoBitrate', 'value': vb, 'valuetype': 'data'});
            el.ele('param', {'name': 'audioBitrate', 'value': ab, 'valuetype': 'data'});
        }      
        var smilxml = rootsw.end({ pretty: true });
        fs.writeFile(destpath + basename + ".smil", smilxml);
    });
}
