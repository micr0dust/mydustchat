var express = require('express');
var app = express();
var serv = require('http').Server(app);

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/client/index.html');
});
app.use('/client', express.static(__dirname + '/client'));

serv.listen(process.env.PORT || 3000);

var serv_io = require('socket.io')(serv, {});

let content = [];
let userlist = [];
let iplist = [];
let ipnum = 0;
let news = false;
let reapet = false;
const random = Math.floor(Math.random() * (4294967 - 42949 + 1) + 42949);
content.push({ "name": "伺服器", "text": "歡迎來到此聊天室!" });

serv_io.sockets.on('connection', function (socket) {
  setInterval(() => {
    socket.emit('chat', { "chat": content, "user": false });
  }, 500);
  // 接收來自於瀏覽器的資料
  socket.on('client_data', function (data) {
    let realuser = false;
    let ip = data.ip.replace(/\./g, "");
    for (i = 0; i < iplist.length + 1; i++) if (iplist[i] === ip) realuser = true;
    if (data.text === "" || !realuser || data.text.length > 300) return console.log("阻止了一個不法請求");
    news = true;
    let txt = data.text;
    content.push({ "name": userlist[ip], "text": txt });
    //if(content.length>50) content.shift();
    socket.emit('chat', { "chat": content, "user": false, "news": news });
    console.log({ "name": userlist[ip], "text": txt, "ip": ip })
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
    iplist[ipnum] = txt;
    ipnum++;
    userlist[txt] = (parseInt(txt) + random).toString(35);
    console.log(userlist[txt] + "加入了聊天室");
    content.push({ "name": "伺服器", "text": userlist[txt] + "加入了聊天室" });
    socket.emit('chat', { "chat": content, "user": userlist[txt], "news": news });
    //if(content.length>50) content.shift();
  });
});