const Joi = require("joi");
const router = require("express").Router();

const validateWith = require("../middleware/validation");
const db = require("../models");
const Vaccine = db.vaccine;
const VaccineTaken = db.vaccineTaken;
const UserProfile = db.userProfile;
const Login = db.login;

const schema = Joi.object({
  userProfileId: Joi.number().required(),
  vaccineId: Joi.number().required(),
  dose: Joi.number().required(),
  vaccinationPlace: Joi.string().required().min(2),
  dateTaken: Joi.date().required(),
  batchNumber: Joi.string().required().min(2),
  remarks: Joi.string(),
});

router.post("/", validateWith(schema), async (req, res) => {
  data = req.body;

  const findUser = await UserProfile.findByPk(data.userProfileId);
  const findVac = await Vaccine.findByPk(data.vaccineId);

  if (!findUser)
    return res.status(400).send({ error: "User does not exist for given ID" });
  if (!findVac)
    return res
      .status(400)
      .send({ error: "Vaccine does not exist for given ID" });

  const newVac = await VaccineTaken.create(data);
  if (!newVac)
    return res.status(400).send({ error: "Error! Server having some trubles" });

  return res.status(200).send({ data: "Vaccination added successfully!" });
});

router.get("/:userProfileId", async (req, res) => {
  const userProfileId = req.params.userProfileId;

  const findUser = await UserProfile.findByPk(userProfileId);
  if (!findUser)
    return res.status(400).send({ error: "User does not exist for given ID" });

  const data = await UserProfile.findOne({
    where: { id: userProfileId },
    attributes: ["id", "fullName", "phone", "nic", "city", "gender"],
    include: [
      {
        model: VaccineTaken,
        attributes: {
          exclude: ["createdAt", "updatedAt", "userProfileId", "vaccineId"],
        },
        include: {
          model: Vaccine,
          attributes: {
            exclude: ["createdAt", "updatedAt", "userProfileId", "vaccineId"],
          },
        },
      },
      {
        model: Login,
        attributes: ["id", "email", "avatar"],
      },
    ],
  });
  if (!data)
    return res
      .status(400)
      .send({ error: "This user has not been taken any vaccine so far" });

  return res.status(200).send(data);
});

router.get("/get-one/:vaccineTakenId", async (req, res) => {
  const vaccineTakenId = req.params.vaccineTakenId;

  // const findUser = await UserProfile.findByPk(userProfileId);
  // if (!findUser)
  //   return res.status(400).send({ error: "User does not exist for given ID" });

  const data = await UserProfile.findOne({
    attributes: ["id", "fullName", "phone", "nic", "city", "gender"],
    include: [
      {
        model: VaccineTaken,
        where: { id: vaccineTakenId },
        attributes: {
          exclude: ["createdAt", "updatedAt", "userProfileId", "vaccineId"],
        },
        include: {
          model: Vaccine,
          attributes: {
            exclude: ["createdAt", "updatedAt", "userProfileId", "vaccineId"],
          },
        },
      },
      {
        model: Login,
        attributes: ["id", "email", "avatar"],
      },
    ],
  });
  if (!data)
    return res
      .status(400)
      .send({ error: "This user has not been taken any vaccine so far" });

  return res.status(200).send(data);
});

router.delete("/:userProfileId/:vaccineId", async (req, res) => {
  const profileId = req.params.userProfileId;
  const vaccId = req.params.vaccineId;

  const findUser = await UserProfile.findByPk(profileId);
  if (!findUser)
    return res.status(400).send({ error: "User does not exist for given ID" });

  const result = await VaccineTaken.findOne({
    where: { userProfileId: profileId, vaccineId: vaccId },
  });
  if (!result)
    return res.status(400).send({ error: "Vaccine not found for given ID" });

  const del = await result.destroy();
  if (!del)
    return res.status(400).send({ error: "Cannot Delete vaccine, Try again!" });

  return res.status(200).send({
    data: "vaccine deleted successfuly",
  });
});

module.exports = router;
