const express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index.ejs', { 
    title: 'Express Top Page' ,
    link_users: {
      href : "/users",
      text : "Users"
    },
    link_meeting: {
      href : "/meeting/join",
      text : "Meeting"
    }
  });
});

router.post('/', (req, res, next) => {
  console.log("/ test");

  // データをクライアント（静的プログラム）に送信
  res.end();
});

module.exports = router;
