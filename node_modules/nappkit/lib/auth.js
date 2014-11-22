var passport		= require("passport"),
	LocalStrategy	= require("passport-local").Strategy,
	nconf			= require("nconf"),
	errorLogger		= require("edm-errorlogger");

/**
* if config.authCallback is a function, then it will be used as the callback of the localStrategy.
* if it is an object, then it is considered to be a mongoose model object.
*  - this model has to have the following fields:
*    - email
*    - password
*  + the schema behind the model should have a comparePasswords method
*/
function addRoutes (router, config) {
	if (typeof config !== "object") {
		throw "config should be an object!";
	}

	if (typeof config.pages !== "object") {
		throw "config.pages should be an object!";
	}


	var loginPath = "./public/login.html";
	var loggedInIndex = "./user/index.html";
	var loggedOutIndex = null;

	if (typeof config.pages.login === "string") {
		loginPath = config.pages.login;
	}

	if (typeof config.pages.loggedIn === "string") {
		loggedInIndex = config.pages.loggedIn;
	}

	if (typeof config.pages.loggedOut === "string") {
		loggedOutIndex = config.pages.loggedOut;
	}



	function serveLogin(req, res) {
		res.sendfile(loginPath);
	}

	function serveIndex(req, res) {
		if (req.isAuthenticated()) {
			if (config.adminServer === true) {
				ensureAdmin(req, res, function() {
					res.sendfile(loggedInIndex);
				});
			} else {
				res.sendfile(loggedInIndex);
			}
		} else {
			if (loggedOutIndex === null) {
				res.redirect("/login");
			} else {
				res.sendfile(loggedOutIndex);
			}
		}
	}



	router.get("/", serveIndex);

	router.get("/login/", forwardToLogin);
	router.get("/login", serveLogin);
	router.post("/login", login);
	router.get("/logout", ensureAuthenticated, logout);


	var localStrategyCallback = function(email, password, done) {
		done(email);
	};

	console.log("config.authModel ", typeof config.authModel);

	if (typeof config.authCallback === "function") {
		localStrategyCallback = config.authCallback;
	} else if (typeof config.authModel === "function") {
		userModel = config.authModel;
		localStrategyCallback = function(email, password, done) {
			userModel.findOne({email: email}, function(err, user) {
				if (err) {
					console.log(">>>>>>>>>>>>>>> MONGO ERROR");
					errorLogger.logError({
						statusCode: errorLogger.errorCodes.MONGO_DB_GENERAL_ERROR,
						statusText: "Error in MongoDb connection: " + err
					});
				
					return done(null, false, {
						message: errorLogger.errorCodes.MONGO_DB_GENERAL_ERROR
					});
				}

				if (!user) {
					console.log(">>>>>>>>>>>>>>> USER ERROR");
					console.log("email: ", email);
					console.log("password: ", password);
					return done(null, false, {
						message: errorLogger.errorCodes.LOGIN_USER_DOES_NOT_EXISTS
					});
				}

				if (user.active === false) {
					console.log(">>>>>>>>>>>>>>> ACTIVE ERROR");
					return done(null, false, {
						message: errorLogger.errorCodes.LOGIN_USER_DOES_NOT_COMFIRMED
					});
				}


				user.comparePassword(password, function(err, isMatch) {
					console.log(">>>>>>>>>>>>>> IS MATCH: ", isMatch);
					if (err) {
						errorLogger.logError({
							statusCode: errorLogger.errorCodes.MONGO_DB_GENERAL_ERROR,
							statusText: "Error in MongoDb connection when compare: " + err
						});
					
						return done(null, false, {
							message: errorLogger.errorCodes.MONGO_DB_GENERAL_ERROR
						});
					}
					
					if(isMatch) {
						return done(null, user);
					}
					
					return done(null, false, {
						message: errorLogger.errorCodes.LOGIN_WRONG_PASSWORD
					});
				});
			});
		};
	}

	passport.use(new LocalStrategy(localStrategyCallback));
};

passport.serializeUser(function(user, done) {
	done(null, user);
});

passport.deserializeUser(function(user, done) {
	done(null, user);
});

function ensureAuthenticated(req, res, next) {
	if (req.isAuthenticated()) {
		return next();
	}

	res.send(403);
}

function ensureAdmin(req, res, next) {
	if(req.user && req.user.admin === true) {
		return next();
	}
	
	res.send(403);
}

function forwardToLogin(req, res) {
	res.redirect("/login");
}

function login(req, res, next) {
	passport.authenticate("local", function(err, user, info) {
		if (err) {
			res.json({err: info.message});
			return next(err);
		}

		if (!user) {
			res.json({err: info.message});
			return;
		}

		req.logIn(user, function(err) {
			if (err) {
				return next(err);
			}

			return res.redirect("/");
		});
	})(req, res, next);
}

function logout(req, res) {
	req.session.destroy();
	res.redirect("/");
}


module.exports = {
	addRoutes: addRoutes,

	middlewares: {
		ensureAuthenticated: ensureAuthenticated,
		ensureAdmin: ensureAdmin
	}
};
