use crate::models::EstadoSrs;
use chrono::{DateTime, Duration, Utc};

// ─── Constantes FSRS-4.5 ─────────────────────────────────────────────────────

const DECAY: f64 = -0.5;
// FACTOR = 0.9^(1/DECAY) - 1 = 0.9^(-2) - 1 = 1/0.81 - 1 = 19/81
const FACTOR: f64 = 19.0 / 81.0;
const RETENCAO_ALVO: f64 = 0.90;

// Parâmetros padrão FSRS-4.5 (treinados sobre milhões de revisões reais)
const W: [f64; 17] = [
    0.4072,  // w0:  S_0 para avaliação 1 (Esqueci)
    1.1829,  // w1:  S_0 para avaliação 2 (Difícil)
    3.1262,  // w2:  S_0 para avaliação 3 (Bom)
    15.4722, // w3:  S_0 para avaliação 4 (Fácil)
    7.2102,  // w4:  base D_0
    0.5316,  // w5:  taxa D_0
    1.0651,  // w6:  delta de atualização de dificuldade
    0.0589,  // w7:  peso de reversão à média
    1.5330,  // w8:  fator exponencial de S'_r
    0.1544,  // w9:  expoente de S sobre S'_r
    1.0071,  // w10: fator de retenção sobre S'_r
    1.9395,  // w11: base de S'_f
    0.1100,  // w12: expoente de dificuldade sobre S'_f
    0.2900,  // w13: expoente de estabilidade sobre S'_f
    2.2700,  // w14: multiplicador para avaliação Difícil
    0.2900,  // w15: multiplicador para avaliação Fácil
    2.9898,  // w16: fator de estabilidade de curto prazo (aprendizado)
];

// ─── Avaliações ───────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum Avaliacao {
    Esqueci = 1,
    Dificil = 2,
    Bom     = 3,
    Facil   = 4,
}

impl TryFrom<u8> for Avaliacao {
    type Error = String;

    fn try_from(v: u8) -> Result<Self, Self::Error> {
        match v {
            1 => Ok(Avaliacao::Esqueci),
            2 => Ok(Avaliacao::Dificil),
            3 => Ok(Avaliacao::Bom),
            4 => Ok(Avaliacao::Facil),
            _ => Err(format!("Avaliação inválida: {}. Use 1 (Esqueci), 2 (Difícil), 3 (Bom) ou 4 (Fácil).", v)),
        }
    }
}

// ─── Motor FSRS ───────────────────────────────────────────────────────────────

pub struct Fsrs;

impl Fsrs {
    /// Ponto de entrada principal: recebe o estado atual (None se cartão novo)
    /// e a avaliação do usuário; retorna o novo estado SRS.
    pub fn agendar(estado_atual: Option<&EstadoSrs>, avaliacao: Avaliacao) -> EstadoSrs {
        let agora = Utc::now();
        match estado_atual {
            None => Self::agendar_novo(avaliacao, agora),
            Some(estado) => Self::agendar_revisao(estado, avaliacao, agora),
        }
    }

    // ─── Cartão visto pela primeira vez ──────────────────────────────────────

    fn agendar_novo(avaliacao: Avaliacao, agora: DateTime<Utc>) -> EstadoSrs {
        let g = avaliacao as usize;
        let estabilidade = W[g - 1].max(0.1);
        let dificuldade  = Self::dificuldade_inicial(avaliacao as u8);

        let (estado, intervalo_dias) = match avaliacao {
            Avaliacao::Esqueci | Avaliacao::Dificil => ("aprendendo".to_string(), 1i64),
            Avaliacao::Bom | Avaliacao::Facil => {
                ("revisao".to_string(), Self::proximo_intervalo(estabilidade).max(1))
            }
        };

        EstadoSrs {
            cartao_id:       String::new(),
            estado,
            estabilidade,
            dificuldade,
            ultima_revisao:  Some(agora.to_rfc3339()),
            proxima_revisao: (agora + Duration::days(intervalo_dias)).to_rfc3339(),
            lapsos:          0,
            repeticoes:      1,
        }
    }

    // ─── Cartão em revisão (já visto antes) ──────────────────────────────────

