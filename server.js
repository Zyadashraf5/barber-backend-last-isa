const server = require('./app');
require('dotenv').config();

server.listen(8080,()=>{
    console.log("listening on port 8080 ......");
})