var express = require('express')
   ,request = require('request');
var server = null;
var FastList = require('fast-list');
var queue = new FastList();


// This needs to be configurable

var transcoders = [ 'http://localhost:8080/jobs'
                   , 'http://127.0.0.1:8080/jobs' ];

exports.launch = function() {
    server = express();
    server.post('/',postNewJobs);
    server.get('/',getTranscoderStatus);
    server.listen(8099,"localhost");
    console.log("I listen");
}

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
        //console.log("Calling " + transcoders[i]);
        request(transcoders[i], function(err, res2, body) {
            //console.log("Getting " + JSON.stringify(res2) + " response");
            //console.log("Getting " + res2.request.href + " response");
            //console.log("Getting " + body + " body");
            responses[res2.request.href] = JSON.parse(body);
            if (++gotten == transcoders.length) { //All answers are in
                callback(responses);
            }
        });
    }
}

postNewJobs = function(req, res) {
    var postData = "";
    req.on('data', function(data) { postData += data; });
    req.on('end', function() { processPostedJob(postData, res); } );    
}

processPostedJob = function(postData, res) {
    console.log("Somebody POSTed to me:\n" + postData); 
    var post = JSON.parse(postData);
    var source = post.source; //TODO: Accept non-local URL
    var destination = post.destination; //TODO: Accept non-local URL
    // job as codem-transcode wants it
    var job = { 'source_file'      : source
               ,'destination_file' : destination
               ,'encoder_options'  : "-s 284x160 -strict experimental -acodec aac -ab 48k -ac 2 -ar 48000 -vcodec libx264 -vprofile main -g 48 -b 240000"
    };
    //console.log("Job is \n " + JSON.stringify(job));
    enqueue(job);
    var body = {};
    body['message'] = "Job enqueued";
    res.setHeader('Content-Type','application/json; charset=utf-8');
    res.statusCode = 202; //Job accepted
    res.end(JSON.stringify(body), 'utf8');
}

function selectTranscoder(transcoders) {
    var keys = Object.keys(transcoders);
    var transcoder = keys.sort( function(a,b) { 
        return transcoders[b].free_slots - transcoders[a].free_slots; 
    } )[0];
}

// Queue stuff
//
function tick() {
    if ( jobreq = queue.shift() ) {
        console.log('I picked from the queue ' + JSON.stringify(jobreq));
        _getTranscoderStatus(function(responses) {
            console.log("I got responses " + JSON.stringify(responses));
            var keys = Object.keys(responses);
            keys.sort( function(a,b) { 
                return responses[b].free_slots - responses[a].free_slots; });
            var selected = keys[0];
            if (responses[selected].free_slots > 0) {
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
                console.log("Nothing available: " + responses[selected].free_slots);
                queue.unshift(jobreq); //Back to front of queue
            }
        });
    }
}
 
var timer = setInterval(tick, 8000);

enqueue = function(job) {
    queue.push(job);
};
