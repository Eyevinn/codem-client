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

var os = require('os');
var opts = require('argsparser').parse();
var fs = require('fs');

var config = {
    watch: {
               directory : '/tmp/incoming',
               profiles : [ '540p', '360p', '270p'],
               removesource : 1 },
    localdestination: '/tmp/',
    port: 8099,
    transcoderapi: {
        manager: 'localhost',   // How transcoder nodes can reach the manager
        transcoders: [
            'http://localhost:3080',
            'http://127.0.0.1:3080' 
            ] 
    },
    profile: {
        '540p': {
                  width: 960,
                  height: 540,
                  video: '3500000',
                  audio: '96000',
                  options: '-threads 0 -s 960x540 -strict experimental -acodec aac -ab 96k -ac 2 -ar 48000 -vcodec libx264 -vprofile main -g 48 -b:v 3500k' 
              },
        '360p': {
                  width: 640,
                  height: 360,
                  video: '1200000',
                  audio: '64000',
                  options: '-threads 0 -s 640x360 -strict experimental -acodec aac -ab 64k -ac 2 -ar 48000 -vcodec libx264 -vprofile main -g 48 -b:v 1200k'
              },
        '270p': {
                  width: 480,
                  height: 270,
                  video: '400000',
                  audio: '64000',
                  options: '-threads 0 -s 284x160 -strict experimental -acodec aac -ab 64k -ac 2 -ar 48000 -vcodec libx264 -vprofile main -g 48 -b:v 400k'
              }
    }
};

var loadedConfig = null;

exports.load = function() {
  if (opts['-c'] && !loadedConfig) {
    try {
      loadedConfig = eval('(' + fs.readFileSync(opts['-c'], 'utf8') + ')');
      ConfigUtils.merge(config, loadedConfig);
    } catch(err) {
      console.log('Error reading config from ' + opts['-c']);
      console.log(err);
      process.exit(1);
    }
  }
  return config;
}

var ConfigUtils = {
  merge: function(obj1, obj2) {
    for (key in obj2) {
      obj1[key] = obj2[key];
    }
  }
};
