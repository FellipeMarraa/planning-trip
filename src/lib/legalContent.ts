// src/lib/legalContent.ts
export interface LegalSection {
    title: string;
    body: string[];
}

export const TERMS_SECTIONS: LegalSection[] = [
    {
        title: '1. Aceite dos termos',
        body: [
            'Ao acessar ou usar o TripPlanner ("Serviço"), você concorda integralmente com estes Termos de Uso. Se não concordar com qualquer parte destes termos, não utilize o Serviço.',
        ],
    },
    {
        title: '2. Descrição do serviço',
        body: [
            'O TripPlanner é uma ferramenta gratuita para organização de viagens em grupo, permitindo criar roteiros, controlar despesas compartilhadas, convidar participantes e acompanhar saldos entre membros.',
            'O Serviço é oferecido "como está" e "conforme disponível", sem garantia de disponibilidade ininterrupta, ausência de erros ou adequação a uma finalidade específica.',
        ],
    },
    {
        title: '3. Cadastro e conta',
        body: [
            'O acesso é feito exclusivamente via login com sua conta Google. Você é responsável por manter a confidencialidade das credenciais da sua conta Google e por todas as atividades realizadas através dela.',
            'Você declara ter idade mínima de 13 anos e capacidade legal para aceitar estes termos.',
        ],
    },
    {
        title: '4. Uso do serviço e responsabilidades do usuário',
        body: [
            'Você se compromete a não usar o Serviço para fins ilícitos, ofensivos ou que violem direitos de terceiros, e a não tentar acessar dados de viagens das quais não seja participante.',
            'Você é o único responsável pela veracidade, precisão e legalidade das informações inseridas (nomes, valores, descrições, datas), inclusive de membros convidados sem login ("convidados") adicionados por você.',
        ],
    },
    {
        title: '5. Conteúdo inserido pelo usuário',
        body: [
            'Todo conteúdo inserido (nomes de viagens, descrições de despesas, roteiros, etc.) permanece de sua titularidade. Ao inseri-lo, você concede ao TripPlanner uma licença limitada para armazenar, processar e exibir esse conteúdo aos demais participantes da respectiva viagem, exclusivamente para operação do Serviço.',
        ],
    },
    {
        title: '6. Dados financeiros e cotações de moeda',
        body: [
            'As cotações de câmbio exibidas têm caráter meramente informativo/referencial e podem não refletir o valor exato praticado por bancos, cartões ou casas de câmbio no momento da sua transação real.',
            'O TripPlanner não se responsabiliza por decisões financeiras, divergências de valores ou prejuízos decorrentes do uso das informações de conversão, split de gastos ou controle de saldos apresentados pelo Serviço.',
        ],
    },
    {
        title: '7. Papéis e permissões',
        body: [
            'O criador da viagem ("proprietário") pode conceder papéis de editor ou visualizador a outros participantes, e é o único responsável pela adequação dos convites emitidos e pela gestão dos membros da sua viagem.',
        ],
    },
    {
        title: '8. Propriedade intelectual',
        body: [
            'O código, design, marca e demais elementos do Serviço são de propriedade do TripPlanner e não podem ser copiados, reproduzidos ou utilizados para fins comerciais sem autorização prévia.',
        ],
    },
    {
        title: '9. Limitação de responsabilidade',
        body: [
            'Na máxima extensão permitida pela lei, o TripPlanner não será responsável por danos indiretos, incidentais, lucros cessantes ou perda de dados decorrentes do uso ou da impossibilidade de uso do Serviço, incluindo indisponibilidades, falhas técnicas ou perda de dados por causas fora de nosso controle razoável.',
        ],
    },
    {
        title: '10. Suspensão e encerramento',
        body: [
            'Reservamo-nos o direito de suspender ou excluir contas e viagens que violem estes termos, ou de descontinuar o Serviço, total ou parcialmente, a qualquer momento, mediante aviso razoável quando possível.',
            'Você pode solicitar a exclusão da sua conta e dos seus dados a qualquer momento pelo contato informado na Política de Privacidade.',
        ],
    },
    {
        title: '11. Alterações destes termos',
        body: [
            'Estes termos podem ser atualizados periodicamente. O uso continuado do Serviço após alterações implica aceitação da versão vigente.',
        ],
    },
    {
        title: '12. Legislação aplicável',
        body: [
            'Estes termos são regidos pelas leis da República Federativa do Brasil, sendo competente o foro do domicílio do usuário para dirimir eventuais controvérsias, salvo disposição legal em contrário.',
        ],
    },
];

