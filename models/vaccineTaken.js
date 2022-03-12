module.exports = (Sequelize, DataTypes) => {
  const VaccineTaken = Sequelize.define("vaccineTaken", {
    dose: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    vaccinationPlace: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    dateTaken: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    batchNumber: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    remarks: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  });
  return VaccineTaken;
};
