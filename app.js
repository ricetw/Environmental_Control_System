const express = require('express');
const cookieParser = require("cookie-parser");
const multer = require("multer");
const setting = require('./routers/setting.js');

const app = express();
const port = 5000;

app.use(cookieParser());
app.use(multer().array());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(__dirname + "/public"));

app.set("views", __dirname + "/views");
app.set("view engine", "ejs");

app.engine("html", require("ejs").renderFile);

// app.get('/', (req, res) => {
//     res.render('index');
// });
app.get('/setting', setting.renderSetting);

app.post('/set-ip', setting.settingIP);

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});