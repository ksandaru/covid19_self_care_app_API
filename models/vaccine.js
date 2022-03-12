module.exports = (Sequelize, DataTypes) => {
  const Vaccine = Sequelize.define("vaccine", {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  });
  return Vaccine;
};
