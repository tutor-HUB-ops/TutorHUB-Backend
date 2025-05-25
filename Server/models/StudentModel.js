const mongoose=require("mongoose")
const {Schema} = mongoose

const StudentSchema = new Schema({

    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true,
      unique: true
    },
    password: {
        type: String,
        required: true,
      },
    banned: {
      type: Boolean,
      default: false
    },
    
    role:{
      type:String, 
      required:true
  }
  },
  {
    timestamps: true
  }

) 
 

const StudentModel= mongoose.model("Student",StudentSchema)
module.exports={StudentModel}