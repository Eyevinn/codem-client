var request = require('request');

var transcoderapi = 'http://localhost:3080/jobs';

var transcoder = {
  'max_slots': 0,
  'free_slots': 0,
  'jobs': []
};
 
exports.status = function() {
  request(transcoderapi, function(err, res, body) {
    var job = JSON.parse(body);
    for (var i in job['jobs']) {
      var j = job['jobs'][i];
      j.percentage = Math.round(j.progress * 100);
    }
    transcoder = job;
  });
  return transcoder;
};