    fn agendar_revisao(estado: &EstadoSrs, avaliacao: Avaliacao, agora: DateTime<Utc>) -> EstadoSrs {
        let ultima = estado
            .ultima_revisao
            .as_deref()
            .and_then(|s| DateTime::parse_from_rfc3339(s).ok())
            .map(|d| d.with_timezone(&Utc))
            .unwrap_or(agora);

        let t = (agora - ultima).num_days().max(0) as f64;
        let retencao = Self::calcular_retencao(t, estado.estabilidade);

        let nova_dificuldade = Self::atualizar_dificuldade(estado.dificuldade, avaliacao as u8);

        let (nova_estabilidade, novo_estado, lapsos) = match avaliacao {
            Avaliacao::Esqueci => {
                let s = Self::estabilidade_apos_esquecimento(
                    estado.dificuldade,
                    estado.estabilidade,
                    retencao,
                );
                (s, "reaprendendo".to_string(), estado.lapsos + 1)
            }
            _ => {
                let s = Self::estabilidade_apos_recordar(
                    estado.dificuldade,
                    estado.estabilidade,
                    retencao,
                    avaliacao as u8,
                );
                (s, "revisao".to_string(), estado.lapsos)
            }
        };

        let intervalo_dias = match novo_estado.as_str() {
            "reaprendendo" => 1,
            _              => Self::proximo_intervalo(nova_estabilidade).max(1),
        };

        EstadoSrs {
            cartao_id:       estado.cartao_id.clone(),
            estado:          novo_estado,
            estabilidade:    nova_estabilidade,
            dificuldade:     nova_dificuldade,
            ultima_revisao:  Some(agora.to_rfc3339()),
            proxima_revisao: (agora + Duration::days(intervalo_dias)).to_rfc3339(),
            lapsos,
            repeticoes:      estado.repeticoes + 1,
        }
    }

    // ─── Funções matemáticas do FSRS-4.5 ─────────────────────────────────────

    /// R(t, S) = (1 + FACTOR × t/S)^DECAY
    /// Para t=S e RETENCAO_ALVO=0.9 → R = 0.9 por definição.
    pub fn calcular_retencao(t: f64, s: f64) -> f64 {
        if s <= 0.0 {
            return 0.0;
        }
        (1.0 + FACTOR * t / s).powf(DECAY)
    }

    /// Intervalo em dias para atingir RETENCAO_ALVO.
    /// Para 90%: I = S (estabilidade é diretamente o intervalo em dias).
    fn proximo_intervalo(estabilidade: f64) -> i64 {
        let i = estabilidade / FACTOR * (RETENCAO_ALVO.powf(1.0 / DECAY) - 1.0);
        i.round() as i64
    }

    /// D_0(G) = w4 - e^(w5 × (G-1)) + 1,  clamped [1, 10]
    fn dificuldade_inicial(g: u8) -> f64 {
        let d = W[4] - (W[5] * (g as f64 - 1.0)).exp() + 1.0;
        d.clamp(1.0, 10.0)
    }

    /// D' com reversão à média: evita deriva extrema de dificuldade.
    fn atualizar_dificuldade(d: f64, g: u8) -> f64 {
        let next_d = d - W[6] * (g as f64 - 3.0);
        let revertido = W[7] * Self::dificuldade_inicial(4) + (1.0 - W[7]) * next_d;
        revertido.clamp(1.0, 10.0)
    }

    /// S'_r: estabilidade após revisão bem-sucedida.
    fn estabilidade_apos_recordar(d: f64, s: f64, r: f64, g: u8) -> f64 {
        let mult_dificil = if g == 2 { W[14] } else { 1.0 };
        let mult_facil   = if g == 4 { W[15] } else { 1.0 };

        let nova = s
            * (W[8].exp() * (11.0 - d) * s.powf(-W[9]) * ((W[10] * (1.0 - r)).exp() - 1.0) + 1.0)
            * mult_dificil
            * mult_facil;

        nova.max(0.1)
    }

    /// S'_f: estabilidade após esquecimento.
    fn estabilidade_apos_esquecimento(d: f64, s: f64, r: f64) -> f64 {
        let nova = W[11]
            * d.powf(-W[12])
            * ((s + 1.0).powf(W[13]) - 1.0)
            * ((1.0 - r) * W[14]).exp();

        nova.min(s).max(0.1)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn retencao_em_t_igual_a_s_deve_ser_90_porcento() {
        let r = Fsrs::calcular_retencao(10.0, 10.0);
        assert!((r - 0.9).abs() < 1e-9, "Retenção = {:.6}", r);
    }

    #[test]
    fn cartao_novo_bom_vai_para_revisao() {
        let estado = Fsrs::agendar(None, Avaliacao::Bom);
        assert_eq!(estado.estado, "revisao");
        assert_eq!(estado.repeticoes, 1);
        assert_eq!(estado.lapsos, 0);
    }

    #[test]
    fn cartao_novo_esqueci_vai_para_aprendendo() {
        let estado = Fsrs::agendar(None, Avaliacao::Esqueci);
        assert_eq!(estado.estado, "aprendendo");
    }

    #[test]
    fn esqueci_em_revisao_incrementa_lapsos() {
        let base = Fsrs::agendar(None, Avaliacao::Bom);
        let pos_lapso = Fsrs::agendar(Some(&base), Avaliacao::Esqueci);
        assert_eq!(pos_lapso.lapsos, 1);
        assert_eq!(pos_lapso.estado, "reaprendendo");
    }

    #[test]
    fn dificuldade_inicial_esta_em_range_valido() {
        for g in 1u8..=4 {
            let d = super::Fsrs::dificuldade_inicial(g);
            // Chama via função privada — validada indiretamente
            assert!(d >= 1.0 && d <= 10.0, "D_0({}) = {}", g, d);
        }
    }
}
