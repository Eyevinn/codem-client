var router = require('express').Router();
var mgr = require('../lib/manager');

router.route('/').post( function(req, res) {
    mgr.processPostedJob(req.body, function() {
        res.statusCode = 202; //Job accepted
        res.json({message:'Job enqueued'});
    });
});

router.route('/free_slots').get( function(req, res) {
    mgr.noOfFreeSlots(function(n) {
        if (req.accepts('text/html')) {
            res.render('freeslots',{free : n.toString()});
        } else if (req.accepts('application/json')) {
            res.json(n.toString());
        } else if (req.accepts('text/plain')) {
            res.end(n.toString() + "\n");
        }
    });
});

module.exports = router;
