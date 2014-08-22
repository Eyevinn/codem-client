var chokidar = require('chokidar');
var watcher = chokidar.watch('/mnt/resource/incoming', {ignored: /[\/\\]\./, persistent: true, ignoreInitial: true});

var destpath = "/mnt/resource/test/";
var transcoderapi = "http://localhost:3080/jobs"

var builder = require('xmlbuilder');
var fs = require('fs');
var request = require('request');

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
      var dest720mp4;
      var srcname;
      srcfile.replace(/^(.*)\.mp4$/, function(_, name) {
        dest720mp4 = name + "_720p.mp4";
        dest360mp4 = name + "_360p.mp4";
        dest160mp4 = name + "_160p.mp4";
        srcname = name;
      }); 
    
      var job_720 = {
        "source_file": path,
        "destination_file": destpath + dest720mp4,
        "encoder_options": "-s 1280x720 -strict experimental -acodec aac -ab 128k -ac 2 -ar 48000 -vcodec libx264 -vprofile main -g 48 -b 1100000"
      };
      var job_360 = {
        "source_file": path,
        "destination_file": destpath + dest360mp4,
        "encoder_options": "-s 640x360 -strict experimental -acodec aac -ab 64k -ac 2 -ar 48000 -vcodec libx264 -vprofile main -g 48 -b 750000"
      };
      var job_160 = {
        "source_file": path,
        "destination_file": destpath + dest160mp4,
        "encoder_options": "-s 284x160 -strict experimental -acodec aac -ab 48k -ac 2 -ar 48000 -vcodec libx264 -vprofile main -g 48 -b 240000"
      };

      request({ method: 'POST', url: transcoderapi, form: JSON.stringify(job_720) }, function(err, res, body) {
        var job = JSON.parse(body);
        console.log(job.message, job.job_id);
      });
      request({ method: 'POST', url: transcoderapi, form: JSON.stringify(job_360) }, function(err, res, body) {
        var job = JSON.parse(body);
        console.log(job.message, job.job_id);
      });
      request({ method: 'POST', url: transcoderapi, form: JSON.stringify(job_160) }, function(err, res, body) {
        var job = JSON.parse(body);
        console.log(job.message, job.job_id);
      });

      var root = builder.create('smil', {version: '1.0', encoding: 'UTF-8', standalone: true}); 
      root.att('title', srcname);

      var rootsw = root.ele('body').ele('switch');
      var el = rootsw.ele('video', {'height': '720', 'width': '1280', 'src': dest720mp4});
      el.ele('param', {'name': 'videoBitrate', 'value': '1300000', 'valuetype': 'data'});
      el.ele('param', {'name': 'audioBitrate', 'value': '128000', 'valuetype': 'data'});
 
      el = rootsw.ele('video', {'height': '360', 'width': '640', 'src': dest360mp4});
      el.ele('param', {'name': 'videoBitrate', 'value': '820000', 'valuetype': 'data'});
      el.ele('param', {'name': 'audioBitrate', 'value': '64000', 'valuetype': 'data'});

      el = rootsw.ele('video', {'height': '160', 'width': '284', 'src': dest160mp4});
      el.ele('param', {'name': 'videoBitrate', 'value': '300000', 'valuetype': 'data'})
      el.ele('param', {'name': 'audioBitrate', 'value': '46000', 'valuetype': 'data'})
   
      var smilxml = rootsw.end({ pretty: true });
      fs.writeFile(destpath + srcname + ".smil", smilxml);
    }
}
