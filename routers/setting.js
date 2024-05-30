const uuid = require("uuid");
const os = require('os');
const { exec } = require('child_process');
const { request } = require('http');
const { title } = require("process");

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
    
};