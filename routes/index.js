// const express = require("express");
// const path = require("path");
// const multer = require("multer");

// const userRoutes = require("./user");
// const chatRoutes = require("./chat");
// const messageRoutes = require("./message");
// const { protect } = require("../middleware/authProtection");

// const setupRoutes = (app) => {
//   app.use("/user", userRoutes);
//   app.use("/chat", protect, chatRoutes);
//   app.use("/message", protect, messageRoutes);
//   app.use("/images", express.static(path.join(__dirname, "../images")));

//   const storage = multer.diskStorage({
//     destination: (req, file, cb) => {
//       const uploadPath = path.join(__dirname, "../images");
//       cb(null, uploadPath);
//     },
//     filename: (req, file, cb) => {
//       const fileName = req.body.name || file.originalname;
//       if (!fileName) {
//         return cb(new Error("File name is missing"));
//       }
//       cb(null, fileName);
//     },   
//   });

//   const upload = multer({ storage: storage });

//   app.post("/api/upload", upload.single("file"), (req, res) => {
//     if (!req.file) {
//       return res.status(400).json({ error: "No file uploaded" });
//     }
//     console.log("Uploaded file:", req.file); // Debugging
//     res.status(200).json({ message: "File has been uploaded", file: req.file });
//   });
// };

const express = require("express");
const path = require("path");
const multer = require("multer");

const userRoutes = require("./user");
const chatRoutes = require("./chat");
const messageRoutes = require("./message");
const { protect } = require("../middleware/authProtection");

const setupRoutes = (app) => {
  app.use("/user", userRoutes);
  app.use("/chat", protect, chatRoutes);
  app.use("/message", protect, messageRoutes);
  app.use("/images", express.static(path.join(__dirname, "../images")));

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.join(__dirname, "../images");
      cb(null, uploadPath);  
    },
    filename: (req, file, cb) => {
      const fileName = req.body.name || file.originalname;   
      if (!fileName) {
        return cb(new Error("File name is missing"));   
      }
      cb(null, fileName);   
    },         
  });

  const upload = multer({ storage: storage, 
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        }, });

  app.post("/api/upload", upload.single("file"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Parse additional flags from req.body
    const isImage = req.body.isImage === 'true';
    const isVideo = req.body.isVideo === 'true';
    const isDocument = req.body.isDocument === 'true';

    res.status(200).json({
      fileUrl: `/images/${req.file.filename}`,
      isImage,
      isVideo,
      isDocument,
    });
  });
};

module.exports = setupRoutes;
