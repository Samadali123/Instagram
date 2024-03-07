const multer = require(`multer`);
const { v4: uuidV4 } = require(`uuid`);
const path = require(`path`);


const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, `./public/images/uploads`);
    },

    filename: function(req, file, cb) {
        const filename = uuidV4();
        cb(null, filename + path.extname(file.originalname));
    }
})



function filefilter(req, file, cb) {
    const text = path.extname(file.originalname);
    if (text === ".png" || text === ".jpg" || text === ".svg" || text === ".avif") {
        cb(null, true);
    } else {
        cb(null, false);
    }
}


const upload = multer({ storage: storage }, filefilter);
module.exports = upload;