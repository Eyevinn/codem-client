var should = require('should'),
    Job = require('../lib/job');

describe('Job', function() {
    var source = '/dir/sourcefile.mp4';
    var formats = [ '720p', '540p' ];
    job = Job.create( { source : source,
                        formats : formats,
                        removesource : 1 } );
    describe('properties', function() {
        it('should have job_id', function() {
            job.should.have.property('job_id');
        });
        // Verify job_id?
        it('should have source', function() {
            job.should.have.property('source');
            job.source.should.equal(source);
        });
        it('should have removesource', function() {
            job.should.have.property('removesource');
            job.removesource.should.equal(true);
        });
        it('should have formats', function() {
            job.should.have.property('formats');
            for (var i=0;i<job.formats.length;i++) {
                job.formats[i].should.equal(formats[i]);
            }
        });
        it('should have createTS', function() {
            job.should.have.property('createTS');
        });
        it('should set originalCopy', function() {
            var originalCopy = '/path/to/copy/of/original.mp4';
            job.setOriginalCopy(originalCopy);
            job.should.have.property('originalCopy');
            job.originalCopy.should.equal(originalCopy);
        });
    });


    function validate_tcd_job(tcd_job, tcd_job_data) {
        var keys = Object.keys(tcd_job_data);
        for (var i=0;i<keys.length;i++) {
            (function(i){
                it('should have property ' + keys[i] + ' = ' + tcd_job_data[keys[i]], 
                    function() {
                        tcd_job.should.have.property(keys[i]);
                        tcd_job[keys[i]].should.equal(tcd_job_data[keys[i]]);
                    });
            })(i);
        }
    }

    describe('transcoder job', function() {
        describe('add one transcoder job', function() {
            var tcd_job_data = {
                job_id : 'abcdefgh',
                status : 'mystatus',
                progress : 0,
                duration : 77,
                filesize : 99,
                message : 'No message'
            };
            Job.add_tcd_job(job.job_id, formats[0], tcd_job_data);
            it('job should have one transcoder job', function() {
                job.tcd_job.length.should.equal(1);
            });
            var tcd_job = job.tcd_job[0];
            validate_tcd_job(job.tcd_job[0], tcd_job_data);
            it('should have property format=' + formats[0], function() {
                tcd_job.should.have.property('format');
                tcd_job.format.should.equal(formats[0]);
            });
        });
        describe('Update transcoder job', function() {
            var new_tcd_job_data = {
                job_id : 'abcdefgh',
                status : 'mynewstatus',
                progress : 0.3,
                duration : 78,
                filesize : 98,
                message : 'I have a message'
            };
            Job.update_tcd_job(job.job_id, new_tcd_job_data);
            it('job should still have one transcoder job', function() {
                job.tcd_job.length.should.equal(1);
            });
            var tcd_job = job.tcd_job[0];
            validate_tcd_job(job.tcd_job[0], new_tcd_job_data);
            it('should still have property format=' + formats[0], function() {
                tcd_job.should.have.property('format');
                tcd_job.format.should.equal(formats[0]);
            });
        });
    });
});

