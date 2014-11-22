var fs		= require("fs"),
	nconf	= require("nconf");

module.exports = function(defaultConfigPath) {
	var configFile = defaultConfigPath || "./config.json";
	nconf.argv();

	configFile = nconf.get("config") || configFile;

	console.log("Config file: ", configFile);
	if (!fs.existsSync(configFile)) {
		return console.log(" - Config file does not exist!");
	}
	nconf.file({file: configFile});

	return nconf;
};
