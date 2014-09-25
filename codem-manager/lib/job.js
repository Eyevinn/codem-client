var uuid = require('node-uuid')

function Job(data) {
    this.createTS = new Date();
    this.job_id = uuid.v4().replace(/-/g,'');

    this.source = data.source;
    this.formats = data.formats;
    this.tcd_job = {};
    this.tcd2format = {};
}

Job.prototype.add_tcd_job = function(format, tcd_job) {
    this.tcd_job[format] = tcd_job;
    this.tcd2format[tcd_job.job_id] = format;
    console.log("I created job " + format + " for source " + this.source);
    return tcd_job.job_id; // XXX  codem uses job_id when creating. not id
}

Job.prototype.update_tcd_job = function(tcd_job) {
    var format = this.tcd2format[tcd_job.id];
    this.tcd_job[format] = tcd_job;
    console.log("I updated job " + format + " for source " + this.source);
    return tcd_job.id; // XXX When sending notification, codem uses id, not job_id
}

Job.prototype.toString = function() {
    return JSON.stringify(this, null, 2);
}

module.exports = Job;
