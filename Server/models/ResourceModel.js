// models/Resource.js
const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema({

    title: { type: String, required: true },
    description: String,
    // type: { type: String, enum: ['material', 'test'], required: true },
    subject: String,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
    link: { type: String, required: true },
}  , 
{
  timestamps: true 
})
  


const ResourceModel= mongoose.model("Resource",resourceSchema)
module.exports={ResourceModel}