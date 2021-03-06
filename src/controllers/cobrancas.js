const knex = require('../db/connection');
const { cobrancasSchema } = require('../schemas/schemas');
const verificarSituacaoCliente = require('../helpers/verificarSituacaoCliente');

async function cadastrarCobranca(req, res) {
  // data no formato: AAAA-MM-DD
  const { associado_id, data_vencimento, valor, status_cobranca } = req.body;

  try {
    await cobrancasSchema.validate(req.body);
    const hoje = new Date();
    const dataVencimentoFormat = new Date(data_vencimento);
    let statusCobrancaReal;

    if (status_cobranca === 'Pendente' && dataVencimentoFormat < hoje) {
      statusCobrancaReal = 'Vencida';
    } else if (status_cobranca === 'Pendente' && dataVencimentoFormat >= hoje) {
      statusCobrancaReal = 'Pendente';
    } else if (status_cobranca === 'Paga') {
      statusCobrancaReal = 'Paga';
    }

    const { rowCount } = await knex("cobrancas").insert({
      associado_id,
      usuario_id: req.user.id,
      data_vencimento,
      valor,
      status_cobranca: statusCobrancaReal,
    });


    if (rowCount === 0) {
      return res.status(500).json({ status: 500, message: "Ops... Não foi possivel registrar a cobrança" });
    }

    await verificarSituacaoCliente(associado_id);

    return res.status(201).json({ status: 201, message: "Cobrança cadastrada com sucesso!" });
  } catch (error) {
    return res.status(400).json({ status: 400, message: error.message });
  }
};

