require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const basicAuth = require("express-basic-auth");
const multer = require("multer");
const request = require("request");
var url = process.env.url;
const app = express();

app.set("port", process.env.PORT || 3000);
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
var limits = {
  files: 1, // allow only 1 file per request
  fileSize: 10485760, // 1 MB (max file size)
};
// multer middleware
const upload = multer({
  dest: path.join(__dirname, "./public/images"),
  limits: limits,
});
const handleError = (err, res) => {
  res.status(500).contentType("text/plain").end("error");
};
app.get(
  "/",
  basicAuth({ users: { admin: "supersecret" }, challenge: true }),
  (req, res) => {
    const fp = path.join(__dirname, `./public/images/`);
    fs.readdir(fp, (err, contents) => {
      // unexpected error handler
      if (err) return handleError(err, res);
      console.log(contents);
      return res.render("index", { data: contents });
    });
  }
);

app.get("/api/images/:image", (req, res) => {
  res.sendFile(path.join(__dirname, `./public/images/${req.params.image}`));
});

app.get("/api/:file", (req, res) => {
  res.sendFile(path.join(__dirname, `./public/files/${req.params.file}`));
});

app.post(
  "/upload",
  basicAuth({ users: { admin: "supersecret" } }),
  upload.single("file"),
  (req, res) => {
    if (req.file) {
      console.log(req.file.path);
      const filePath = req.file.path;
      const storagePath = path.join(
        __dirname,
        `./public/images/${req.file.originalname}`
      );
      const storagePath2 = path.join(
        __dirname,
        `./public/files/${req.file.originalname}`
      );
      if (
        path.extname(req.file.originalname).toLowerCase() === ".png" ||
        path.extname(req.file.originalname).toLowerCase() === ".jpg" ||
        path.extname(req.file.originalname).toLowerCase() === ".gif" ||
        path.extname(req.file.originalname).toLowerCase() === ".svg"
      ) {
        fs.rename(filePath, storagePath, (err) => {
          if (err) return handleError(err, res);
          console.log("File uploaded!");
          var options = {
            method: "post",
            body: {
              embeds: [
                {
                  title: "File Uploaded to CDN",
                  image: {
                    url: `https://cdn.cnsp.eu.org/api/images/${req.file.originalname}`,
                  },
                  footer: {
                    text: `IP: ${req.connection.remoteAddress}`,
                  },
                },
              ],
            },
            json: true,
            url: url,
          };
          if (process.env.url) {
            request(options);
          }
          return res.redirect(`/api/images/${req.file.originalname}`);
        });
      } else {
        fs.rename(filePath, storagePath2, (err) => {
          if (err) return handleError(err, res);
          console.log("File uploaded!");
          var options = {
            method: "post",
            body: {
              embeds: [
                {
                  title: "File Uploaded to CDN",
                  fields: [
                    {
                      name: "URL",
                      value: `https://cdn.cnsp.eu.org/api/${req.file.originalname}`,
                    },
                  ],
                  footer: {
                    text: `IP: ${req.connection.remoteAddress}`,
                  },
                },
              ],
            },
            json: true,
            url: url,
          };
          if (process.env.url) {
            request(options);
          }
          return res.redirect(`/api/${req.file.originalname}`);
        });
      }
    } else {
      res.status(403).contentType("text/plain").end("Please select a file!");
    }
  }
);

app.get(
  "/delete/:image",
  basicAuth({ users: { admin: "supersecret" }, challenge: true }),
  async (req, res) => {
    console.log(req.params.image);
    const fp = path.join(__dirname, `./public/images/${req.params.image}`);
    await fs.unlink(fp, (err) => {
      // unexpected error handler
      if (err) return handleError(err, res);
      var options = {
        method: "post",
        body: {
          embeds: [
            {
              title: "File Removed from CDN",
              description: `${req.params.image}`,
            },
          ],
        },
        json: true,
        url: url,
      };
      if (process.env.url) {
        request(options);
      }
      return console.log(`${req.params.image} was removed from the server.`);
    });
    res.redirect("/");
  }
);

app.listen(3000),
  () => {
    console.log(`CDN ready on port: ${app.get("port")}`);
  };
