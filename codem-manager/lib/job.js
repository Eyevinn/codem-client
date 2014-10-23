var uuid = require('node-uuid'),
    fs = require('fs'),
    mongoose = require('mongoose');

var db = mongoose.connection;

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

//#################### Job #####################################################

var jobSchema = mongoose.Schema({
    job_id : String,
    createTS : Date, //TODO Default new Date
    source : String,
    removesource : Boolean,
    originalCopy : String,
    formats : [ String ],
});

// Job class (static) methods --------------------------------------------------
// Must occur before model creation

jobSchema.statics.create_job = function(data) {
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
    for (var i=0; i<keys.length; i++) {
        jobarray.push(jobs[keys[i]]);
        jobarray[i].tcd_job = job2tcd[jobs[keys[i]].job_id];
    }
    callback(null,jobarray);
}

// Job instance methods  -------------------------------------------------------
// Must occur before model creation

jobSchema.methods.setOriginalCopy = function(path) {
    this.originalCopy = path;
    this.save();
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
    for (var i=0; i<job2tcd[this.job_id].length; i++)
        if (job2tcd[this.job_id][i].status != 'success')
            return false;
    return true;
}

jobSchema.methods.toString = function() {
    return JSON.stringify(this, null, 2);
}

var Job = mongoose.model('job', jobSchema);
Job.on('error', function(err) {console.log("NO DB");haveDB = false;});

//------------------------------------------------------------------------------

//#################### TCD #####################################################

//---TCD static methods --------------------------------------------------------

var tcd_jobSchema = mongoose.Schema({
    format : String,
    master_id : String,
    job_id: String, //TODO Rename this to avoid confusion with Job.job_id
    status: String,
    progress: Number,
    duration: Number,
    filesize: Number,
    message: String
});

tcd_jobSchema.statics.create_tcd = function(data) {
    var tcd_job = new TCD(data);
    tcd_job.save();
    tcd_jobs[tcd_job.job_id] = tcd_job;
    job2tcd[data.master_id] = job2tcd[data.master_id] || [];
    job2tcd[data.master_id].push(tcd_job);
    return tcd_job;
}

// Only three fields are updateable
tcd_jobSchema.statics.update_tcd = function(data, callback) {
    var tcd_job = tcd_jobs[data.id] || tcd_jobs[data.job_id];
    tcd_job.update_tcd(data,callback);
}

//---TCD instance methods ------------------------------------------------------

tcd_jobSchema.methods.update_tcd = function(data, callback) {
    this.status = data.status;
    this.progress = data.progress;
    this.message = data.message;
    this.save();
    var job = jobs[this.master_id];
    if (job.isDone() && job.removesource)
        job.remove_source();
    if (callback)
        callback();
}

var TCD = mongoose.model('tcd_job', tcd_jobSchema);

//##############################################################################

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

var tcd_jobs = {};
var job2tcd = {};
TCD.find().exec(
        function(err,docs) {
            if (err) {
                haveDB = false;
            } else {
                for (var i=0; i<docs.length; i++) {
                    tcd_jobs[docs[i].job_id] = docs[i];
                    job2tcd[docs[i].master_id] = job2tcd[docs[i].master_id] || [];
                    job2tcd[docs[i].master_id].push(docs[i]);
                }
            }
        });

module.exports = {Job : Job,
                  TCD : TCD,
                  db  : db}; // In case a script wants to close the connection
