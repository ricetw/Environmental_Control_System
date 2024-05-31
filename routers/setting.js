const fs = require('fs');
const uuid = require("uuid");
const os = require('os');
const { exec } = require('child_process');
const { request } = require('http');
const { title } = require("process");
const { stat } = require("fs");

function cidrToNetmask(cidr) {
    const binaryNetmask = '1'.repeat(cidr).padEnd(32, '0');
    return binaryNetmask.match(/.{8}/g).map((octet) => parseInt(octet, 2)).join('.');
}

function netmaskToCIDR(netmask) {
    const netmaskArray = netmask.split('.');
    const binaryNetmask = netmaskArray.map((octet) => parseInt(octet).toString(2).padStart(8, '0')).join('');
    return binaryNetmask.split('1').length - 1;
}

exports.renderSetting = (req, res) => {
    const networkInterfaces = os.networkInterfaces();
    const ip = networkInterfaces['eth0'].find(i => i.family === 'IPv4').address;

    exec('ip addr show eth0', (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            return res.send(`Error retrieving network configuration: ${stderr}`);
        }

        const netmaskMatch = stdout.match(/inet (\d+\.\d+\.\d+\.\d+)/);
        console.log(netmaskMatch);
        const netmask = netmaskMatch ? cidrToNetmask(netmaskMatch[1]) : '';

        exec('ip route show', (error, stdout, stderr) => {
            if (error) {
                console.error(`exec error: ${error}`);
                return res.send(`Error retrieving gateway: ${stderr}`);
            }

            const gatewayMatch = stdout.match(/default via (\d+\.\d+\.\d+\.\d+)/);
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

    const newIPconfig = `interface eth0
nogateway
static ip_address=${ip}/${cidr}
static routers=${gateway}
static domain_name_servers=8.8.8.8`;

    console.log(newIPconfig);

    fs.readFile('/etc/dhcpcd.conf', 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).send({
                result: 1,
                message: `Error reading dhcpcd.conf: ${err}`
            });
        }

        const oldIPconfig = data.match(/interface eth0[\s\S]*?static domain_name_servers=8\.8\.8\.8/);
        if (!oldIPconfig) {
            return res.status(500).send({
                result: 1,
                message: `Error: Cannot find old IP configuration`
            });
        }

        const newDhcpcdConf = data.replace(oldIPconfig[0], newIPconfig);
        console.log(newDhcpcdConf);

        fs.writeFile('/etc/dhcpcd.conf', newDhcpcdConf, (err) => {
            console.log('Writing new dhcpcd.conf');
            if (err) {
                console.error(err);
                return res.status(500).send({
                    result: 1,
                    message: `Error writing dhcpcd.conf: ${err}`
                });
            }

            exec('sudo reboot', (error, stdout, stderr) => {
                if (error) {
                    console.error(`exec error: ${error}`);
                    return res.status(500).send({
                        result: 1,
                        message: `Error rebooting: ${stderr}`
                    });
                }

                res.status(200).send({
                    result: 0,
                    newIP: ip,
                });
            });
        });
    });
};