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
const https = require('https');
var http = require('http');
app.use(bodyParser.urlencoded({ extended: false }));
app.get('/', function(req, res) {
    res.sendFile(__dirname + '/client/index.html');
});
app.get('/client', function(req, res) {
    res.redirect('/');
});
app.get('/.well-known/assetlinks.json', function(req, res, next) {
    res.set('Content-Type', 'application/json');
    res.status(200).send(assetlinks);
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
let connectCheck = true;

async function main() {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection('content');
    //const deleteResult = await collection.deleteMany({});
    let findResult = await collection.findOne({ id: 'data' });
    obj = findResult;
    if (!obj) {
        const insertResult = await collection.insertOne({ id: 'data', data: '[]' });
        obj = insertResult;
    }
    if (obj.data) content = Object.values(JSON.parse(obj.data));
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
    if (connectCheck) content.push({ "name": "日期", "text": time });
    if (connectCheck) connectCheck = false;
    const publicIp = require('public-ip')
    publicIp.v4().then((ip) => joinCheck(ip))
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
        publicIp.v4().then((ip) => {
            newMessage(data, ip);
        });
    });

    async function newMessage(data, ip) {
        if (data.text === "" || !have_ip(ip) || data.text.length > 300) {
            if (!have_ip(ip)) illegal("ip undefined");
            if (data.text.length > 300) illegal("text too long");
            if (data.text === "") illegal("empty text");
            return console.log("阻止了一個不法請求並要求重新連接");
        }
        let txt = data.text;
        if (!notImgUrl(txt)) {
            txt = txt = googleImg(txt);
            await getImage(txt)
                .then((res) => {
                    txt = res;
                })
                .catch((err) => {
                    txt = err;
                });
        } else {
            txt = notImgUrl(txt);
        }
        ip = have_ip(ip, true);
        data_emit(userlist[ip], txt);
    }

    function getImage(url) {
        if (!url.indexOf("https")) return new Promise((resolve, reject) => {
            https.get(url, res => {
                //console.log(res.statusCode);
                if (res.statusCode === 200) {
                    resolve(url);
                } else {
                    reject(' ' + url);
                }
            }).on("error", function(e) {
                reject(' ' + url);
            });
        });
        return new Promise((resolve, reject) => {
            http.get(url, res => {
                //console.log(res.statusCode);
                if (res.statusCode === 200) {
                    resolve(url);
                } else {
                    reject(' ' + url);
                }
            }).on("error", function(e) {
                reject(' ' + url);
            });
        });
    }

    function googleImg(imgurl) {
        if (imgurl.match(/https:\/\/www\.google\.com(.*)?\/imgres\?imgurl=/i)) {
            imgurl = imgurl.replace(/https:\/\/www\.google\.com(.*)?\/imgres\?imgurl=/i, "");
            imgurl = imgurl.split('&imgrefurl=')[0];
            imgurl = decodeURIComponent(imgurl);
        }
        return imgurl;
    }

    function notImgUrl(imgurl) {
        if (imgurl.indexOf("http")) return imgurl;
        imgurl = googleImg(imgurl);
        if (!imgurl.match(/(^(?:http(s)?:\/\/)?[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=.]+(?:jpeg|jpg|jfif|pjpeg|pjp|gif|png|svg|gif|webp|apng|avif))/i)) return ' ' + imgurl;
        return false;
    }

    function joinCheck(ip) {
        if (!ip) return;
        let txt;
        if (isNaN(ip)) txt = ip.replace(/\./g, "");
        if (isNaN(txt)) return;
        if (have_ip(ip)) {
            socket.emit('user', { "user": userlist[txt], "ip": ip });
            newJoin();
            return;
        }
        userlist[txt] = (parseInt(txt) + random).toString(35);
        socket.emit('user', { "user": userlist[txt] });
        newJoin();
        if (!have_ip(txt)) data_emit("伺服器", userlist[txt] + "加入了聊天室");
        iplist.push(txt);
        console.log(ip);
    }

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