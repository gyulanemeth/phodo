var fs				= require("fs"),

	express			= require("express"),
	redis			= require("redis"),
	nconf			= require("nconf"),
	passport		= require("passport"),
	mongoose		= require("mongoose"),
	methodOverride	= require("method-override"),
	p3p				= require("p3p"),

	errorLogger		= require("edm-errorlogger");


module.exports = function(customActions, callback) {
	var app = express();
	
	app.use(p3p(p3p.recommended));

	app.use(express.logger());
	app.use(express.cookieParser());

	if (nconf.get("session") === "redis") {
		var RedisStore	= require("connect-redis")(express);

		var redisClient	= redis.createClient(nconf.get("redis:session:port"), nconf.get("redis:session:url"));
		redisClient.auth(nconf.get("redis:session:pass"));
		redisClient.on("error", function(err) {
			errorLogger.logError({
				statusCode: errorLogger.errorCodes.REDDIS_ERROR,
				statusText: 'Error in @appConfig.redisClient.on: ' + err
			});
			console.log(err);
		});

		app.use(express.session({
			store: new RedisStore({client: redisClient}),
			secret: "DJEWJO52WWJDL24L5L2DDJFS",
			cookie: {secure: false, maxAge: 86400000}
		}));
	} else {
		app.use(express.session({
			secret: "yo debug mode",
			cookie: {secure: false, maxAge: 86400000}
		}));
	}
	
	
	app.use(express.json({limit: "2mb"}));
	app.use(express.urlencoded({limit: "2mb"}));
	app.use(methodOverride());
	
	// Initialize Passport!  Also use passport.session() middleware, to support
	// persistent login sessions (recommended).
	app.use(passport.initialize());
	app.use(passport.session());
	app.use(app.router);
	app.use(express.static("./public"));


	if (typeof customActions === "function") {
		customActions(app);
	}


	var mongoUrl = nconf.get("mongoUrl");

	console.log("MONGOURL: ", mongoUrl);

	var mongoOptions = {
		db: {
			safe: true
		},
		server: {
			auto_reconnect: false,
			socketOptions: {
				connectTimeoutMS: 10000
			}
		}
	};


	var db = mongoose.connection;
	function connectToMongodb() {
		mongoose.connect(mongoUrl, mongoOptions, function (err, res) {
			if (err) {
				errorLogger.logError({
					statusCode: errorLogger.errorCodes.MONGO_DB_DISCONNECTED,
					statusText: "MongoDb failed to connect: " + err
				});

				return console.log ("ERROR connecting to: ", mongoUrl, ". Err: ", err);
			}
			console.log ("Successfully connected to: " + mongoUrl);

			//STARTING SERVER
			var port = nconf.get("port");
			app.listen(port, function() {
				console.log("Express server listening on port " + port);
			});

			if (typeof callback === "function") {
				callback(app);
			}
		});
	}

	db.on("connecting", function() {
		console.log("connecting to MongoDB...");
	});
	db.on("error", function(err) {
		console.error("Error in MongoDb connection: " + err);
		errorLogger.logError({
			statusCode: errorLogger.errorCodes.MONGO_DB_GENERAL_ERROR,
			statusText: "Error in MongoDb connection: " + err
		});
		//mongoose.disconnect();
		setTimeout(connectToMongodb, 1000);
	});
	db.on("connected", function() {
		console.log("MongoDB connected!");
	});
	db.once("open", function() {
		console.log("MongoDB connection opened!");
	});
	db.on("reconnected", function () {
		console.log("MongoDB reconnected!");
	});
	db.on("disconnected", function(error) {
		console.log("MongoDB disconnected!");
		//mongoose.connect(dbURI, {server:{auto_reconnect:true}});
		errorLogger.logError({
			statusCode: errorLogger.errorCodes.MONGO_DB_DISCONNECTED,
			statusText: "MongoDb disconnected: " + error
		});
		setTimeout(connectToMongodb, 1000);
	});

	connectToMongodb();
};