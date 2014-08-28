var config = require('./config').load();
var transcoderapi = config['transcoderapi'];
var opts = require('argsparser').parse();
var request = require('request');
var FastList = require('fast-list');
var queue = new FastList();

function tick() {
  request(transcoderapi, function(err, res, body) {
    var status = JSON.parse(body);
    if (status['free_slots'] > 0) {
      var jobreq = queue.pop();
      if (jobreq) {
        if (opts['--dry-run']) {
          console.log("Dry run - not enqueing ", jobreq);
        } else {
          request({ method: 'POST', url: transcoderapi, form: JSON.stringify(jobreq) }, function(err, res, body) {
            var job = JSON.parse(body);
            console.log(job.message, job.job_id);
          });
        }
      }
    }
  }); 
}
  
var timer = setInterval(tick, 8000);

exports.enqueue = function(job) {
  queue.push(job);
};
