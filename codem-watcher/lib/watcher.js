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

var config = require('./config').load();
var chokidar = require('chokidar');
var watcher = chokidar.watch(config['watchfolder'], {ignored: /[\/\\]\./, persistent: true, ignoreInitial: true});
var opts = require('argsparser').parse();

var destpath = config['destination'];
var transcoderapi = config['transcoderapi'];

var builder = require('xmlbuilder');
var fs = require('fs-extra');
var request = require('request');
var profile = config['profile'];
var probe = require('node-ffprobe');

watcher
  .on('add', function(path) {
    console.log("ADD", path);

    probe(path, function(err, probedata) {
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
        if (opts['--dry-run']) {
          console.log(srcdata);
        }
      }
      importfile(path, srcdata);
    });
  })

function importfile(path, srcdata) {
    var srcfile;

    path.replace(/^(.*\/)?([^/]*)$/, function(_, dir, file) {
      srcfile = file;
    });
    if(srcdata['ext'] == '.mp4') {
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
       
        if (opts['--dry-run']) {
           console.log("Dry run - not enqueing " + settings['file']);
        } else {
          request({ method: 'POST', url: transcoderapi, form: JSON.stringify(jobreq) }, function(err, res, body) {
            var job = JSON.parse(body);
            console.log(job.message, job.job_id);
          });
        }
      }
      var origdest = srcname + '_' + 'orig' + '.mp4';
      if (opts['--dry-run']) {
        console.log("Dry run - not copying " + origdest);
      } else {
        fs.copy(path, destpath + origdest, function(err) {
          if (err) {
            console.error(err);
          } else {
            console.log("Source file copied");
          }
        });
      }

      var root = builder.create('smil', {version: '1.0', encoding: 'UTF-8', standalone: true}); 
      root.att('title', srcdata['title']||srcname);

      var rootsw = root.ele('body').ele('switch');
      var el = rootsw.ele('video', {'height': srcdata['height'], 'width': srcdata['width'], 'src': origdest});
      el.ele('param', {'name': 'videoBitrate', 'value': srcdata['videobitrate'], 'valuetype': 'data'});
      el.ele('param', {'name': 'audioBitrate', 'value': srcdata['audiobitrate'], 'valuetype': 'data'});

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
      if (opts['--dry-run']) {
        console.log("Dry run - not writing SMIL file");
        console.log(smilxml);
      } else {
        fs.writeFile(destpath + srcname + ".smil", smilxml);
      }
    }
}
