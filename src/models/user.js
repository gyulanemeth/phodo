var mongoose			= require("mongoose"),
    bcrypt				= require("bcrypt-nodejs"),
    SALT_WORK_FACTOR	= 10;

var Schema = mongoose.Schema,
	ObjectId = Schema.ObjectId;

// User schema
var userSchema = new Schema({
	email:			{type: String, required: true, unique: true},
	password:		{type: String, required: true},

	ref:			{type: String, default: ""},

	admin:			{type: Boolean, default: false},

	active:			{type: Boolean, default: false},
	deleted:		{type: Boolean, default: false},

	createdAt:		{type: Date, default: Date.now},
	modifiedAt:		{type: Date, default: null}
});


// Bcrypt middleware
userSchema.pre("save", function(next) {
	var user = this;

	if(!user.isModified("password")) {
		return next();
	}

	bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
		if(err) return next(err);

		bcrypt.hash(user.password, salt, null, function(err, hash) {
			if(err) return next(err);
			user.password = hash;
			next();
		});
	});
});

// Password verification
userSchema.methods.comparePassword = function(candidatePassword, cb) {
	bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
		if(err) return cb(err);
		cb(null, isMatch);
	});
};

// Export user model
module.exports = mongoose.model("User", userSchema);
