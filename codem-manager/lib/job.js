var uuid = require('node-uuid'),
    fs = require('fs'),
    mongoose = require('mongoose');

var db = mongoose.connection;

var haveDB = false;
db.open('mongodb://localhost/codem', //TODO Put in a credentials file
        { server: {socketOptions: {keepAlive: 1}}},
        function(err) {
            if (err) { console.log(err) }
            else { haveDB = true; }
        });

// Mongoose Schemas ------------------------------------------------------------
var tcd_jobSchema = mongoose.Schema({
    format : String,
    job_id: String, //TODO Rename this to avoid confusion with Job.job_id
    status: String,
    progress: Number,
    duration: Number,
    filesize: Number,
    message: String
});

var jobSchema = mongoose.Schema({
    job_id : String,
    createTS : Date, //TODO Default new Date
    source : String,
    removesource : Boolean,
    originalCopy : String,
    formats : [ String ],
    tcd_job : [ tcd_jobSchema ] 
});
//------------------------------------------------------------------------------

// Schema methods (static methods) ---------------------------------------------
// Must occur before model creation

// XXX Cannot use "new" outside this module?
// Since I don't want to expose any db dependency.
jobSchema.statics.create = function(data) {
    data.createTS = new Date;
    var job = new Job(data);
    job.job_id = job._id;
    if (haveDB) {
        job.save();
    }
    jobs[job._id] = job;
    return job;
}

jobSchema.statics.getJobs = function(callback) {
    var keys = Object.keys(jobs);
    keys.sort( function(a,b) { 
        return jobs[b].createTS - jobs[a].createTS; 
    });
    var jobarray = [];
    for (var i=0; i<keys.length; i++)
        jobarray.push(jobs[keys[i]]);
    if (callback)
        callback(jobarray);
    else 
        return jobarray;
}

jobSchema.statics.getJob = function(job_id) {
    return jobs[job_id];
}

//------------------------------------------------------------------------------

// Model/instance methods  -----------------------------------------------------
// Must occur before model creation
jobSchema.methods.setOriginalCopy = function(path) {
    this.originalCopy = path;
    return this;
}

jobSchema.methods.add_tcd_job = function(format, data) {
    data.format = format;  //XXX Does this change data on the outside?
    this.tcd_job.push(data);
    //this.tcd2format[tcd_job.job_id] = format;
    console.log("I created job " + format + " for source " + this.source);
//    JobDB.update({job_id : this.job_id},
//            { $push: { tcd_job: {
//                                    format:   format,
//                                    job_id:   tcd_job.job_id,
//                                    status:   tcd_job.status,
//                                    progress: tcd_job.progress,
//                                    duration: tcd_job.duration,
//                                    filesize: tcd_job.filesize,
//                                    message:  tcd_job.message
//                                }
//                     }
//            }).exec();
//            
    return data.job_id; // XXX  codem uses job_id when creating. not id
}

jobSchema.methods.update_tcd_job = function(tcd_job) {
    if (!tcd_job.job_id) 
        tcd_job.job_id = tcd_job.id; // XXX When sending notification, codem uses id, not job_id
    var index = -1;
    for (var i=0 ; i<this.tcd_job.length ; i++) {
        if (this.tcd_job[i].job_id == tcd_job.job_id) {
            index = i; break;
        }
    }
    tcd_job.format = this.tcd_job[index].format;
    this.tcd_job[index] = tcd_job;
    console.log("I updated job " + tcd_job.format + " for source " + this.source);
    if (this.isDone() && this.removesource)
        this.remove_source();
    return tcd_job.job_id;
}

jobSchema.methods.remove_source = function() {
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

jobSchema.methods.isDone = function() {
    var done = true;
    for (var i=0; i<this.tcd_job.length; i++)
        if (this.tcd_job[i].status != 'success')
            done = false;
    return done;
}

jobSchema.methods.toString = function() {
    return JSON.stringify(this, null, 2);
}

//------------------------------------------------------------------------------

var jobs = {};
var Job = mongoose.model('Job', jobSchema);

module.exports = Job;
