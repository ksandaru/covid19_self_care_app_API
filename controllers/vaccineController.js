const Joi = require("joi");
const router = require("express").Router();

const validateWith = require("../middleware/validation");
const db = require("../models");
const Vaccine = db.vaccine;
const userProfile = db.userProfile;
const Vaccination = db.vaccineTaken;

const schema = Joi.object({
  name: Joi.string().required().min(3),
  description: Joi.string().required(),
});

const updateSchema = Joi.object({
  id: Joi.number().required(),
  name: Joi.string().required().min(3),
  description: Joi.string().required(),
});

router.post("/", validateWith(schema), async (req, res) => {
  const data = req.body;

  const result = await Vaccine.create(data);
  if (!result)
    return res.status(400).send({ error: "Error! Server having some trubles" });

  return res.status(200).send({
    data: `New vaccine has been added!`,
  });
});

router.get("/", async (req, res) => {
  const result = await Vaccine.findAll({
    attributes: { exclude: ["createdAt", "updatedAt"] },
  });
  if (!result)
    return res.status(400).send({ error: "Error! Server having some trubles" });

  return res.status(200).send({
    data: result,
  });
});

router.get("/count", async (req, res) => {
  let users = 0;
  let vaccines = 0;
  let vaccinations = 0;

  await userProfile.count().then((c) => {
    users = c;
  });
  await Vaccine.count().then((c) => {
    vaccines = c;
  });
  await Vaccination.count().then((c) => {
    vaccinations = c;
  });
  res
    .status(200)
    .send({ users: users, vaccines: vaccines, vaccinations: vaccinations });
});

router.patch("/", validateWith(updateSchema), async (req, res) => {
  const vacineData = req.body;

  const aVaccine = await Vaccine.findByPk(vacineData.id);
  if (!aVaccine)
    return res.status(400).send({ error: "Vaccine not found for given ID" });

  aVaccine.set({
    name: vacineData.name,
    description: vacineData.description,
  });
  updateC = await aVaccine.save();

  if (!updateC)
    return res.status(400).send({ error: "Error! Server having some trubles" });

  return res.status(200).send({
    data: `vaccine has been updated successfuly`,
  });
});

router.delete("/:id", async (req, res) => {
  const vacId = req.params.id;

  const result = await Vaccine.findByPk(vacId);
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
