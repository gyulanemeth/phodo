var mongoose = require("mongoose");
var auth = require("./auth");
var mandrill = require("node-mandrill")('34HIAPGbpMUawVsgWNOU3g');
var validator = require("validator");

module.exports = function(router, config) {
	if (typeof config !== "object") {
		throw "config should be an object!";
	}

	if (typeof config.pages !== "object") {
		throw "config.pages should be an object!";
	}

	function servePage(req, res, page, data) {
		if (config.mode === "render") {
			res.render(page, {errors: req.flash ? req.flash("error") : [], data: data});
		} else {
			res.sendfile(page);
		}
	}

	var registrationPage = "./public/register.html";
	var confirmRegistrationPage = "./public/confirmRegistrationEmailSent.html";
	var confirmRegistrationFinished = "./public/confirmRegistrationFinished.html";
	var forgotPasswordPage = "./public/forgotPasswordPage.html";

	if (typeof config.pages.registration === "string") {
		registrationPage = config.pages.registration;
	}

	if (typeof config.pages.confirmRegistration === "string") {
		confirmRegistrationPage = config.pages.confirmRegistration;
	}

	if (typeof config.pages.confirmRegistrationFinished === "string") {
		confirmRegistrationFinished = config.pages.confirmRegistrationFinished;
	}

	if (typeof config.pages.forgotPassword === "string") {
		forgotPasswordPage = config.pages.forgotPassword;
	}

	router.get("/register/", createRedirectFunction("/register"));
	router.get("/register", function (req, res) {
		if (!req.isAuthenticated()) {
			servePage(req, res, registrationPage);
		} else {
			res.redirect(nconf.get("appHost"));
		}
	});
	router.post("/register", function(req, res) {
		//check email address
		if (!checkEmailValidity()) {
			req.flash("error", "Invalid e-mail address!");
			return res.redirect("/register");
		}

		checkEmailInDb(function(exists) {
			if (exists) {
				req.flash("error", "Email address taken.");
				return res.redirect("/register");
			}

			saveToDb();
		});

		function checkEmailInDb(cb) {
			config.authModel.count({email: req.body.email}, function(err, value) {
				if (err) {
					req.flash("error", "Checking email - DB error.");
					return res.redirect("/register");
				}

				cb(value > 0);
			});
		}

		function saveToDb() {
			new config.authModel({
				email:		req.body.email,
				password:	req.body.password,
				ref:		req.session.ref
			}).save(function(err, result) {
				if (err) {
					req.flash("error", "Could not save user. DB error 1.");
					return res.redirect("/register");
				}

				if (!result) {
					req.flash("error", "Could not save user. DB error 2.");
					return res.redirect("/register");
				}

				if (!result._id) {
					req.flash("error", "Could not save user. DB error 3.");
					return res.redirect("/register");
				}

				sendConfirmRegistrationEmail(result._id, req.body.email);
			});
		}

		function sendConfirmRegistrationEmail(_id, email) {
			res.render("confirmRegistrationEmailSent");
			mandrill("/messages/send", {
			    message: {
			        to: [{email: email}],
			        from_email: 'no-reply@phodo.co',
			        subject: "Confrim your registration at phodo.co",
			        text: "Hello, your special link is: http://" + req.headers.host + "/register/" + _id
			    }
			}, function(error, response) {
			    //uh oh, there was an error
			    if (error) console.log( JSON.stringify(error) );

			    //everything's good, lets see what mandrill said
			    else console.log(response);
			});
		}

		//if not valid send error msg to reg page
		//if registered send error msg to reg page
		//if not registered save new user
		// - and finally send email
		
		//should use flash messages...
		// - would be best with ejs...
		//should use amazon ses
		//edm-errorlogger to winston...

		//finally: reg email sent page...
	});

	router.get("/register/:id", function(req, res) {
		var id = req.route.params.id;

		config.authModel.findOneAndUpdate({_id: id}, {active: true}, function(err, result) {
			servePage(req, res, confirmRegistrationFinished);
		});
	});

	router.get("/invite", auth.middlewares.ensureAuthenticated, function(req, res) {
		servePage(req, res, "invite", {link: "http://phodo.co/?ref=" + req.user._id});
	});

	router.get("/thanks", function(req, res) {
		servePage(req, res, "thanks");
	});


	router.get("/forgot-password/", createRedirectFunction("/forgot-password"));
	router.get("/forgot-password", function(req, res) {
		servePage(req, res, "forgotPassword");
	});
	router.post("/forgot-password", function(req, res) {});

	router.get("/forgot-password/:token", function(req, res) {});
	router.post("/forgot-password/:token", function(req, res) {});
};

function createRedirectFunction(redirectTo) {
	return function(req, res) {
		res.redirect(redirectTo);
	};
}

function checkEmailValidity(emailAddress) {
	return true;
	//return validator.isEmail(emailAddress);
}

