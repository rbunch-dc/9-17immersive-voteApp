var express = require('express');
var router = express.Router();
// Include the mysql module so express can query the DB
var mysql = require('mysql');
// Include our custom config module so we have sensitive data available
var config = require('../config/config');
// include bcrpyt so we can hash the user's passwords safely 
var bcrypt = require('bcrypt-nodejs');

var connection = mysql.createConnection(config.db);
connection.connect((error)=>{
	if (error){
		throw error;
	}
});

function start(){
	return new Promise((resolve, reject)=>{
		resolve([{userID:1}]);
	});
}

function queryOne(results){
	return new Promise((resolve, reject)=>{
		const selectQuery = `SELECT * FROM users WHERE id = ?`;
		connection.query(selectQuery,[results[0].userID], (error, results)=>{
			if(error){
				reject(error);
			}else{
				resolve(results);
			}		
		});
	});
}

function queryTwo(results){
	return new Promise((resolve, reject)=>{
		const selectQuery = `SELECT * FROM votes WHERE userID = ?`;
		connection.query(selectQuery,[results[0].id],(error,results)=>{
			if(error){
				reject(error);
			}else{
				resolve(results);
			}
		})
	});
}

// start()
// 	.then((q1d)=>queryOne(q1d))
// 	.then((q2d)=>queryTwo(q2d))
// 	.then((q3d)=>queryOne(q3d))
// 	.then((q4d)=>queryTwo(q4d))
// 	.then((q5d)=>queryOne(q5d))
// 	.then((q6d)=>queryTwo(q6d))
// 	.then((q7d)=>console.log(q7d)
// );


/* GET home page. */
router.get('/', function(req, res, next) {
	if(req.session.name === undefined){
		res.redirect('/login?msg=mustlogin');
		// stop the callback in it's tracks
		return;
	}

	const getBands = new Promise((resolve, reject)=>{
		// Go get the images...
		// Select all the images, THIS user has not voted on
		// var selectQuery = `SELECT * FROM bands;`;
		var selectSpecificBands = `
			SELECT * FROM bands WHERE id NOT IN(
				SELECT imageID FROM votes WHERE userID = ?
			);
		`
		connection.query(selectSpecificBands,[req.session.uid],(error, results, fields)=>{
			if(error){
				reject(error)
			}else{
				if(results.length == 0){
					// user is out of options. Let them know.
					resolve("done");
				}else{
					var rand = Math.floor(Math.random() * results.length);	
					resolve(results[rand]);
					// resolve({
					// 	rand: rand,
					// 	band: results[rand]
					// })					
				}

			}
		});
	});

	getBands.then(function(bandObj){
		if(bandObj === "done"){
			// out of bands.
			res.redirect('/standings?msg=finished')
		}else{
			console.log(bandObj);
			res.render('index', { 
				name: req.session.name,
				band: bandObj,
				loggedIn: true
			});
		}
	});
	getBands.catch((error)=>{
		res.json(error);
	})


});

router.get('/register', (req,res,next)=>{
	res.render('register',{});
});

router.post('/registerProcess', (req, res, next)=>{
	// res.json(req.body);
	var name = req.body.name;
	var email = req.body.email;
	var password = req.body.password;
	// We need to make sure this email isn't already registered 
	const selectQuery = `SELECT * FROM users WHERE email = ?;`;
	connection.query(selectQuery,[email],(error,results)=>{
		// did this return a row? If so, the user already exists
		if(results.length != 0){
			res.redirect('/register?msg=registered');
		}else{
			// this is a new user. Insert them!
			// Hash the password first...
			var hash = bcrypt.hashSync(password);
			// var insertQuery = `INSERT INTO users VALUES (DEFAULT,?,?,?);`;
			var insertQuery = `INSERT INTO users (name, email, password) VALUES (?,?,?);`;
			connection.query(insertQuery,[name,email,hash],(error)=>{
				if(error){
					throw error;
				}else{
					res.redirect('/?msg=registered');
				}
			});
		}
	});
});

// Why does query return error, results and fields
// somewhere inside of the mysql module...
// var connection = {};
// connection.query = function(query,escapedFields,callback){
// 	does fancy mysql stuff.
// 	More fancy mysql stuff.
// 	if(badQuery){
// 		var error = mysql.getError()
// 	}
// 	callback(error, results, fields);
// }

router.get('/login', (req, res, next)=>{
	res.render('login',{});
});

router.post('/loginProcess', (req, res, next)=>{
	// res.json(req.body);
	var email = req.body.email;
	var password = req.body.password // English version from user
	// write a query to check if the user is the DB
	var selectQuery = `SELECT * FROM users WHERE email = ?;`;
	connection.query(selectQuery,[email],(error,results)=>{
		if(error){
			throw error;
		}else{
			if(results.length == 0){
				// this user isn't in the databse. We dont care what pass they gave us.
				res.redirect('/login?msg=badUser');
			}else{
				// our select query found something! Check the pass...
				// call compareSync
				var passwordsMatch = bcrypt.compareSync(password,results[0].password)
				if(passwordsMatch){
					var row = results[0];
					// user in db, password is legit. Log them in.
					req.session.name = row.name;
					req.session.uid = row.id;
					req.session.email = row.email;
					req.session.loggedIn = true;
					console.log(req.session.uid)
					res.redirect('/?msg=loginSucces');
				}else{
					// user in db, but password is bad. Send them back to login
					res.redirect('/login?msg=badPass');
				}
			}
		}
	})
});

router.get('/logout',(req, res)=>{
	req.session.destroy();
	res.redirect('/login');
})


router.get('/vote/:direction/:bandId', (req, res)=>{
	// res.json(req.params);
	var bandId = req.params.bandId;
	var direction = req.params.direction;
	var insertVoteQuery = `INSERT INTO votes (ImageID, voteDirection, userID) VALUES (?,?,?);`;
	console.log(req.session);
	connection.query(insertVoteQuery,[bandId, direction,req.session.uid],(error, results)=>{
		if (error){
			throw error;
		}else{
			res.redirect('/');
		}
	});
});

router.get('/standings',(req, res)=>{
	const standingsQuery = `
		SELECT bands.title,bands.imageUrl,votes.imageID, SUM(IF(voteDirection='up',1,0)) as upVotes, SUM(IF(voteDirection='down',1,0)) as downVotes, SUM(IF(voteDirection='up',2,-1)) as total FROM votes
			INNER JOIN bands on votes.imageID = bands.id
			GROUP BY imageID;	
	`

	// const giveMeAllTheDataAndIWillFigureItOut = `
	// 	SELECT * FROM votes
	// 		INNER JOIN bands on votes.imageID = bands.id
	// `

	connection.query(standingsQuery,(error, results)=>{
		if(error){
			throw error;
		}else{
			res.render('standings',{
				standingsResults: results
			});
		}
	})
})

module.exports = router;