export const PRIVACY_SECTIONS: LegalSection[] = [
    {
        title: '1. Quais dados coletamos',
        body: [
            'Dados de conta: nome, e-mail e foto de perfil fornecidos pelo Google no momento do login.',
            'Dados de uso: viagens criadas, datas, despesas, valores, categorias, participantes, roteiros/atividades e mensagens de acerto financeiro que você ou os demais membros inserirem.',
            'Não coletamos senhas — a autenticação é feita inteiramente pelo Google.',
        ],
    },
    {
        title: '2. Como usamos os dados',
        body: [
            'Usamos os dados exclusivamente para operar as funcionalidades do Serviço: exibir suas viagens, calcular divisão de despesas e saldos, converter moedas e permitir a colaboração entre os participantes convidados por você.',
            'Não vendemos, alugamos ou usamos seus dados para publicidade.',
        ],
    },
    {
        title: '3. Compartilhamento de dados',
        body: [
            'Seus dados de viagem são visíveis apenas para os participantes daquela viagem específica, conforme o papel (proprietário, editor ou visualizador) atribuído a cada um.',
            'Utilizamos infraestrutura do Google Cloud/Firebase para autenticação e armazenamento, e uma API externa de cotação de câmbio para exibir valores convertidos — nenhum dado pessoal identificável é compartilhado com o provedor de cotações.',
            'Não compartilhamos seus dados com terceiros para fins comerciais.',
        ],
    },
    {
        title: '4. Armazenamento e segurança',
        body: [
            'Os dados são armazenados no Firebase (Google Cloud), protegidos por regras de acesso que restringem a leitura e escrita apenas aos participantes de cada viagem.',
            'Adotamos medidas técnicas razoáveis de segurança, mas nenhum sistema é 100% livre de falhas; em caso de incidente relevante de segurança, você será notificado conforme exigido pela legislação aplicável.',
        ],
    },
    {
        title: '5. Retenção de dados',
        body: [
            'Mantemos seus dados enquanto sua conta e suas viagens estiverem ativas. Ao excluir uma viagem, seus dados associados (despesas, roteiro, acertos) são removidos permanentemente do banco de dados.',
        ],
    },
    {
        title: '6. Seus direitos (LGPD)',
        body: [
            'Nos termos da Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você tem direito a confirmar a existência de tratamento, acessar, corrigir, solicitar a exclusão, anonimização ou portabilidade dos seus dados pessoais.',
            'Para exercer qualquer desses direitos, entre em contato pelo e-mail informado abaixo. Responderemos dentro de um prazo razoável.',
        ],
    },
    {
        title: '7. Cookies e armazenamento local',
        body: [
            'Utilizamos armazenamento local do navegador apenas para manter sua sessão de login ativa (persistência de autenticação do Firebase). Não utilizamos cookies de rastreamento publicitário.',
        ],
    },
    {
        title: '8. Menores de idade',
        body: [
            'O Serviço não é direcionado a crianças menores de 13 anos. Caso identifiquemos dados coletados indevidamente de menores nessa faixa, eles serão excluídos.',
        ],
    },
    {
        title: '9. Alterações desta política',
        body: [
            'Esta política pode ser atualizada periodicamente para refletir mudanças no Serviço ou na legislação. A versão vigente estará sempre disponível nesta tela.',
        ],
    },
    {
        title: '10. Contato',
        body: [
            'Dúvidas, solicitações sobre seus dados pessoais ou exclusão de conta podem ser enviadas para fellipe.marra@sankhya.com.br.',
        ],
    },
];
