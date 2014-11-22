var nconf			= require("nconf"),
	errorLogger		= require("edm-errorlogger");

module.exports = function() {
	var sendgrid		= require("sendgrid")(nconf.get("sendgrid:user"), nconf.get("sendgrid:pass"));
	
	var CALLBACK_ERROR	= "Wrong callback parameter given to SendgridEmailer.send.";
	
	function sendEmail(sendVO, callBack){
		sendgrid.send(sendVO, function(err, json) {
			if(err) {
				console.log("SENDGRID ERROR!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
				errorLogger.logError({
					statusCode: errorLogger.errorCodes.SENDGRID_ERROR,
					statusText: "Error in @sendGridEmailer.sendMail: " + err,
					headers: "no headers", //this part never worked!!!
					user: "no user"
				});
			}
		
			if(typeof callBack === "function") {
				callBack(err,json);
			} else {
				throw(new Error(CALLBACK_ERROR));
			}
		});
	}

	return {
		sendEmail: sendEmail
	};
};
