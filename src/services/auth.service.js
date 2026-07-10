const crypto = require('crypto');
const { withoutTenant } = require('../config/db');
const { hashPassword, comparePassword } = require('../utils/password');
const { gerarToken } = require('../utils/jwt');
const ApiError = require('../utils/ApiError');

const TOKEN_RECUPERACAO_VALIDADE_MS = 1000 * 60 * 30; // 30 minutos

// Cria a empresa e o primeiro usuário (administrador) na mesma transação.
async function registrar({ nomeEmpresa, cnpj, nomeResponsavel, email, senha }) {
  return withoutTenant(async (client) => {
    await client.query('BEGIN');
    try {
      const empresaExistente = await client.query('SELECT id FROM empresas WHERE cnpj = $1', [cnpj]);
      if (empresaExistente.rowCount > 0) {
        throw new ApiError(409, 'Já existe uma empresa cadastrada com este CNPJ');
      }

      const usuarioExistente = await client.query('SELECT id FROM usuarios WHERE email = $1', [email]);
      if (usuarioExistente.rowCount > 0) {
        throw new ApiError(409, 'Já existe uma conta com este e-mail');
      }

      const empresaResult = await client.query(
        'INSERT INTO empresas (nome, cnpj) VALUES ($1, $2) RETURNING id, nome',
        [nomeEmpresa, cnpj]
      );
      const empresa = empresaResult.rows[0];

      const senhaHash = await hashPassword(senha);
      const usuarioResult = await client.query(
        `INSERT INTO usuarios (empresa_id, nome, email, senha_hash, papel)
         VALUES ($1, $2, $3, $4, 'administrador')
         RETURNING id, nome, email, papel`,
        [empresa.id, nomeResponsavel, email, senhaHash]
      );
      const usuario = usuarioResult.rows[0];

      // Deixa o Módulo 5 (Agente IA) pronto pra configurar, com valores padrão
      await client.query('INSERT INTO configuracoes_ia (empresa_id) VALUES ($1)', [empresa.id]);

      await client.query('COMMIT');

      const token = gerarToken({ sub: usuario.id, empresaId: empresa.id, papel: usuario.papel, nome: usuario.nome });
      return { token, usuario, empresa };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  });
}

async function login({ email, senha }) {
  return withoutTenant(async (client) => {
    const result = await client.query(
      `SELECT u.id, u.nome, u.email, u.senha_hash, u.papel, u.ativo, u.empresa_id, e.nome AS empresa_nome
       FROM usuarios u
       JOIN empresas e ON e.id = u.empresa_id
       WHERE u.email = $1`,
      [email]
    );
    const usuario = result.rows[0];

    // Mensagem genérica em ambos os casos (e-mail inexistente ou senha errada)
    // pra não revelar quais e-mails têm conta cadastrada.
    if (!usuario || !usuario.ativo) {
      throw new ApiError(401, 'E-mail ou senha inválidos');
    }

    const senhaConfere = await comparePassword(senha, usuario.senha_hash);
    if (!senhaConfere) {
      throw new ApiError(401, 'E-mail ou senha inválidos');
    }

    await client.query('UPDATE usuarios SET ultimo_login_em = now() WHERE id = $1', [usuario.id]);

    const token = gerarToken({ sub: usuario.id, empresaId: usuario.empresa_id, papel: usuario.papel, nome: usuario.nome });
    return {
      token,
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, papel: usuario.papel },
      empresa: { id: usuario.empresa_id, nome: usuario.empresa_nome },
    };
  });
}

async function esqueciSenha({ email }) {
  return withoutTenant(async (client) => {
    const result = await client.query('SELECT id FROM usuarios WHERE email = $1', [email]);
    // Não lança erro se o e-mail não existir — resposta do controller é
    // sempre a mesma, pra não permitir enumeração de contas cadastradas.
    if (result.rowCount === 0) return;

    const usuarioId = result.rows[0].id;
    const token = crypto.randomBytes(32).toString('hex');
    const expiraEm = new Date(Date.now() + TOKEN_RECUPERACAO_VALIDADE_MS);

    await client.query(
      `UPDATE usuarios
       SET token_recuperacao_senha = $1, token_recuperacao_expira_em = $2
       WHERE id = $3`,
      [token, expiraEm, usuarioId]
    );

    // TODO (sprint futuro): disparar e-mail real com o link de redefinição.
    // Por enquanto, loga o token pra permitir testar o fluxo em dev.
    console.log(`[recuperação de senha] token para ${email}: ${token}`);
  });
}

async function redefinirSenha({ token, novaSenha }) {
  return withoutTenant(async (client) => {
    const result = await client.query(
      `SELECT id FROM usuarios
       WHERE token_recuperacao_senha = $1 AND token_recuperacao_expira_em > now()`,
      [token]
    );
    if (result.rowCount === 0) {
      throw new ApiError(400, 'Token inválido ou expirado');
    }

    const senhaHash = await hashPassword(novaSenha);
    await client.query(
      `UPDATE usuarios
       SET senha_hash = $1, token_recuperacao_senha = NULL, token_recuperacao_expira_em = NULL
       WHERE id = $2`,
      [senhaHash, result.rows[0].id]
    );
  });
}

async function buscarPerfil(usuarioId, empresaId) {
  return withoutTenant(async (client) => {
    const result = await client.query(
      `SELECT u.id, u.nome, u.email, u.papel, e.id AS empresa_id, e.nome AS empresa_nome
       FROM usuarios u
       JOIN empresas e ON e.id = u.empresa_id
       WHERE u.id = $1 AND u.empresa_id = $2`,
      [usuarioId, empresaId]
    );
    if (result.rowCount === 0) {
      throw new ApiError(404, 'Usuário não encontrado');
    }
    return result.rows[0];
  });
}

module.exports = { registrar, login, esqueciSenha, redefinirSenha, buscarPerfil };
