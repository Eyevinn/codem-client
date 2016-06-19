var config = require('./config').load();
var chokidar = require('chokidar');
var fs = require('fs');
var watcher = chokidar.watch(config['watch']['directory'],
        {ignored: /[\/\\]\./, persistent: true, ignoreInitial: true});

var request = require('request');
var probe = require('node-ffprobe');

var incomingfiles = {};

function tick() {
    var p;
    for (p in incomingfiles) {
        if (!incomingfiles[p].processed) {
            probe(p, function(err, probedata) {
                var file = probedata.file;
                if (err) {
                    // File is probably growing. We need to wait for the complete file
                    return;
                }
                var size = fs.statSync(file).size;
                if (size != incomingfiles[file].size) {
                    console.log("File " + file + " has size " + size + " and still growing.");
                    incomingfiles[file].size = size;
                    return;
                }
                incomingfiles[file].processed = true;
                processfile(probedata);
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

function processfile(probedata) {
    var job = { source       : probedata.file
               ,removesource : config.watch.removesource
               ,formats      : config.watch.profiles };
    
    request({ method: 'POST', 
              url: 'http://localhost:' + config.port + '/jobs', 
              form: job}
          , function(err, res, body) {
              console.log('I got answer ' + body);
          });
} 

