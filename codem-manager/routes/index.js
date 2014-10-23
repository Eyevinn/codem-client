var router = require('express').Router();
var mgr = require('../lib/manager');
var moment = require('moment');

/* GET home page. */
router.route('/').get( function(req, res) {
    mgr.getJobs(function(err,jobarray) {
        // TODO Handle error
        if (req.accepts('text/html')) {
            res.render('index', { title: 'Transcode job status', 
                                  jobarray: jobarray,
                                  moment : moment});
        } else {
            res.json(jobarray);
        }
    });
});

module.exports = router;
