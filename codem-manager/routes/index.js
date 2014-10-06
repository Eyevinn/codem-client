var router = require('express').Router();
var mgr = require('../lib/manager');

/* GET home page. */
router.route('/').get( function(req, res) {
    mgr.getJobs(function(jobarray) {
        if (req.accepts('text/html')) {
            res.render('index', { title: 'Job Status', jobarray: jobarray });
        } else {
            res.json(jobarray);
        }
    });
});

module.exports = router;
