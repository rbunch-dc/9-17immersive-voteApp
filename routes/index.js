var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/register', (req,res,next)=>{
	res.render('register',{});
});

router.post('/registerProcess', (req, res, next)=>{
	res.json(req.body);
})

router.get('/login', (req, res, next)=>{
	res.render('login',{});
});

router.post('/loginProcess', (req, res, next)=>{
	res.json(req.body);
})

module.exports = router;
