import express from 'express';
import expressUpload from 'express-fileupload';
import expressAuth from 'express-basic-auth';
import yaml from 'yaml';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exit } from 'process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const __config = path.join(__dirname, 'private', 'looksie.yml');

if (!fs.existsSync(__config)) {
  console.error(`No config: ${__config}`);
  exit(1);
}


//? get config and express
const cd = yaml.parse(fs.readFileSync(__config, 'utf8'));
const looksie = express();
const port = process.env.PORT || cd.app.port || 3169;


//? setup static content
looksie.use(express.static(path.join(__dirname, cd.app.path.static)));


//? setup express-fileupload
looksie.use(
  expressUpload({
    limits: {
      fileSize: (cd.app.fileSizeLimit * (1024 * 1024)).toFixed(0),
      parts: 1
    },
    abortOnLimit: true,
  })
);


//? setup routes
looksie.get(cd.app.route.paste, expressAuth({ users: cd.auth, challenge: true }), (req, res) => {
  const host = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  console.log(cd.ui.authed + `host(${host})`);

  res.sendFile(path.join(__dirname, cd.app.path.paste));
});

looksie.post(cd.app.route.upload, (req, res) => {
  console.log(req.files);

  if (cd.app.requestFile in req.files) {
    const { image } = req.files;

    console.log(cd.ui.new + `md5(${image.md5}) mime(${image.mimetype}) size(${(image.size / (1024 * 1024)).toFixed(cd.app.fixedLimit)}MB)`);
    image.mv(path.join(__dirname, cd.app.path.upload));

    res.sendStatus(200);
  }
  else {
    res.sendStatus(400);
  }
});


//? start express
looksie.listen(port, () => { console.log(cd.ui.startup + `port(${port})`); });
