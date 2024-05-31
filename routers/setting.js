const fs = require('fs');
const uuid = require("uuid");
const os = require('os');
const { exec } = require('child_process');
const { request } = require('http');
const { title } = require("process");
const { stat } = require("fs");

function netmaskToCIDR(netmask) {
    const netmaskArray = netmask.split('.');
    const binaryNetmask = netmaskArray.map((octet) => parseInt(octet).toString(2).padStart(8, '0')).join('');
    return binaryNetmask.split('1').length - 1;
}

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
    const cidr = netmaskToCIDR(netmask);
    console.log(`IP: ${ip}, Netmask: ${netmask}, Gateway: ${gateway}, CIDR: ${cidr}`);

    const newIPconfig = `
    interface eth0
    static ip_address=${ip}/${cidr}
    static routers=${gateway}
    static domain_name_servers=8.8.8.8`;

    fs.readFile('/etc/dhcpcd.conf', 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).send({
                status: 1,
                message: `Error reading dhcpcd.conf: ${err}`
            });
        }

        const oldIPconfig = data.match(/interface eth0[\s\S]*?static domain_name_servers=8\.8\.8\.8/);
        if (!oldIPconfig) {
            return res.status(500).send({
                status: 1,
                message: `Error: Cannot find old IP configuration`
            });
        }

        const newDhcpcdConf = data.replace(oldIPconfig[0], newIPconfig);

        fs.writeFile('/etc/dhcpcd.conf', newDhcpcdConf, (err) => {
            if (err) {
                console.error(err);
                return res.status(500).send({
                    status: 1,
                    message: `Error writing dhcpcd.conf: ${err}`
                });
            }

            exec('sudo systemctl restart dhcpcd', (error, stdout, stderr) => {
                if (error) {
                    console.error(`exec error: ${error}`);
                    return res.status(500).send({
                        status: 1,
                        message: `Error rebooting: ${stderr}`
                    });
                }

                res.status(200).send({
                    status: 0,
                    newIP: ip,
                });
            });
        });
};