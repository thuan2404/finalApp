import mongoose from 'mongoose';
import bcrypt from 'bcrypt-nodejs';
const UserSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      default: "avatars/avatar-default.png"
    }
  },
  { timestamps: true }
);
UserSchema.methods.encryptPassword= function(password){
  return bcrypt.hashSync(password, bcrypt.genSaltSync(5),null);
};
UserSchema.methods.validPassword = function(password){
  return bcrypt.compareSync(password, this.password);
};
export const UserModel = mongoose.model("User", UserSchema);
