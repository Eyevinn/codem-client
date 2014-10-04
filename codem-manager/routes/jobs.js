var router = require('express').Router();
var mgr = require('../lib/manager');

router.route('/').post( function(req, res) {
    mgr.processPostedJob(req.body, function() {
        res.statusCode = 202; //Job accepted
        res.json({message:'Job enqueued'});
    });
});

module.exports = router;
