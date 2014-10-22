var uuid = require('node-uuid'),
    fs = require('fs'),
    mongoose = require('mongoose');

//var db = mongoose.connection;

var haveDB = true;
mongoose.connect('mongodb://localhost/codem', //TODO Put in a credentials file
        { server: {socketOptions: {keepAlive: 1}}},
        function(err) {
            if (err) { 
                console.log(err);
                haveDB = false;
            } else { 
                console.log("DB connection open");
            }
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
// Since "new" requires an addition of save(), and I don't want to expose any db dependency.
// BUT - create is already defined by mongoose... change this name?
jobSchema.statics.create = function(data) {
    data.createTS = new Date;
    var job = new Job(data);
    job.job_id = job._id;
    job.save();
    jobs[job.job_id] = job;
    return job;
}

jobSchema.statics.get = function(job_id) {
    // We assume this is what's in the db
    return jobs[job_id];
}

jobSchema.statics.getJobs = function(callback) {
    var keys = Object.keys(jobs);
    keys.sort( function(a,b) { 
        return jobs[b].createTS - jobs[a].createTS; 
    });
    var jobarray = [];
    for (var i=0; i<keys.length; i++)
        jobarray.push(jobs[keys[i]]);
    callback(null,jobarray);
}

jobSchema.statics.add_tcd_job = function(job_id, format, data) {
    data.format = format;
    jobs[job_id].tcd_job.push(new TCDJob(data));
    //this.tcd2format[tcd_job.job_id] = format;
    console.log("I created tcd job " + format + " for source " + this.source);
    return data.job_id; // XXX  codem uses job_id when creating. not id
}

jobSchema.statics.update_tcd_job = function(job_id, tcd_job) {

    function update_tcd_job_array(array, tcd_job) {
        var index = -1;
        for (var i=0 ; i<array.length ; i++) {
            if (array[i].job_id == tcd_job.job_id) {
                index = i; break;
            }
        }
        tcd_job.format = array[index].format;
        array[index] = tcd_job;
        return array;
    }

    if (!tcd_job.job_id) 
        tcd_job.job_id = tcd_job.id; // XXX When sending notification, codem uses id, not job_id
    var job = jobs[job_id];
    job.tcd_job = update_tcd_job_array(job.tcd_job, tcd_job);
    console.log("I updated job " + tcd_job.format + " for source " + job.source);
    if (job.isDone() && job.removesource)
        job.remove_source();
    return tcd_job.job_id;
}

//------------------------------------------------------------------------------

// Model/instance methods  -----------------------------------------------------
// Must occur before model creation
jobSchema.methods.setOriginalCopy = function(path) {
    this.originalCopy = path;
    return this;
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
    for (var i=0; i<this.tcd_job.length; i++)
        if (this.tcd_job[i].status != 'success')
            return false;
    return true;
}

jobSchema.methods.toString = function() {
    return JSON.stringify(this, null, 2);
}

//------------------------------------------------------------------------------

var Job = mongoose.model('job', jobSchema);
var TCDJob = mongoose.model('tcd_job', tcd_jobSchema);
Job.on('error', function(err) {console.log("NO DB");haveDB = false;});

// Load all jobs from the database
var jobs = {};
Job.find().exec(
        function(err,docs) {
            if (err) {
                haveDB = false;
            } else {
                for (var i=0; i<docs.length; i++) {
                    jobs[docs[i]._id] = docs[i];
                }
            }
        });

module.exports = Job;
