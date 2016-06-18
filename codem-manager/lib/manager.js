/*
The MIT License (MIT)

Copyright (c) 2014 Exceeds Your Expectations Vinn AB

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
   ,     fs = require('fs-extra')
   ,   path = require('path')
   , FastList = require('fast-list')
   ,   uuid = require('node-uuid')
   ,  Model = require('./job')
   ,watcher = require('./watcher');


var Job = Model.Job;
var TCD = Model.TCD;
var config = require('./config').load();
var server = null;
var jobqueue = new FastList();
var tcdStatus = {};

var log = console.log;

//------ getCodemNotification --------------------------------------------------
getCodemNotification = function(codemdata, callback) {
    TCD.update_tcd(codemdata,callback);
}

//------ getTranscoderStatus ----------------------------------------------------
function getTranscoderStatus(callback) {
    var responses = {} , gotten = 0;
    var transcoders = config.transcoderapi.transcoders;
    for (var i=0; i<transcoders.length; i++) {
        request(transcoders[i] + '/jobs', function(err, res) {
            if (err) {
                log(err);
            } else {
                responses[res.request.href] = JSON.parse(res.body);
            }
            if (++gotten == transcoders.length) { //All answers are in
                tcdStatus = responses; //TODO Update jobs variable from this info
                callback(responses);
            }
        });
    }
}

var mkdirSync = function (path) {
    try {
        fs.mkdirSync(path);
    } catch(e) {
        if ( e.code != 'EEXIST' ) throw e;
    }
}

function exists(path) {
    try {
        fs.statSync(path);
    } catch(e) {
        return false;
    }
    return true;
}

function getJobs(callback) {
    Job.getJobs(callback);
}

function noOfFreeSlots(callback) {
    getTranscoderStatus(function(tcd) {
        var sum = Object.keys(tcd).reduce(
            function(s,key){ return s + tcd[key].free_slots; },0);
        callback(sum);
    });
}

processPostedJob = function(post, callback) {
    var job = Job.create_job(post);
    console.log("Created job " + job);

    var localsource;
    var localdest =  config.localdestination + '/';
    job.setDestination(localdest);
    var basename;
    var suffix;
    if (post.source.match(/^http/)) {
        var getsource = request(post.source);
        getsource.on('response', function(res) { 
            log(res.headers);
            var contentdisp = res.headers['content-disposition'];
            if (contentdisp) {
                var regmatch = contentdisp.match(/attachment; filename="?(([^".]+)\.(mp4|MP4))"?/);
                basename=regmatch[2];
            } else {
                var path = res.req.path;
                var regmatch = path.match(/([^.\/]+)\.(mp4|MP4)$/);
                basename=regmatch[1];
            }
            localdest += basename + '/';
            mkdirSync(localdest);
            localsource = localdest + basename + '_orig.mp4';
            log("Fetching file to " + localsource);
            res.pipe(fs.createWriteStream(localsource));
        });
        getsource.on('end', function(){
            enqueJobs({'job_id'           : job.job_id
                       ,'source_file'     : localsource 
                       ,'destination_dir' : localdest
                       ,'formats'         : post.formats
                       ,'file_basename'   : basename}); 
        });
    } else { //TODO Check the existence of localsource
        localsource = post.source;
        var regmatch = localsource.match(/([^.\/]+)\.(mp4|mov)$/i);
        basename = regmatch[1];
        suffix = regmatch[2];
        localdest = path.join(localdest,basename);

        // Check for already existing path //////////////////
        var newpath = localdest;
        var duplicates = 1;
        while (exists(newpath)) {
            newpath = localdest + ++duplicates;
        }
        if (duplicates>1) {
            localdest = newpath;
            basename += duplicates;
        }
        /////////////////////////////////////////////////////

        mkdirSync(localdest);
        if (suffix.match(/mp4/i)) {
            var orig = path.join(localdest, basename + '_orig.mp4');
            log('Copying source to ' + orig);
            fs.copy(localsource, orig, function(err) {
                // XXX What if error?
                job.setOriginalCopy(orig);
            });
            post.formats.splice(post.formats.indexOf('orig'),1);
        }
        job.setBasename(basename);
        enqueJobs({'job_id'           : job.job_id
                   ,'source_file'     : localsource 
                   ,'destination_dir' : localdest
                   ,'formats'         : post.formats
                   ,'file_basename'   : basename}); 
    }
    callback();
}

enqueJobs = function(jobinfo) {
    var formats = jobinfo.formats || Object.keys( config.profile );
    log("I will encode formats " + JSON.stringify(formats));
    for (i=0; i<formats.length; i++) {
        var cfg = config.profile[formats[i]];
        if (!cfg) continue;
        var encoder_options = 
            '-s ' + cfg.width + 'x' + cfg.height + 
            ' -b:v ' + cfg.video + ' -b:a ' + cfg.audio + 
            ' ' + cfg.options;
        var codem_job = {'job_id'            : jobinfo.job_id
                         ,'format'           : formats[i]
                         ,'source_file'      : jobinfo.source_file
                         ,'destination_file' : path.join(jobinfo.destination_dir,
                                                         jobinfo.file_basename + '_' + formats[i] + '.mp4')
                         ,'callback_urls'    : [ 'http://' + config.transcoderapi.manager + ':' + config.port + '/codem_notify' ]
                         ,'encoder_options'  : encoder_options };
        jobqueue.push(codem_job);
    }
}

//------ Queue polling ---------------------------------------------------------
function postCodemJob(tcd) {
    if (tcdStatus[tcd].free_slots <= 0) {
        return;
    }
    log('Sending to ' + tcd + ' which now has ' + tcdStatus[tcd].free_slots + ' free slots.');
    request({  
        method : 'POST',
        url    : tcd,
        form   : JSON.stringify(jobqueue[0]) } ,
        function(err, res, body) {
            if (err) {
                log("Error on job post:", err);
            } else {
                try {
                    var job = jobqueue.shift();
                    var codemjob = JSON.parse(body);
                    codemjob.format = job.format;
                    codemjob.master_id = job.job_id;
                    log("Started codem job " + codemjob.job_id + " belonging to job " + job.job_id);
                    TCD.create_tcd(codemjob);
                } catch(e) {
                    log("Error on codem response parsing", e);
                }
            }
        });
}

function getFreeTranscoder() {
    var keys = Object.keys(tcdStatus);
    keys.sort( function(a,b) { 
        return tcdStatus[b].free_slots - tcdStatus[a].free_slots; });
    var tcd = keys[0];
    if (tcd && tcdStatus[tcd].free_slots > 0) {
        tcdStatus[tcd].free_slots--;
        return tcd;
    } else
        return;
}

function handleJobQueue(responses) {
    var tcd;
    while (jobqueue.length && (tcd=getFreeTranscoder())) {
        postCodemJob(jobqueue[0], tcd);
    }
}

function tick() {
    if (jobqueue.length)
        getTranscoderStatus(handleJobQueue);
}
 
var timer = setInterval(tick, 5000);

exports.getTranscoderStatus = getTranscoderStatus;
exports.getJobs = getJobs;;
exports.processPostedJob = processPostedJob;;
exports.getCodemNotification = getCodemNotification;
exports.noOfFreeSlots = noOfFreeSlots;

