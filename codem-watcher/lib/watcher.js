var config = require('./config').load();
var chokidar = require('chokidar');
var watcher = chokidar.watch(config['watchfolder'], {ignored: /[\/\\]\./, persistent: true, ignoreInitial: true});

var destpath = config['destination'];
var transcoderapi = config['transcoderapi'];

var builder = require('xmlbuilder');
var fs = require('fs');
var request = require('request');
var profile = config['profile'];

watcher
  .on('add', function(path) {
    console.log("ADD", path);
    importfile(path);
  })

function importfile(path) {
    var srcfile;
    path.replace(/^(.*\/)?([^/]*)$/, function(_, dir, file) {
      srcfile = file;
    });
    console.log(srcfile);
    if(srcfile.match(/\.mp4$/)) {
      var srcname;
      srcfile.replace(/^(.*)\.mp4$/, function(_, name) {
        srcname = name;
      }); 
   
      for (key in profile) {
        var settings = profile[key];
        settings['file'] = srcname + '_' + key + '.mp4';
        var jobreq = {
          "source_file": path,
          "destination_file": destpath + settings['file'],
          "encoder_options": settings['encoder']
        };
        request({ method: 'POST', url: transcoderapi, form: JSON.stringify(jobreq) }, function(err, res, body) {
          var job = JSON.parse(body);
          console.log(job.message, job.job_id);
        });
      }

      var root = builder.create('smil', {version: '1.0', encoding: 'UTF-8', standalone: true}); 
      root.att('title', srcname);

      var rootsw = root.ele('body').ele('switch');
      var el = null;
      for (key in profile) {
        var p = profile[key];
        var h = p['height'];
        var w = p['width'];
        var src = p['file'];
        var vb = p['video'];
        var ab = p['audio'];

        el = rootsw.ele('video', {'height': h, 'width': w, 'src': src});
        el.ele('param', {'name': 'videoBitrate', 'value': vb, 'valuetype': 'data'});
        el.ele('param', {'name': 'audioBitrate', 'value': ab, 'valuetype': 'data'});
      } 
      var smilxml = rootsw.end({ pretty: true });
      fs.writeFile(destpath + srcname + ".smil", smilxml);
    }
}
