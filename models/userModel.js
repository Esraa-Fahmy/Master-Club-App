const mongoose = require('mongoose');
const bcrypt = require('bcrypt');


const userSchema = new mongoose.Schema(
  {
    uid: {
      type: String, // ده هيكون الـ UID بتاع المستخدم من Firebase
      unique: true,
      sparse: true,
    },
    userName: {
      type: String,
      trim: true,
      required: [true, 'name required'],
    },
    slug: {
      type: String,
      lowercase: true,
    },
    email: {
      type: String,
      required: [true, 'email required'],
      unique: true,
      lowercase: true,
    },
    phone: String,
    profileImg: String,
    password: {
      type: String,
      required: [true, 'password required'],
      minlength: [4, 'Too short password'],
      select:false,

    },
    passwordChangedAt: Date,
    passwordResetCode: String,
    passwordResetExpires: Date,
    passwordResetVerified: Boolean,
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
  },

  { timestamps: true }
);



const setImageURL = (doc) => {
    if (doc.profileImg) {
      const imageUrl = `${process.env.BASE_URL}/users/${doc.profileImg}`;
      doc.profileImg = imageUrl;
    }
  };
  // findOne, findAll and update
  userSchema.post('init', (doc) => {
    setImageURL(doc);
  });

  // create
  userSchema.post('save', (doc) => {
    setImageURL(doc);
  });



  userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    // Hashing user password
    this.password = await bcrypt.hash(this.password, 12);
    next();
  });




const User = mongoose.model('User', userSchema);

module.exports = User;  