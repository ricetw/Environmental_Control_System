const uuid = require("uuid");
const os = require('os');
const { exec } = require('child_process');
const { request } = require('http');
const { title } = require("process");
const { stat } = require("fs");

exports.renderSetting = (req, res) => {
    const networkInterfaces = os.networkInterfaces();
    const ip = networkInterfaces['eth0'].find(i => i.family === 'IPv4').address;

    exec('ifconfig eth0', (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            return res.send(`Error retrieving network configuration: ${stderr}`);
        }

        const netmaskMatch = stdout.match(/netmask (\d+\.\d+\.\d+\.\d+)/);
        const netmask = netmaskMatch ? netmaskMatch[1] : '';

        exec('route -n', (error, stdout, stderr) => {
            if (error) {
                console.error(`exec error: ${error}`);
                return res.send(`Error retrieving gateway: ${stderr}`);
            }

            const gatewayMatch = stdout.match(/0.0.0.0\s+(\d+\.\d+\.\d+\.\d+)/);
            const gateway = gatewayMatch ? gatewayMatch[1] : '';

            res.render('setting', {
                title: "Setting",
                message: "Setting Page",
                sessionID: uuid.v4(),
                ip: ip,
                netmask: netmask,
                gateway: gateway
            });
        });
    });
};

exports.settingIP = (req, res) => {
    console.log(req.body);
    const ip = req.body.ip;
    const netmask = req.body.netmask;
    const gateway = req.body.gateway;

    exec(`sudo ifconfig eth0 ${ip} netmask ${netmask}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            return res.status(500).send({
                status: "1",
                message: `Error setting IP: ${stderr}`
            });
        }

        exec(`sudo route add default gw ${gateway}`, (error, stdout, stderr) => {
            if (error) {
                console.error(`exec error: ${error}`);
                return res.status(500).send({
                    status: "1",
                    message: `Error setting IP: ${stderr}`
                });
            }

            res.status(200).send({ 
                status: "0",
                message: "IP setting success" 
            });
        });
    });
};