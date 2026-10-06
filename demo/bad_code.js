// Deliberately flawed code. Copy this into a PR on a DEMO repo to show the bot working.
const express = require("express");
const mysql = require("mysql");
const app = express();

const db = mysql.createConnection({ host: "localhost", user: "root", password: "admin123" });

app.get("/user", (req, res) => {
  // SQL built from user input
  const query = "SELECT * FROM users WHERE id = " + req.query.id;
  db.query(query, (err, rows) => {
    res.send(rows[0].name); // crashes if no rows, err is ignored
  });
});

function unusedHelper() {
  var x = 10;
}

app.listen(3000);
