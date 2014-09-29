var config = require('./config').load();
var chokidar = require('chokidar');
var watcher = chokidar.watch(config['watch']['directory'],
        {ignored: /[\/\\]\./, persistent: true, ignoreInitial: true});

var request = require('request');
var probe = require('node-ffprobe');

var incomingfiles = {};

function tick() {
    for (p in incomingfiles) {
        if (!incomingfiles[p].processed) {
            probe(p, function(err, probedata) {
                if (err) {
                    // File is probably growing. We need to wait for the complete file
                    return;
                }
                incomingfiles[p].processed = true;
                processfile(p, probedata);
            });
        }
    }
}

var timer = setInterval(tick, 1000);

watcher.on('add', function(path) {
    if (path.match(/\.mp4$/)) {
        incomingfiles[path] = {
            "processed": false
        };
    } else {
        console.log("Ignoring file with no .mp4 suffix");
    }
})

function processfile(path, probedata) {
    var job = { source       : path
               ,removesource : config.watch.removesource
               ,formats      : config.watch.profiles };
    
    request({ method: 'POST', 
              url: 'http://localhost:' + config.port + '/jobs', 
              form: JSON.stringify(job)}
          , function(err, res, body) {
              console.log('I got answer ' + body);
          });
} 

