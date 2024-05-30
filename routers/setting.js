const express = require('express');

const router = express.Router();

// Define the /settingIP route
router.post('/settingIP', (req, res) => {
    // Get the new IP address from the request body
    const newIP = req.body.ip;

    // TODO: Implement the logic to change the Raspberry Pi's fixed IP address using the newIP

    // Send a response indicating success or failure
    res.json({ success: true, message: 'IP address updated successfully' });
});

module.exports = router;