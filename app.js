const express = require('express');
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const http = require('http').Server(app);
const routers = require('./routers');

const app = express();
const port = 80;

// Set the view engine to EJS
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: false }));

app.get('/', (req, res) => {
    res.render('index');
});

app.post('/set-ip', (req, res) => {
    const ip = req.body.ip;
    const netmask = req.body.netmask;
    const gateway = req.body.gateway;

    // 這裡需要注意，exec會執行shell命令，需要小心處理來防止命令注入攻擊
    const command = `sudo ifconfig eth0 ${ip} netmask ${netmask} && sudo route add default gw ${gateway} eth0`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            return res.send(`Error setting IP: ${stderr}`);
        }
        res.send(`IP set to ${ip} with netmask ${netmask} and gateway ${gateway}`);
    });
});

// Start the server
http.listen(port, () => {
    console.log(`Server running on port ${port}`);
});