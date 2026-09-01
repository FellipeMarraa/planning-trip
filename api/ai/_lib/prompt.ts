export interface TripContext {
    name: string;
    startDate: string;
    endDate: string;
    baseCurrency: string;
    activities: Array<{ dateId: string; time: string; location: string; description: string }>;
}

// Delimitadores do bloco de sugestão de roteiro — o client faz parse disso
// pra renderizar os cards de "adicionar ao roteiro". A IA nunca escreve
// nada sozinha: isto é só texto na resposta, a escrita real é o usuário
// clicando confirmar (ver src/ai/components/SuggestedItineraryCard.tsx).
export const SUGGESTION_START = '<<<ROTEIRO_SUGERIDO>>>';
export const SUGGESTION_END = '<<<FIM_ROTEIRO_SUGERIDO>>>';

export function buildSystemPrompt(tripContext?: TripContext): string {
    const base = `Você é um agente de IA especializado em viagens, parte do app planning-trip. Ajuda o usuário com:
- Planejamento geral de viagem (o que ver, quanto tempo reservar, roteiro sugerido)
- Melhores épocas/datas pra visitar um destino
- Expectativa de clima pra época do ano (baseado no seu conhecimento geral de padrões climáticos — deixe claro que não é uma previsão em tempo real, só uma expectativa histórica)
- O que levar na mala, considerando destino e época

Responda sempre em português do Brasil, de forma direta e prática. Nunca invente preço/disponibilidade de voo, hotel ou atração — isso muda o tempo todo e você não tem acesso a dado em tempo real.`;

    if (!tripContext) {
        return `${base}\n\nO usuário ainda não está numa viagem específica (pode estar decidindo se cria uma ou não). Não sugira itens de roteiro nesse caso — só converse e ajude a decidir.`;
    }

    const activitiesSummary = tripContext.activities.length > 0
        ? tripContext.activities.map((a) => `- ${a.dateId} ${a.time}: ${a.location} (${a.description})`).join('\n')
        : '(nenhuma atividade cadastrada ainda)';

    return `${base}

Contexto da viagem atual do usuário:
- Nome: ${tripContext.name}
- Período: ${tripContext.startDate} a ${tripContext.endDate}
- Moeda de referência: ${tripContext.baseCurrency}
- Roteiro já cadastrado:
${activitiesSummary}

Se o usuário pedir pra montar/completar o roteiro, responda em texto normal explicando a sugestão, e ADICIONE ao final da resposta um bloco exatamente neste formato (JSON válido, sem comentário, datas dentro do período da viagem):

${SUGGESTION_START}
[{"dateId":"YYYY-MM-DD","time":"HH:mm","location":"nome do local","description":"descrição curta"}]
${SUGGESTION_END}

Só inclua esse bloco quando o usuário pedir itens concretos de roteiro pra adicionar — perguntas gerais (clima, mala, melhor época) não precisam dele.`;
}
