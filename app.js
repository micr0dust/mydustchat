const { MongoClient } = require('mongodb');
const auth = require('./client/js/auth.js');
//const url = 'mongodb://' + auth.user() + ':' + auth.password() + '@127.0.0.1:27017/test';
const url = "mongodb+srv://" + auth.user() + ":" + auth.password() + "@mydustchat.xvwyj.mongodb.net/test?retryWrites=true&w=majority";
const client = new MongoClient(url, { useNewUrlParser: true, useUnifiedTopology: true });
const dbName = 'test';
/*
client.connect(err => {
  const collection = client.db("test").collection("devices");
  // perform actions on the collection object
  client.close();
});*/

const express = require('express');
const app = express();
const bodyParser = require("body-parser");
app.use('/client', express.static(__dirname + '/client'));
const port = process.env.PORT || 3000
const server = app.listen(port, function() {
    console.log('Node server is running..');
});
const serv_io = require('socket.io')(server, {});
app.use(bodyParser.urlencoded({ extended: false }));
app.get('/', function(req, res) {
    res.sendFile(__dirname + '/client/index.html');
});
app.get('/client', function(req, res) {
    res.redirect('/');
});


let content = [];
let userlist = [];
let iplist = [];
let count = 0;
let asiaTime = new Date().toLocaleString("en-US", { timeZone: "Asia/Taipei" });
let Today = new Date((new Date(asiaTime)).toISOString());
console.log(Today)
let time = Today.getFullYear() + '/' + (Today.getMonth() + 1) + '/' + Today.getDate() + '     ' + Today.getHours() + ':' + Today.getMinutes();
const random = Math.floor(Math.random() * (4294967 - 42949 + 1) + 42949);

async function main() {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection('content');
    //const deleteResult = await collection.deleteMany({});
    let findResult = await collection.findOne({ id: 'data' });
    //console.log('Found documents =>', findResult);
    obj = findResult;
    if (!obj) {
        const insertResult = await collection.insertOne({ id: 'data', data: '[]' });
        obj = insertResult;
    }
    //console.log(obj.data, typeof JSON.parse(obj.data), typeof Object.values(JSON.parse(obj.data)));
    if (obj.data) content = Object.values(JSON.parse(obj.data));
    content.push({ "name": "日期", "text": time });
    saveData(content);
}
main();

async function saveData(data) {
    while (data.length > 100) {
        data.shift();
    }
    let json = JSON.stringify(data);
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection('content');
    const updateResult = await collection.updateOne({ id: 'data' }, { $set: { id: 'data', data: json } });
}


serv_io.sockets.on('connection', function(socket) {
    count++;
    socket.id = count;
    socket.on('disconnect', function() {
        //data_emit("伺服器", userlist[txt] + "離開了聊天室")
        socket.broadcast.emit('online', { "online": serv_io.engine.clientsCount });
        saveData(content);
    });
    setInterval(() => {
        //socket.emit('chat', { "chat": content, "user": false, "online": serv_io.engine.clientsCount });
        //times();
    }, 500);
    // 接收來自於瀏覽器的資料
    socket.on('client_data', function(data) {
        if (data.text === "" || !have_ip(data.ip) || data.text.length > 300) {
            if (!have_ip(data.ip)) illegal("ip undefined");
            if (data.text.length > 300) illegal("text too long");
            if (data.text === "") illegal("empty text");
            return console.log("阻止了一個不法請求並要求重新連接");
        }
        let txt = data.text;
        //if (isImgUrl(txt)) isImg(txt);
        ip = have_ip(data.ip, true);
        data_emit(userlist[ip], txt);
    });

    function isImgUrl(imgurl) {
        if (imgurl.indexOf("http")) return false;
        return (imgurl.match(/\.(jpeg|jpg|jfif|pjpeg|pjp|gif|png|svg|gif|webp|apng|avif|)/i) != null);
    }

    socket.on('ip', function(data) {
        if (!data.ip) return;
        let txt;
        if (isNaN(data.ip)) txt = data.ip.replace(/\./g, "");
        if (isNaN(txt)) return;
        if (have_ip(data.ip)) {
            socket.emit('user', { "user": userlist[txt] });
            newJoin();
            return;
        }
        userlist[txt] = (parseInt(txt) + random).toString(35);
        socket.emit('user', { "user": userlist[txt] });
        newJoin();
        if (!have_ip(txt)) data_emit("伺服器", userlist[txt] + "加入了聊天室");
        iplist.push(txt);
        console.log(iplist, txt);
    });

    function data_emit(name, text) {
        times();
        content.push({ "name": name, "text": text, "time": time });
        socket.emit('chat', { "chat": content, "news": true });
        socket.broadcast.emit('chat', { "chat": content, "news": true });
        console.log(name + ": " + text);
    }

    function newJoin() {
        times();
        socket.emit('chat', { "chat": content, "news": true });
        socket.emit('online', { "online": serv_io.engine.clientsCount });
        socket.broadcast.emit('online', { "online": serv_io.engine.clientsCount });
    }

    function times() {
        asiaTime = new Date().toLocaleString("en-US", { timeZone: "Asia/Taipei" });
        Today = new Date((new Date(asiaTime)).toISOString());
        time = Today.getHours() + ":" + Today.getMinutes().toString().padStart(2, '0');
    }

    function have_ip(ip, get) {
        if (!ip) return;
        if (isNaN(ip)) ip = ip.replace(/\./g, "");
        if (isNaN(ip)) return
        if (get) return ip;
        return iplist.indexOf(ip) + 1;
    }

    function illegal(type) {
        socket.emit('script', { "type": type });
        console.log("無效的操作: " + type);
    }
});