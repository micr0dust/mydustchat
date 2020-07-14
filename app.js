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
let count=0;
let news = false;
let reapet = false;
let Today=new Date();
let time;
let date_="" + Today.getFullYear()+ "/" + (Today.getMonth()+1) + "/" + Today.getDate() + "    " + Today.getHours()+8 + ":" + Today.getMinutes();
const random = Math.floor(Math.random() * (4294967 - 42949 + 1) + 42949);
fs.readFile('save.json', 'utf8', function readFileCallback(err, data) {
  if (err) {
    console.log(err);
  } else {
    if (data) {
      obj = JSON.parse(data);
      content = obj;
      content.push({ "name": "日期", "text": date_ });
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
    console.log(userlist[txt] + "離開了聊天室");
    //content.push({ "name": "伺服器", "text": userlist[txt] + "離開了聊天室", "time": time });
    //socket.emit('chat', { "chat": content, "user": userlist[txt], "news": news });
    delete iplist[socket.id];
    delete script_detect[socket.id];
    let json = JSON.stringify(content);
    fs.writeFile('save.json', json, 'utf8', function (err) {
      if (err)
        console.log(err);
    });
  });
  setInterval(() => {
    socket.emit('chat', { "chat": content, "user": false, "online": serv_io.engine.clientsCount });
    Today=new Date();
    time = Today.getHours() + ":" + Today.getMinutes().toString().padStart(2,'0');
  }, 500);
  // 接收來自於瀏覽器的資料
  socket.on('client_data', function (data) {
    let realuser = false;
    let ip = data.ip.replace(/\./g, "");
    for (i = 0; i < iplist.length + 1; i++) if (iplist[i] === ip) realuser = true;
    if (data.text === "" || !realuser || data.text.length > 300) return console.log("阻止了一個不法請求");
    news = true;
    let txt = data.text;
    if(Today.getMinutes()%10===0){
      for(let i=1;i<script_detect.length;i++) script_detect[ip] = 0;
    }
    if(script_detect[ip]>100) return socket.emit('script', { "type": "bot"});
    content.push({ "name": userlist[ip], "text": txt, "time": time });
    if(content.length>1000) content.shift();
    socket.emit('chat', { "chat": content, "user": false, "news": news });
    console.log({ "name": userlist[ip], "text": txt, "ip": ip })
    script_detect[ip]++;
    news = false;
  });
  socket.on('ip', function (data) {
    if (!data.ip) return;
    let txt = data.ip;
    txt = txt.replace(/\./g, "");
    for (i = 0; i < iplist.length; i++) if (iplist[i] === txt) reapet = true;
    if (reapet) {
      socket.emit('chat', { "chat": content, "user": userlist[txt] });
      reapet = false;
      return;
    }
    iplist[socket.id] = txt;
    script_detect[socket.id] = 0;
    userlist[txt] = (parseInt(txt) + random).toString(35);
    console.log(userlist[txt] + "加入了聊天室");
    Today=new Date();
    time = Today.getHours() + ":" + Today.getMinutes().toString().padStart(2,'0');
    content.push({ "name": "伺服器", "text": userlist[txt] + "加入了聊天室", "time": time });
    socket.emit('chat', { "chat": content, "user": userlist[txt], "news": news });
    if(content.length>1000) content.shift();
  });
});