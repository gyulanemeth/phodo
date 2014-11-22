var nappkit = require("nappkit");
var nconf = nappkit.readConfig("./config.json");
var userModel = require("./models/user");


var auth = require("./routes/auth");
var registration = require("./routes/registration");


nappkit.createApp(function(app) {
	app.engine(".html", require("ejs").__express);
	app.set("views", __dirname + "/views");
	app.set("view engine", "html");

	var appConfig = {
		authModel: userModel,
		mode: "render",
		pages: {
			login: "login",
			loggedIn: "loggedIn",
			loggedOut: "index",

			registration: "registration",
			confirmRegistration: "confirmRegistrationEmailSent",
			confirmRegistrationFinished: "confirmRegistrationFinished",

			forgotPassword: "forgotPassword"
		}
	};

	auth.addRoutes(app, appConfig);
	
	registration(app, appConfig);

	app.enable("trust proxy");
});
	