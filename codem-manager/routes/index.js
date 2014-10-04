var router = require('express').Router();
var mgr = require('../lib/manager');

/* GET home page. */
router.route('/').get( function(req, res) {
    mgr.getTranscoderStatus(function(status) {
        if (req.accepts('text/html')) {
            res.render('index', { title: 'Transcoder Status', status: status });
        } else {
            res.json(status);
        }
    });
});

module.exports = router;
