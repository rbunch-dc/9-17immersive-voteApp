var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('this is teh photos home page');
});

router.get('/update', function(req, res, next) {
  // res.send('this is the photos update page');
  res.redirect('/')
});

module.exports = router;
