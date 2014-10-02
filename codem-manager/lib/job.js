var uuid = require('node-uuid'),
    fs = require('fs');

function Job(data) {
    this.createTS = new Date();
    this.job_id = uuid.v4().replace(/-/g,'');

    this.source = data.source;
    this.removesource = data.removesource || 0;
    this.originalCopy = data.originalCopy;
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

Job.prototype.remove_source = function() {
    if (!this.source.match(/^http/)) {
        if (!this.originalCopy) {
            console.log("Have no copy of source. Will not remove");
            return;
        }
        if (this.originalCopy == this.source) {
            console.log('"Copy" of source points to source. Will not remove.');
            return;
        }
        var source_stat = fs.statSync(this.source);
        var orig_stat = fs.statSync(this.originalCopy);
        if (source_stat.size != orig_stat.size) {
            console.log('Original copy size ' + orig_stat.size + 
                        ' not equal to source size ' + source_stat.size);
            return;
        }
        console.log("Removing source " + this.source);
        fs.unlinkSync(this.source);
    }
}

Job.prototype.update_tcd_job = function(tcd_job) {
    var format = this.tcd2format[tcd_job.id];
    this.tcd_job[format] = tcd_job;
    console.log("I updated job " + format + " for source " + this.source);
    if (this.isDone() && this.removesource)
        this.remove_source();
    return tcd_job.id; // XXX When sending notification, codem uses id, not job_id
}

Job.prototype.isDone = function() {
    var i;
    var keys = Object.keys(this.tcd_job);
    var done = true;
    for (i=0; i<keys.length; i++)
        if (this.tcd_job[keys[i]].status != 'success')
            done = false;
    return done;
}

Job.prototype.toString = function() {
    return JSON.stringify(this, null, 2);
}

module.exports = Job;
