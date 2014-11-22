var mongoose = require('mongoose');
/*
	errorCodes:
		MONGO_DB_GENERAL_ERROR: 601,
		MONGO_DB_DISCONNECTED: 602,
		MONGO_DB_FAILED_TO_CONNECT: 603,
		REDDIS_ERROR: 701,
		TOKEN_GENERAL_ERROR: 801,
		TOKEN_NO_MATCH_ERROR: 802,
		TOKEN_EXCEEDED_ERROR: 803,
		LOGIN_GENERAL_DB_ERROR: 901,
		LOGIN_USER_DOES_NOT_EXISTS: 902,
		LOGIN_WRONG_PASSWORD: 902,
		LOGIN_COMPARE_DB_ERROR: 903,
		CLOUDINARY_ERROR: 1001,
		FS_ERROR: 1101,
		SENDGRID_ERROR: 1201
*/

var Schema = mongoose.Schema;
var errorsSchema = new Schema({
	statusCode: {type: Number, required: true},
	statusText:{type: String, required: true},
	stack: {type: String},
	dateTime: {type: Date, default: Date.now},
	user: {type: String},
	headers: {type: Schema.Types.Mixed}
});

module.exports = mongoose.model('EDM-Errors', errorsSchema);