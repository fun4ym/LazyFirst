const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/tap_system';
    await mongoose.connect(uri);
    const User = require('./models/User');
    const user = await User.findOne({
        $or: [
            { username: 'sun' },
            { realName: /孙/ }
        ]
    });
    console.log('Sun user:', user ? `${user.realName} (${user.username}) _id: ${user._id}` : 'Not found');
    await mongoose.disconnect();
}
run().catch(console.error);