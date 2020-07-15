var fs = require('fs');
var express = require('express');
var app = express();
var serv = require('http').Server(app);
const webpush = require('web-push');
const publicVapidKey = 'BNZBI00VOYUDb6GLDjNNsde1n_9T5ZAlM4xSSXNeAEZqbn9GfAuuHjr-iKRvxlFLbp9_nTpcekZbNYyhWPLxjOA';
const privateVapidKey = 'J9v7emHB7klmCviNWk3Watzx8QoAPnViLH1NjUR3k_E';
// 此處換成你自己的郵箱
webpush.setVapidDetails('mailto:mydustchat@gmail.com', publicVapidKey, privateVapidKey);

app.use(require('body-parser').json());
app.post('/client/subscribe', (req, res) => {
  const subscription = req.body;
  res.status(201).json({});
  const payload = JSON.stringify({ title: '新訊息', content: content[content.length - 1].text });
  webpush.sendNotification(subscription, payload).catch(error => {
    console.error(error.stack);
  });
});

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/client/index.html');
});
app.use('/client', express.static(__dirname + '/client'));

serv.listen(process.env.PORT || 3000);

var serv_io = require('socket.io')(serv, {});

let content = [];
let userlist = [];
let iplist = [];
let script_detect = [];
let count = 0;
let reapet = false;
let asiaTime = new Date().toLocaleString("en-US", { timeZone: "Asia/Taipei" });
let Today = new Date((new Date(asiaTime)).toISOString());
console.log(Today)
let time = Today.getFullYear() + '/' + (Today.getMonth() + 1) + '/' + Today.getDate() + '     ' + Today.getHours() + ':' + Today.getMinutes();
const random = Math.floor(Math.random() * (4294967 - 42949 + 1) + 42949);
fs.readFile('save.json', 'utf8', function readFileCallback(err, data) {
  if (err) {
    console.log(err);
  } else {
    if (data) {
      obj = JSON.parse(data);
      content = obj;
      content.push({ "name": "日期", "text": time });
      let json = JSON.stringify(content);
      fs.writeFile('save.json', json, 'utf8', function (err) {
        if (err)
          console.log(err);
      });
    }
  }
});
serv_io.sockets.on('connection', function (socket) {
  count++;
  socket.id = count;
  socket.on('disconnect', function () {
    let txt = iplist[socket.id];
    if (!have_ip(txt)) return;
    data_emit("伺服器", userlist[txt] + "離開了聊天室", txt)
    let json = JSON.stringify(content);
    fs.writeFile('save.json', json, 'utf8', function (err) {
      if (err)
        console.log(err);
    });
    iplist[socket.id] = 0;
  });
  setInterval(() => {
    socket.emit('chat', { "chat": content, "user": false, "online": serv_io.engine.clientsCount });
    times();
  }, 500);
  // 接收來自於瀏覽器的資料
  socket.on('client_data', function (data) {
    if (data.text === "" || !have_ip(data.ip) || data.text.length > 300) {
      if (!have_ip(data.ip)) illegal("ip undefined");
      if (data.text.length > 300) illegal("text too long");
      if (data.text === "") illegal("empty text");
      return console.log("阻止了一個不法請求並要求重新連接");
    }
    let txt = data.text;
    ip = have_ip(data.ip, true);
    if (script_detect[ip] > 100) return illegal("bot");
    data_emit(userlist[ip], txt, data.ip);
    script_detect[ip]++;
    if (Today.getMinutes() % 10 < 3) {
      for (let i = 1; i < script_detect.length; i++) script_detect[ip] = 0;
    }
  });
  socket.on('ip', function (data) {
    if (!data.ip) return;
    let txt;
    if (isNaN(data.ip)) txt = data.ip.replace(/\./g, "");
    if (isNaN(txt)) return;
    if (have_ip(data.ip)) {
      socket.emit('chat', { "chat": content, "user": userlist[txt] });
      return reapet = false;
    }
    iplist[socket.id] = txt;
    script_detect[socket.id] = 0;
    userlist[txt] = (parseInt(txt) + random).toString(35);
    data_emit("伺服器", userlist[txt] + "加入了聊天室", "server", userlist[txt]);
  });



  function data_emit(name, text, ip, user) {
    times();
    if (!ip) ip = "server";
    if (!user) user = false;
    content.push({ "name": name, "text": text, "time": time });
    if (content.length > 1000) content.shift();
    socket.emit('chat', { "chat": content, "user": user, "news": true, "ip": ip });
    console.log(name + ": " + text);
  }
  function times() {
    asiaTime = new Date().toLocaleString("en-US", { timeZone: "Asia/Taipei" });
    Today = new Date((new Date(asiaTime)).toISOString());
    time = Today.getHours() + ":" + Today.getMinutes().toString().padStart(2, '0');
  }
  function have_ip(ip, get) {
    if (!ip) return;
    if (isNaN(ip)) ip = ip.replace(/\./g, "");
    if (isNaN(ip)) return;
    if (get) return ip;
    for (i = 0; i < iplist.length + 1; i++) if (iplist[i] === ip) return true;
  }
  function illegal(type) {
    socket.emit('script', { "type": type });
    console.log("無效的操作: " + type);
  }
});