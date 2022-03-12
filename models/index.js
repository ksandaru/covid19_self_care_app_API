const logSymbols = require("log-symbols");
const { Sequelize, DataTypes } = require("sequelize");

const dbConfig = require("../config/dbConfig");

//object initilize. (pass parameter to constructor)
const sequelize = new Sequelize(dbConfig.DB, dbConfig.USER, dbConfig.PASSWORD, {
  host: dbConfig.HOST,
  dialect: dbConfig.dialect,
  operatorsAliases: 0, //hide errors
  logging: false, //outputing SQL to the console
  pool: {
    max: dbConfig.pool.max,
    min: dbConfig.pool.min,
    acquire: dbConfig.pool.acquire,
    idle: dbConfig.pool.idle,
  },
});

sequelize
  .authenticate()
  .then(() => {
    console.log(logSymbols.success + "\x1b[36m%s\x1b[0m", " DB connected");
    // console.log("\x1b[36m%s\x1b[0m", "I am cyan color"); //cyan
    //https://www.codegrepper.com/code-examples/javascript/how+to+show+in+nodejs+console+a+red+cross+sine+and+a+green+tick+sine
  })
  .catch((err) => {
    console.log(logSymbols.error, " DB Connection Error");
  });

const db = {}; // Empty object

db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.login = require("./login.js")(sequelize, DataTypes);
db.userProfile = require("./userProfile.js")(sequelize, DataTypes);
db.vaccine = require("./vaccine.js")(sequelize, DataTypes);
db.vaccineTaken = require("./vaccineTaken.js")(sequelize, DataTypes);

//Relations
db.userProfile.login = db.userProfile.belongsTo(db.login, {
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

db.userProfile.vaccineTaken = db.userProfile.hasMany(db.vaccineTaken, {
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

db.vaccine.vaccineTaken = db.vaccine.hasMany(db.vaccineTaken, {
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

db.vaccineTaken.belongsTo(db.vaccine);

db.sequelize
  .sync({ force: false, alter: false }) //force :true - drop all tables before start
  .then(() => {
    console.log(
      logSymbols.success + "\x1b[36m%s\x1b[0m",
      " sequelize sync done ):"
    );
    console.log(
      logSymbols.success + "\x1b[36m%s\x1b[0m",
      " ::::::::: covid_19_self_care_rest_api UP & RUNNING..."
    );
  });

module.exports = db;
