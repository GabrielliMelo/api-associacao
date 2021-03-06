const yup = require('./yup');

const registerSchema= yup.object().shape({
  name: yup.string().required(),
  password: yup.string().required(),
  email: yup.string().email().required()
})

const associadoRegisterUpdateSchema = yup.object().shape({
  nome: yup.string().required(),
  email: yup.string().email().required(),
  telefone: yup.string().required()
})

const loginSchema = yup.object().shape({
  email: yup.string().required(),
  password: yup.string().required()
})

const cobrancasSchema = yup.object().shape({
  data_vencimento: yup.string().required(),
  valor: yup.number().required(),
  status_cobranca: yup.string().required(),
});

module.exports = {
  registerSchema,
  associadoRegisterUpdateSchema,
  loginSchema,
  cobrancasSchema
}
