var fs = require("fs");

/**
* A helper function for authenticated file serving.
*/
function sendFileIfExists(res, filePath) {
	fs.exists(filePath, function(exists) {
		if (exists) {
			res.sendfile(filePath);
		} else {
			res.send(404);
		}
	});
}

module.exports = sendFileIfExists;