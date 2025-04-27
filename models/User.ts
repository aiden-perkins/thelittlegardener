import mongoose from 'mongoose';

const UserPlantsImagesSchema = new mongoose.Schema({
  image_url: {
    type: String,
    required: [true, 'Please provide an image URL.'],
    trim: true,
  }
}, { timestamps: true });

const UserPlantsSchema = new mongoose.Schema({
  custom_name: {
    type: String,
    required: [true, 'Please provide a name for the plant.'],
    trim: true,
  },
  plantId: {
    type: Number,
    required: [true, 'Please specify the plant\'s ID.']
  },
  location: {
    type: String,
    required: [false, 'Please provide a location for the plant.'],
    trim: true,
  },
  notes: {
    type: String,
    required: [false, 'Please provide some notes for the plant.'],
    trim: true,
  },
  plantImages: [UserPlantsImagesSchema],
}, { timestamps: true, _id: true });

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Please provide a username.'],
    unique: true,
    trim: true,
  },
  password: {
    type: String,
    required: [true, 'Please provide a password.'],
  },
  gardenItems: [UserPlantsSchema],
}, { timestamps: true });

export default mongoose.models.User || mongoose.model('User', UserSchema);