async function listarCobrancas(req, res) {
const idUser = req.user.id

  try {
    const cobrancas = await knex('cobrancas').where('usuario_id', idUser)

    const cobrancasVencidas = await knex('cobrancas')
    .join('associados', 'cobrancas.associado_id', '=', 'associados.id')
    .where('cobrancas.status_cobranca', 'Vencida')
    .select('associados.nome', 'cobrancas.*');
    const vencidadasUser = cobrancasVencidas.filter((user)=> user.usuario_id === idUser)

    const cobrancasPendentes = await knex('cobrancas').
    join('associados', 'cobrancas.associado_id', '=', 'associados.id')
    .where('cobrancas.status_cobranca', 'Pendente')
    .select('associados.nome', 'cobrancas.*');
    const pendenteUser = cobrancasPendentes.filter((user)=> user.usuario_id === idUser)

    const cobrancasPagas = await knex('cobrancas')
    .join('associados', 'cobrancas.associado_id', '=', 'associados.id')
    .where('cobrancas.status_cobranca', 'Paga')
    .select('associados.nome', 'cobrancas.*');
    const pagasUser = cobrancasPagas.filter((user)=> user.usuario_id === idUser)

    return res.status(200).json({ status: 200, cobrancas, vencidadasUser, pendenteUser, pagasUser });

  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
}
async function listarCobrancasPorUser(req, res) {
const idUser = req.user.id
  try {
    const cobrancas = await knex('cobrancas').where('usuario_id', idUser)

    return res.status(200).json({ status: 200, cobrancas});

  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
}

async function editarCobrancas(req, res) {
  const { data_vencimento, valor, status_cobranca, associado_id, usuario_id } = req.body;
  const { id } = req.params;

  try {
    await cobrancasSchema.validate(req.body);

    const hoje = new Date();
    const dataVencimentoFormat = new Date(data_vencimento);
    let statusCobrancaReal;

    if (status_cobranca === 'Pendente' && dataVencimentoFormat < hoje) {
      statusCobrancaReal = 'Vencida';
    } else if (status_cobranca === 'Pendente' && dataVencimentoFormat >= hoje) {
      statusCobrancaReal = 'Pendente';
    } else if (status_cobranca === 'Paga') {
      statusCobrancaReal = 'Paga';
    }
    const idExiste = await knex('cobrancas').where({id});

    if(idExiste.length === 0){
      return res.status(400).json({ status: 400, message: 'Cobrança não existe!' })
    }

    const { rowCount } = await knex('cobrancas').update({
      associado_id,
      usuario_id,
      data_vencimento,
      valor,
      status_cobranca: statusCobrancaReal
    }).where({ id });

    if (rowCount === 0) {
      return res.status(500).json({ status: 500, message: 'Erro ao atualizar cobrança!' })
    }
    await verificarSituacaoCliente(associado_id);

    return res.status(201).json({ status: 201, message: 'Cobrança atualizada com sucesso!' })

  } catch (error) {
    return res.status(404).json({ message: error.message })
  }
}

async function listarCobrancasPorAssociado(req, res) {
  const { id } = req.params;
  const idUser = req.user.id

  try {
    const cobrancas = await knex('cobrancas').join('associados', 'cobrancas.associado_id', '=', 'associados.id').where('associados.id', id).select('associados.nome', 'cobrancas.*');
    const cobrancasUser = cobrancas.filter((user)=> user.usuario_id === idUser)
    return res.status(200).json({ status: 200, cobrancasUser });

  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
}

async function detalharCobranca(req, res) {
  const { id } = req.params;
  
  try {
    const cobrancas = await knex('cobrancas')
    .join('associados', 'cobrancas.associado_id', '=', 'associados.id')
    .where('cobrancas.id', id)
    .select('associados.nome', 'cobrancas.*').first();

    return res.status(200).json({ status: 200, cobrancas });

  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
}

const excluirCobranca = async (req, res) => {
  const { id } = req.params;

  try {
    const cobranca = await knex('cobrancas').where({ id })
    if (cobranca.length === 0) {
      return res.status(400).json({
        status: 400,
        message: 'Não existe esta cobrança.'
      })
    }

    if (cobranca[0].status_cobranca === 'Pendente') {
      const { rowCount } = await knex('cobrancas').delete().where({ id });
      
      if (rowCount === 0) {
        return res.status(404).json({
          status: 404,
          message: 'Falha ao excluir a cobrança.'
        });
      }
    } else {
      return res.status(400).json({
        status: 400,
        message: 'Não é possível excluir esta cobrança pois já foi paga ou está vencida!'
      });
    }

    return res.status(200).json({
      status: 200,
      message: 'Cobrança excluída com sucesso.',
      cobranca: cobranca[0]
    });

  } catch (error) {
    return res.status(400).json({
      status: 400,
      erro: error.message
    });
  }
}

async function listarCobrancasPorStatus(req, res) {
  const idUser = req.user.id

  try {
    const valorCobrancasPagas = await knex('cobrancas').where('status_cobranca', 'Paga').where('usuario_id', idUser).sum('valor');
    const valorCobrancasVencidas = await knex('cobrancas').where('status_cobranca', 'Vencida').where('usuario_id', idUser).sum('valor');
    const valorCobrancasPendentes = await knex('cobrancas').where('status_cobranca', 'Pendente').where('usuario_id', idUser).sum('valor');

    const cobrancasPagas = await knex('cobrancas').join('associados', 'cobrancas.associado_id', '=', 'associados.id').where('cobrancas.status_cobranca', 'Paga').select('associados.nome', 'cobrancas.*').limit(5);
    const cobrancasVencidas = await knex('cobrancas').join('associados', 'cobrancas.associado_id', '=', 'associados.id').where('cobrancas.status_cobranca', 'Vencida').select('associados.nome', 'cobrancas.*').limit(5);
    const cobrancasPendentes = await knex('cobrancas').join('associados', 'cobrancas.associado_id', '=', 'associados.id').where('cobrancas.status_cobranca', 'Pendente').select('associados.nome', 'cobrancas.*').limit(5);

    const cobPagasUser = cobrancasPagas.filter((user)=> user.usuario_id === idUser)
    const cobVencidasUser = cobrancasVencidas.filter((user)=> user.usuario_id === idUser)
    const cobPendentesUser = cobrancasPendentes.filter((user)=> user.usuario_id === idUser)

    const qntdCobrancasPagas = await knex('cobrancas').where('status_cobranca', 'Paga').where('usuario_id', idUser).count().first();
    const qntdCobrancasVencidas = await knex('cobrancas').where('status_cobranca', 'Vencida').where('usuario_id', idUser).count().first();
    const qntdCobrancasPendentes = await knex('cobrancas').where('status_cobranca', 'Pendente').where('usuario_id', idUser).count().first();

    const associadosInadimplentes = await knex('associados').where('status_associado', 'INADIMPLENTE').where('usuario_id', idUser).limit(4);

    const associadosEmDia = await knex('associados').where('status_associado', 'EM DIA').where('usuario_id', idUser).limit(4);

    const qntdassociadosEmDia = await knex('associados').where('status_associado', 'EM DIA').where('usuario_id', idUser).count();

    const qntdassociadosInadimplentes = await knex('associados').where('status_associado', 'INADIMPLENTE').where('usuario_id', idUser).count();

    return res.status(200)
    .json({ status: 200, qntdCobrancasPagas, qntdCobrancasVencidas, qntdCobrancasPendentes, valorCobrancasPagas, valorCobrancasVencidas, valorCobrancasPendentes, cobPagasUser, cobVencidasUser, cobPendentesUser, associadosInadimplentes, associadosEmDia, qntdassociadosEmDia, qntdassociadosInadimplentes });

  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
}



module.exports = {
  cadastrarCobranca,
  listarCobrancas,
  editarCobrancas,
  listarCobrancasPorAssociado,
  detalharCobranca,
  excluirCobranca,
  listarCobrancasPorStatus,
  listarCobrancasPorUser
};