function registerMe(req, res) {
	var newUserId = null,
		newUserToken = null;
	

	if(!req.body.email || !req.body.psw) {
		res.json({err: 905});
	}
	
	var userNameFind = {email: req.body.email};
	userService.count(req, res, userNameFind, onEmailChecked);


	

	
	function saveEmail() {
		var newUser = {
			username: req.body.email,
			email: req.body.email,
			password: req.body.psw,
			admin: false,
			normalName: req.body.email
		};
		userService.create(req, res, newUser, onUserSaved);
	}
	
	function onUserSaved(err, result) {
		if(err) {
			res.json({err: errorLogger.errorCodes.MONGO_DB_GENERAL_ERROR});
		} else {
			newUserId = result._id;
			generateToken();
		}
	}
	
	function generateToken() {
		tokenHandler.generate(req.body.email, function (err, token) {
			if (err) {
				errorLogger.logError({
					statusCode: errorLogger.errorCodes.FS_ERROR,
					statusText: "Error in @login.registerMe.generateToken: " + err,
					headers: req.headers
				});
				res.json({err: errorLogger.errorCodes.TOKEN_GENERAL_ERROR});
				return console.log(err);
			} else {
				newUserToken = token;
				sendWelcomeEmail();
			}
		});
	}

	function sendWelcomeEmail() {
		fs.readFile("layoutWelcomeTemplate.html", 'utf8', function onRead(err, importHtmlTemplate){
			if(err) {
				res.json({err: errorLogger.errorCodes.REGISTER_GENERAL_ERROR});
			} else {
				var href = nconf.get("appHost") + "/confirmRegistration/" + newUserToken;
				var htmlContent = importHtmlTemplate.replaceAll("##href##", href);
				htmlContent = htmlContent.replace("##sablon-title##", "Welcome to EDMdesigner");
		
				var sendGridVO = {
					to: req.body.email,
					from: "no-reply@edmdesigner.com",
					subject: "Welcome to EDMdesigner",
					html: htmlContent
				};
				sendGridUtil.sendEmail(sendGridVO,onEmailSent);
			}
		});
	}
	
	function onEmailSent(err, result) {
		if(err) {
			// TODO: delete user!!!! 
			userService.removeOne(req, res, {_id: newUserId}, function doNothing(){});
			res.json({err: errorLogger.errorCodes.REGISTER_EMAIL_SENT_FAILED});
			return;
		} else {
			if(isTest) {
				res.json({token: newUserToken, err: null});
			} else {
				res.json({err: null});
			}
		}
	}
}

function confirmRegistration(req, res) {
	var token = req.route.params.token;
	var user = null;
	var welcomeDocument = {};
	var email = null;

	tokenHandler.fetch(token, function(err, emailFromToken) {
		if (err) {
			return res.redirect(nconf.get("appHost") + "/register#err=" + errorLogger.errorCodes.TOKEN_EXCEEDED_ERROR);
		}

		if (!emailFromToken) {
			return res.redirect(nconf.get("appHost") + "/register#err=" + errorLogger.errorCodes.TOKEN_EXCEEDED_ERROR);
		}
		email = emailFromToken;
		//projectService.findOne(req, res, {_id: WELCOME_TEMPLATE_ID}, null, welcomeProjectCopied);
		userService.findOne(req, res, {email: email}, null, function(err, result) {
			if(err) {
				res.json({err: err});
			} else if(result) {
				user = result;
				if(adminTokenGenerator.getAdminToken()) {
					createApiUser();
				} else {
					adminTokenGenerator.createAdminToken(function(err) {
							if(err) {
								res.json({err: err});
							} else {
								createApiUser();
							}
						});
				}
			} else {
				res.json({err: "There is no user with this email address!"});
			}
		});
	});

	function createApiUser(secondTry) {
		request.post(
			nconf.get("apiHost") + "/json/user/create?user=admin&token=" + adminTokenGenerator.getAdminToken(),
			{
				form: {
					id: user._id.toString()
				}
			},
			function (err, response, body) {
				if(!err && response.statusCode === 200) {
					userService.updateOne(req, res, {email: email},{active: true}, confirmationSaved);
				} else {
					if(response && response.statusCode === 403 && !secondTry) {
						console.log("\nretry\n");
						adminTokenGenerator.createAdminToken(function(err) {
							if(err) {
								res.json({err: err});
							} else {
								createApiUser(true);
							}
						});
					} else {
						console.log("error saving new user to api: ", err || "statusCode " + response.statusCode);
						res.json({err: err || "Problem with saving user to api"});
						var newJob = {
							jobName: "create api user for:" + user._id,
							functionName: "createUserForApilessAppUser",
							arguments: [user._id.toString()]
						};
						jobsService.create(req, res, newJob, function(err) {

						});
					}
				}
			}
		);
	}

	function confirmationSaved(err, result) {
		if (err) {
			res.redirect(nconf.get("appHost") + "/register#err=" + errorLogger.errorCodes.TOKEN_GENERAL_ERROR);
			return;
		} else {
			//user = result;
			request.post(
				nconf.get("apiHost") + "/json/project/createFromTo?user=admin&token=" + adminTokenGenerator.getAdminToken(),
				{
					form: {
						title: WELCOME_TEMPLATE_TITLE,
						description: "",
						userId: user._id.toString(),
						_id: WELCOME_TEMPLATE_ID
					}
				},
				function (error, response, body) {
					if(error || response.statusCode !== 200) {
						console.log("Creating welcome project to the new user failed!! ", error ? error : response.statusCode);
					}
					tokenHandler.remove(token);
					logUserIn();
				}
			);
		}
	}

	
	
	function logUserIn() {
		req.logIn(user, function(err) {
			if(err) {
				res.redirect(nconf.get("appHost") + "/register#err=" + errorLogger.errorCodes.MONGO_DB_GENERAL_ERROR);
			} else {
				res.redirect(nconf.get("appHost") + "/#welcome");
			}
		});
	}
}
