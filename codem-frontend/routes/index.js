var express = require('express');
var router = express.Router();
var transcoder = require('../lib/transcoder');

/* GET home page. */
router.get('/', function(req, res) {
  res.render('index', { title: 'Transcoder Status', status: transcoder.status() });
});

module.exports = router;
