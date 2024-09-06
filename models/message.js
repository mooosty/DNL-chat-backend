const mongoose = require("mongoose");

const reactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['like', 'love', 'haha', 'wow', 'sad', 'angry'], // Add more types as needed
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { _id: false } // Disable _id for reactions if not needed
);


const messageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    content: { type: String, trim: true },
    chat: { type: mongoose.Schema.Types.ObjectId, ref: "Chat" },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    isDeleted:{type:Boolean, default:false},
    deletedBy:{type: mongoose.Schema.Types.ObjectId, ref: "User",required:false},
    isImage:{type:Boolean, default:false},
    isDocument:{type:Boolean, default:false},
    isVideo:{type:Boolean, default:false},
    reactions:{type:[reactionSchema],default:[]},
    reactionsCount:{type:Object, required:false}

  },
  { timestamps: true }
);

const Message = mongoose.model("Message", messageSchema);
module.exports = Message;
