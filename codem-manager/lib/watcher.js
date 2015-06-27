var config = require('./config').load();
var chokidar = require('chokidar');
var fs = require('fs');
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
                var size = fs.statSync(p).size;
                if (size != incomingfiles[p].size) {
                    console.log("File " + p + " has size " + size + " and still growing.");
                    incomingfiles[p].size = size;
                    return;
                }
                incomingfiles[p].processed = true;
                processfile(p, probedata);
            });
        }
    }
}

var timer = setInterval(tick, 5000);

watcher.on('add', function(path) {
    if (path.match(/\.(mp4|mov)$/i)) {
        incomingfiles[path] = {
            "processed": false,
            "size" : 0
        };
    } else {
        console.log("Ignoring file with no .mp4 or .mov suffix");
    }
})

function processfile(path, probedata) {
    var job = { source       : path
               ,removesource : config.watch.removesource
               ,formats      : config.watch.profiles };
    
    request({ method: 'POST', 
              url: 'http://localhost:' + config.port + '/jobs', 
              form: job}
          , function(err, res, body) {
              console.log('I got answer ' + body);
          });
} 

