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
               profiles : [ 'orig', '540p', '360p', '160p'],
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
        'orig': {
                  width: 1280,
                  height: 720,
                  video: '3500000',
                  audio: '96000',
                  options: '-codec:v libx264 -threads 1 -s 1280x720 -profile:v main -preset veryfast -crf 16 -g 75 -keyint_min 75 -maxrate 6000k -bufsize 12000k -vf scale=-1:480 -threads 0 -codec:a  aac -strict -2  -b:a 240k'
              },
        '540p': {
                  width: 960,
                  height: 540,
                  video: '3500000',
                  audio: '96000',
                  options: '-codec:v libx264 -threads 1 -s 960x540 -profile:v main -preset veryfast -crf 16 -g 75 -keyint_min 75 -maxrate 3500k -bufsize 7000k -vf scale=-1:480 -threads 0 -codec:a  aac -strict -2  -b:a 128k'
              },
        '360p': {
                  width: 640,
                  height: 360,
                  video: '1200000',
                  audio: '64000',
                  options: '-codec:v libx264 -threads 1 -s 640x360 -profile:v baseline -preset veryfast -crf 16 -g 75 -keyint_min 75 -maxrate 1200k -bufsize 2400k -vf scale=-1:480 -threads 0 -codec:a  aac -strict -2  -b:a 96k'
              },
        '160p': {
                  width: 480,
                  height: 270,
                  video: '400000',
                  audio: '64000',
                  options: '-codec:v libx264 -threads 1 -s 284x160 -profile:v baseline -preset veryfast -crf 16 -g 75 -keyint_min 75 -maxrate 400k -bufsize 800k -vf scale=-1:480 -threads 0 -codec:a  aac -strict -2  -b:a 96k'
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
