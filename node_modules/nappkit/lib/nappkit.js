var readConfig			= require("./readConfig"),
	createApp			= require("./createApp"),
	authRoutes			= require("./auth"),
	sendGridEmailer		= require("./sendGridEmailer"),
	sendFileIfExists	= require("./sendFileIfExists");

module.exports = {
	readConfig:			readConfig,
	createApp:			createApp,
	auth: 				authRoutes,
	sendGridEmailer:	sendGridEmailer,
	sendFileIfExists:	sendFileIfExists
};