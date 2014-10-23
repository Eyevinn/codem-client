var router = require('express').Router();
var mgr = require('../lib/manager');

router.route('/').put( function(req, res) {
    mgr.getCodemNotification(req.body, function() {
        res.json({answer:'thank you'}); //XXX Guess it doesn't matter what I answer
    });
});

module.exports = router;
