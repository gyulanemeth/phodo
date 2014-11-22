var mongoose		= require('mongoose'),
	errorModel	= require("../models/errors"),
	errorLogs	= [],
	attemptsToSave = 0,
	saveIntervalId = null,

	SAVE_INTERVALS = 20000,//5 * 60 * 1000, // 1 hour
	MAX_ATTEMPTS = 5,
	errorCodes = {
		MONGO_DB_GENERAL_ERROR: 601,
		MONGO_DB_DISCONNECTED: 602,
		MONGO_DB_FAILED_TO_CONNECT: 603,
		
		REDDIS_ERROR: 701,
		
		TOKEN_GENERAL_ERROR: 801,
		TOKEN_NO_MATCH_ERROR: 802,
		TOKEN_EXCEEDED_ERROR: 803,
		
		LOGIN_GENERAL_DB_ERROR: 901,
		LOGIN_USER_DOES_NOT_EXISTS: 902,
		LOGIN_WRONG_PASSWORD: 903,
		LOGIN_COMPARE_DB_ERROR: 904,
		MISSING_CREDENTIAL: 905,
		LOGIN_USER_DOES_NOT_COMFIRMED: 906,
		
		REGISTER_GENERAL_ERROR: 951,
		REGISTER_EMAIL_IS_USED: 952,
		REGISTER_EMAIL_SENT_FAILED: 953,
		
		RESET_PASSWORD_USER_DOESNT_EXIST: 975,
		RESET_PASSWORD_EMAIL_SENT_FAILED: 976,
		RESET_PASSWORD_EXCEEDED: 977,
		
		CLOUDINARY_ERROR: 1001,
		
		FS_ERROR: 1101,
		
		SENDGRID_ERROR: 1201
		
	},
	
	saveIntervalId = setInterval(saveLogs,SAVE_INTERVALS);
	
	function saveLogs() {
		if(errorLogs.length === 0) {
			return;
		}
	
		attemptsToSave++;
		
		errorModel.create(errorLogs, function onErrorLogsSaved(err) {
			if(err) {
				if(attemptsToSave <= MAX_ATTEMPTS) {
					setTimeout(saveLogs, 1000);
				}
			} else {
				attemptsToSave = 0;
				errorLogs = [];
			}
		});
	}


	function logError(errorVO) {
		if(!errorVO) {
			return;
		}
			
		var	statusCode = errorVO.statusCode || 0,
			statusText = errorVO.statusText || 'Not set yet.',
			user = (errorVO.user) ? errorVO.user.toString() : null,
			stack = errorVO.stack || null,
			
			newError = {
				dateTime: (new Date()).toString(),
				statusCode: statusCode,
				statusText: statusText,
				user: user,
				stack: stack
			};
	
		errorLogs.push(newError);
		
		return {
			EDMErrorCode: statusCode
		};
	}
module.exports = {
	logError: logError,
	errorCodes: errorCodes,

	models: {
		errorModel: errorModel
	}
};