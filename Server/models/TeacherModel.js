const mongoose=require("mongoose")

const TeacherSchema =mongoose.Schema({
    name: {
      type: String,
      required: true
    },
    email:{
      type:String,
      required:true,
      unique: true },

    verified: {
      type: Boolean,
      default: false
    },
    password: {
      type: String,
      required: true
    },
    role: {
      type: String,
      required: true,
      default: "teacher"
    },
      attachments: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'File',
    },
  ],
    subjects: {type:[String], required:true},

    availability: [ 
      { date: String,
        day: String,
        startTime: String,
        endTime: String
      }
    ],
    banned: {
      type: Boolean,
      default: false
    },
    hourlyRate: {
        type: Number,
        required: true
      },
  });

  const TeacherModel=mongoose.model("Teacher",TeacherSchema)
  module.exports={TeacherModel}
