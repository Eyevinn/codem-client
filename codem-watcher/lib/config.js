var os = require('os');
var opts = require('argsparser').parse();
var fs = require('fs');

var config = {
  watchfolder: '/mnt/resource/incoming',
  destination: '/mnt/resource/test/',
  transcoderapi: 'http://localhost:3080/jobs',
  profile: {
    '720p': {
      'width': 1280,
      'height': 720,
      'video': '1300000',
      'audio': '128000',
      'encoder': "-s 1280x720 -strict experimental -acodec aac -ab 128k -ac 2 -ar 48000 -vcodec libx264 -vprofile main -g 48 -b 1100000" 
    },
    '360p': {
      'width': 640,
      'height': 360,
      'video': '820000',
      'audio': '64000',
      'encoder': "-s 640x360 -strict experimental -acodec aac -ab 64k -ac 2 -ar 48000 -vcodec libx264 -vprofile main -g 48 -b 750000"
    },
    '160p': {
      'width': 284,
      'height': 160,
      'video': '300000',
      'audio': '46000',
      'encoder': "-s 284x160 -strict experimental -acodec aac -ab 48k -ac 2 -ar 48000 -vcodec libx264 -vprofile main -g 48 -b 240000"
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
